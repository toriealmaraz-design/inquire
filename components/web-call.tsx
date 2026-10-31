'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Role = 'client' | 'agent'
type CallType = 'audio' | 'video'
type Status = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected'
type Signal =
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit; callType: CallType; from: Role }
  | { kind: 'answer'; sdp: RTCSessionDescriptionInit; from: Role }
  | { kind: 'ice'; candidate: RTCIceCandidateInit; from: Role }
  | { kind: 'hangup'; from: Role }
  | { kind: 'decline'; from: Role }

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// WebAudio ringtone (no asset needed): repeating two-tone ring cadence.
function createRinger() {
  let ctx: AudioContext | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  const beep = () => {
    if (!ctx) return
    const t = ctx.currentTime
    ;[480, 620].forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const start = t + i * 0.22
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(start)
      osc.stop(start + 0.22)
    })
  }
  return {
    start() {
      try {
        if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
        ctx.resume?.()
        beep()
        timer = setInterval(beep, 2400)
      } catch {}
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
      ctx?.close().catch(() => {})
      ctx = null
    },
  }
}

/**
 * In-browser WebRTC voice/video call (WhatsApp-style) over a Supabase broadcast channel.
 * Both peers mount this with the same conversationId; one calls, the other gets a ringing banner.
 */
export function WebCall({ conversationId, role, peerLabel = 'the other person' }: { conversationId: number | null; role: Role; peerLabel?: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const [callType, setCallType] = useState<CallType>('audio')
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteMediaRef = useRef<HTMLVideoElement | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const pendingOfferRef = useRef<{ sdp: RTCSessionDescriptionInit; callType: CallType } | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const ringerRef = useRef<ReturnType<typeof createRinger> | null>(null)
  if (!ringerRef.current) ringerRef.current = createRinger()

  const send = useCallback((signal: Signal) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: signal })
  }, [])

  const cleanup = useCallback(() => {
    ringerRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    pcRef.current?.getSenders().forEach((s) => s.track?.stop())
    pcRef.current?.close()
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    pendingOfferRef.current = null
    pendingIceRef.current = []
    setStatus('idle')
    setMuted(false)
    setCamOff(false)
    setSeconds(0)
  }, [])

  const attachLocal = useCallback(() => {
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current
  }, [])

  const buildPeer = useCallback(async (type: CallType) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' })
    localStreamRef.current = stream
    const pc = new RTCPeerConnection(RTC_CONFIG)
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    pc.onicecandidate = (e) => { if (e.candidate) send({ kind: 'ice', candidate: e.candidate.toJSON(), from: role }) }
    pc.ontrack = (e) => { if (remoteMediaRef.current) remoteMediaRef.current.srcObject = e.streams[0] }
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      if (st === 'connected') {
        ringerRef.current?.stop()
        setStatus('connected')
        if (!timerRef.current) timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      } else if (st === 'failed' || st === 'disconnected' || st === 'closed') {
        cleanup()
      }
    }
    pcRef.current = pc
    setTimeout(attachLocal, 0)
    return pc
  }, [role, send, cleanup, attachLocal])

  const drainIce = useCallback(async () => {
    const pc = pcRef.current
    if (!pc || !pc.remoteDescription) return
    for (const c of pendingIceRef.current.splice(0)) {
      try { await pc.addIceCandidate(c) } catch {}
    }
  }, [])

  // Subscribe to the call channel for this conversation (needed to receive incoming calls).
  useEffect(() => {
    if (!conversationId) return
    const ch = supabaseRef.current.channel(`call-${conversationId}`, { config: { broadcast: { self: false } } })
    channelRef.current = ch
    ch.on('broadcast', { event: 'signal' }, async ({ payload }: { payload: Signal }) => {
      const pc = pcRef.current
      try {
        if (payload.kind === 'offer') {
          pendingOfferRef.current = { sdp: payload.sdp, callType: payload.callType }
          setCallType(payload.callType)
          setStatus('incoming')
          ringerRef.current?.start()
        } else if (payload.kind === 'answer' && pc) {
          await pc.setRemoteDescription(payload.sdp)
          await drainIce()
          setStatus('connecting')
        } else if (payload.kind === 'ice') {
          pendingIceRef.current.push(payload.candidate)
          await drainIce()
        } else if (payload.kind === 'hangup' || payload.kind === 'decline') {
          cleanup()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Call error')
      }
    }).subscribe()
    return () => { supabaseRef.current.removeChannel(ch); channelRef.current = null; cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  const startCall = async (type: CallType) => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) return setError('Calling is not supported on this device.')
    try {
      setCallType(type)
      setStatus('calling')
      ringerRef.current?.start()
      const pc = await buildPeer(type)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send({ kind: 'offer', sdp: offer, callType: type, from: role })
    } catch (e) {
      cleanup()
      setError(e instanceof Error ? e.message : 'Could not start the call. Allow microphone/camera access.')
    }
  }

  const accept = async () => {
    setError('')
    const pending = pendingOfferRef.current
    if (!pending) return
    try {
      ringerRef.current?.stop()
      setStatus('connecting')
      const pc = await buildPeer(pending.callType)
      await pc.setRemoteDescription(pending.sdp)
      await drainIce()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send({ kind: 'answer', sdp: answer, from: role })
    } catch (e) {
      cleanup()
      setError(e instanceof Error ? e.message : 'Could not answer. Allow microphone/camera access.')
    }
  }

  const decline = () => { send({ kind: 'decline', from: role }); cleanup() }
  const hangup = () => { send({ kind: 'hangup', from: role }); cleanup() }
  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled) }
  }
  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0]
    if (track) { track.enabled = !track.enabled; setCamOff(!track.enabled) }
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const disabled = !conversationId
  const isVideo = callType === 'video'
  const videoStage = isVideo && status === 'connected'

  return (
    <>
      {/* Call trigger buttons (shown when idle) */}
      {status === 'idle' && (
        <div className="flex items-center gap-1.5">
          <button onClick={() => startCall('audio')} disabled={disabled} aria-label="Voice call" title={disabled ? 'Start a conversation first' : 'Voice call'} className="flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-300/25 disabled:opacity-40">
            <Phone className="size-3.5" /> Call
          </button>
          <button onClick={() => startCall('video')} disabled={disabled} aria-label="Video call" title={disabled ? 'Start a conversation first' : 'Video call'} className="flex size-8 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 text-cyan-200 hover:bg-cyan-300/25 disabled:opacity-40">
            <Video className="size-3.5" />
          </button>
        </div>
      )}

      {/* In-call / ringing overlay */}
      {status !== 'idle' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/15 bg-[#0b1a28] text-center text-white shadow-2xl">
            <div className={videoStage ? 'relative aspect-[3/4] bg-black sm:aspect-video' : 'relative py-8'}>
              <video ref={remoteMediaRef} autoPlay playsInline className={videoStage ? 'block size-full object-cover' : 'hidden'} />
              <video ref={localVideoRef} autoPlay playsInline muted className={videoStage ? 'absolute bottom-3 right-3 h-28 w-20 rounded-xl border border-white/20 object-cover' : 'hidden'} />

              {!videoStage && (
                <div className="px-6">
                  <div className={`mx-auto flex size-20 items-center justify-center rounded-full ${status === 'connected' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-cyan-400/20 text-cyan-300'} ${status === 'calling' || status === 'incoming' ? 'animate-pulse' : ''}`}>
                    {isVideo ? <Video className="size-9" /> : <Phone className="size-9" />}
                  </div>
                  <p className="mt-4 text-sm font-semibold">
                    {status === 'calling' ? `Calling ${peerLabel}…` : status === 'incoming' ? `Incoming ${isVideo ? 'video ' : ''}call from ${peerLabel}` : status === 'connecting' ? 'Connecting…' : 'In call'}
                  </p>
                  {status === 'connected' && <p className="mt-1 text-xs tabular-nums text-slate-400">{mmss}</p>}
                  {error && <p className="mt-2 px-4 text-xs text-rose-300">{error}</p>}
                </div>
              )}

              {videoStage && <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs tabular-nums">{mmss}</span>}
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-white/10 p-5">
              {status === 'incoming' ? (
                <>
                  <button onClick={accept} className="flex size-12 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-400" aria-label="Accept call"><Phone className="size-5" /></button>
                  <button onClick={decline} className="flex size-12 items-center justify-center rounded-full bg-rose-500 hover:bg-rose-400" aria-label="Decline call"><PhoneOff className="size-5" /></button>
                </>
              ) : (
                <>
                  {status === 'connected' && (
                    <button onClick={toggleMute} className={`flex size-12 items-center justify-center rounded-full ${muted ? 'bg-amber-500/80' : 'bg-white/10 hover:bg-white/20'}`} aria-label={muted ? 'Unmute' : 'Mute'}>
                      {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
                    </button>
                  )}
                  {status === 'connected' && isVideo && (
                    <button onClick={toggleCam} className={`flex size-12 items-center justify-center rounded-full ${camOff ? 'bg-amber-500/80' : 'bg-white/10 hover:bg-white/20'}`} aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}>
                      {camOff ? <VideoOff className="size-5" /> : <Video className="size-5" />}
                    </button>
                  )}
                  <button onClick={hangup} className="flex size-12 items-center justify-center rounded-full bg-rose-500 hover:bg-rose-400" aria-label="End call"><PhoneOff className="size-5" /></button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
