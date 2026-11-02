'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

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
      // Always alert admins about an incoming call (push), not just those already on the chat page.
      if (role === 'client' && conversationId) {
        fetch('/api/chat/call-alert', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ conversationId, callType: type }), keepalive: true }).catch(() => {})
      }
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

      {/* Full-screen call takeover (WhatsApp-style) — portaled to body so no blurred/transformed ancestor traps it */}
      {status !== 'idle' && mounted && createPortal(
        <div className="fixed inset-0 z-[90] flex flex-col overflow-hidden bg-gradient-to-b from-[#0b2a26] via-[#0b1a28] to-[#06121d] text-white">
          {/* Remote video fills the screen when connected video */}
          <video ref={remoteMediaRef} autoPlay playsInline className={videoStage ? 'absolute inset-0 size-full object-cover' : 'hidden'} />
          {videoStage && <div className="absolute inset-0 bg-black/20" />}
          {/* Local camera preview */}
          <video ref={localVideoRef} autoPlay playsInline muted className={videoStage ? 'absolute right-4 top-16 z-10 h-40 w-28 rounded-2xl border border-white/20 object-cover shadow-lg sm:h-52 sm:w-40' : 'hidden'} />

          {/* Top status */}
          <div className="relative z-10 flex flex-col items-center px-6 pt-[max(2.5rem,env(safe-area-inset-top))]">
            <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-emerald-300/80">{isVideo ? 'Video call' : 'Voice call'}</p>
            <p className="mt-3 text-2xl font-semibold">{peerLabel}</p>
            <p className="mt-1 text-sm text-slate-300">
              {status === 'calling' ? 'Ringing…' : status === 'incoming' ? 'Incoming call…' : status === 'connecting' ? 'Connecting…' : mmss}
            </p>
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}
          </div>

          {/* Center avatar (hidden during connected video) */}
          {!videoStage && (
            <div className="relative z-10 flex flex-1 items-center justify-center">
              <div className={`flex size-40 items-center justify-center rounded-full bg-white/10 text-5xl font-bold text-white ring-4 ring-white/10 ${status === 'calling' || status === 'incoming' ? 'animate-pulse' : ''}`}>
                {(peerLabel.trim()[0] || '?').toUpperCase()}
              </div>
            </div>
          )}
          {videoStage && <div className="flex-1" />}

          {/* Controls */}
          <div className="relative z-10 px-8 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6">
            {status === 'incoming' ? (
              <div className="mx-auto flex w-full max-w-sm items-end justify-center gap-16">
                <div className="flex flex-col items-center gap-2">
                  <button onClick={decline} className="flex size-16 items-center justify-center rounded-full bg-rose-500 shadow-lg hover:bg-rose-400" aria-label="Decline call"><PhoneOff className="size-7" /></button>
                  <span className="text-xs text-slate-300">Decline</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button onClick={accept} className="flex size-16 items-center justify-center rounded-full bg-emerald-500 shadow-lg hover:bg-emerald-400" aria-label="Accept call"><Phone className="size-7" /></button>
                  <span className="text-xs text-slate-300">Accept</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-md items-end justify-center gap-6 rounded-3xl bg-black/20 py-4 backdrop-blur-sm sm:gap-10">
                {status === 'connected' && (
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={toggleMute} className={`flex size-14 items-center justify-center rounded-full ${muted ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`} aria-label={muted ? 'Unmute' : 'Mute'}>
                      {muted ? <MicOff className="size-6" /> : <Mic className="size-6" />}
                    </button>
                    <span className="text-xs text-slate-300">{muted ? 'Unmute' : 'Mute'}</span>
                  </div>
                )}
                {status === 'connected' && isVideo && (
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={toggleCam} className={`flex size-14 items-center justify-center rounded-full ${camOff ? 'bg-white text-slate-900' : 'bg-white/10 hover:bg-white/20'}`} aria-label={camOff ? 'Turn camera on' : 'Turn camera off'}>
                      {camOff ? <VideoOff className="size-6" /> : <Video className="size-6" />}
                    </button>
                    <span className="text-xs text-slate-300">Camera</span>
                  </div>
                )}
                <div className="flex flex-col items-center gap-2">
                  <button onClick={hangup} className="flex size-16 items-center justify-center rounded-full bg-rose-500 shadow-lg hover:bg-rose-400" aria-label="End call"><PhoneOff className="size-7" /></button>
                  <span className="text-xs text-slate-300">End</span>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
