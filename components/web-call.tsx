'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff, MonitorUp, MonitorOff } from 'lucide-react'
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
export function WebCall({ conversationId, role, peerLabel = 'the other person', peerActive = true }: { conversationId: number | null; role: Role; peerLabel?: string; peerActive?: boolean }) {
  const [status, setStatus] = useState<Status>('idle')
  const [callType, setCallType] = useState<CallType>('audio')
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [peerPresent, setPeerPresent] = useState(false)
  const [screenSharing, setScreenSharing] = useState(false)
  const [remoteVideoLive, setRemoteVideoLive] = useState(false)
  useEffect(() => setMounted(true), [])

  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)
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
  const videoSenderRef = useRef<RTCRtpSender | null>(null)
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)

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
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    videoSenderRef.current = null
    cameraTrackRef.current = null
    pendingOfferRef.current = null
    pendingIceRef.current = []
    setStatus('idle')
    setMuted(false)
    setCamOff(false)
    setScreenSharing(false)
    setRemoteVideoLive(false)
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
    // Guarantee a reusable video send slot so screen-sharing works even on a voice call (no renegotiation).
    const camTrack = stream.getVideoTracks()[0] || null
    cameraTrackRef.current = camTrack
    if (camTrack) {
      videoSenderRef.current = pc.getSenders().find((s) => s.track === camTrack) || null
    } else {
      videoSenderRef.current = pc.addTransceiver('video', { direction: 'sendrecv' }).sender
    }
    pc.onicecandidate = (e) => { if (e.candidate) send({ kind: 'ice', candidate: e.candidate.toJSON(), from: role }) }
    pc.ontrack = (e) => {
      if (remoteMediaRef.current) remoteMediaRef.current.srcObject = e.streams[0]
      if (e.track.kind === 'video') {
        const t = e.track
        const sync = () => setRemoteVideoLive(t.readyState === 'live' && !t.muted)
        t.onunmute = sync
        t.onmute = sync
        t.onended = () => setRemoteVideoLive(false)
        sync()
      }
    }
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
  // Presence on this channel tells us whether the OTHER party is currently active in this chat —
  // calls are only allowed, and only ring, when both sides are present.
  useEffect(() => {
    if (!conversationId) { setPeerPresent(false); return }
    if (!supabaseRef.current) supabaseRef.current = createClient()
    const ch = supabaseRef.current.channel(`call-${conversationId}`, {
      config: { broadcast: { self: false }, presence: { key: role } },
    })
    channelRef.current = ch
    const syncPresence = () => {
      const state = ch.presenceState() as Record<string, unknown[]>
      // Any present member whose key is not our own role => the peer is here.
      setPeerPresent(Object.keys(state).some((k) => k !== role))
    }
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
    })
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .subscribe((s) => { if (s === 'SUBSCRIBED') ch.track({ role, at: Date.now() }) })
      return () => { supabaseRef.current?.removeChannel(ch); channelRef.current = null; setPeerPresent(false); cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, role])

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

  const stopScreen = useCallback(async () => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop())
    screenStreamRef.current = null
    // Restore the camera track (video call) or send nothing (voice call).
    await videoSenderRef.current?.replaceTrack(cameraTrackRef.current || null)
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current
    setScreenSharing(false)
  }, [])

  const toggleScreen = useCallback(async () => {
    if (screenSharing) return stopScreen()
    if (!videoSenderRef.current) return setError('Screen sharing is not available on this call.')
    const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (c?: DisplayMediaStreamOptions) => Promise<MediaStream> }
    if (!md.getDisplayMedia) return setError('Screen sharing is not supported on this device.')
    try {
      const display = await md.getDisplayMedia({ video: true, audio: false })
      const screenTrack = display.getVideoTracks()[0]
      if (!screenTrack) return
      screenStreamRef.current = display
      await videoSenderRef.current.replaceTrack(screenTrack)
      if (localVideoRef.current) localVideoRef.current.srcObject = display
      screenTrack.onended = () => { stopScreen() }
      setScreenSharing(true)
    } catch (e) {
      // User cancelled the picker, or permission denied — not a hard error.
      if (e instanceof Error && e.name !== 'NotAllowedError') setError(e.message)
    }
  }, [screenSharing, stopScreen])

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const disabled = !conversationId
  const peerLabelShort = role === 'client' ? 'an agent' : peerLabel
  const callReady = !disabled && peerActive && peerPresent
  const callBlockedReason = disabled ? 'Start a conversation first' : !callReady ? `Available when ${peerLabelShort} is active in this chat` : ''
  const isVideo = callType === 'video'
  const videoStage = status === 'connected' && (isVideo || screenSharing || remoteVideoLive)

  return (
    <>
      {/* Call trigger buttons (shown when idle). Calls only work while both parties are active in the chat. */}
      {status === 'idle' && (
        <div className="flex items-center gap-1.5">
          <button onClick={() => startCall('audio')} disabled={!callReady} aria-label="Voice call" title={callBlockedReason || 'Voice call'} className="flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-300/25 disabled:opacity-40">
            <Phone className="size-3.5" /> Call
          </button>
          <button onClick={() => startCall('video')} disabled={!callReady} aria-label="Video call" title={callBlockedReason || 'Video call'} className="flex size-8 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-300/15 text-cyan-200 hover:bg-cyan-300/25 disabled:opacity-40">
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
                {status === 'connected' && (
                  <div className="flex flex-col items-center gap-2">
                    <button onClick={toggleScreen} className={`flex size-14 items-center justify-center rounded-full ${screenSharing ? 'bg-cyan-300 text-slate-900' : 'bg-white/10 hover:bg-white/20'}`} aria-label={screenSharing ? 'Stop sharing screen' : 'Share screen'}>
                      {screenSharing ? <MonitorOff className="size-6" /> : <MonitorUp className="size-6" />}
                    </button>
                    <span className="text-xs text-slate-300">{screenSharing ? 'Stop share' : 'Share'}</span>
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
