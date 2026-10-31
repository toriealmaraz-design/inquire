'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Phone, PhoneCall, PhoneOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Role = 'client' | 'agent'
type Status = 'idle' | 'calling' | 'incoming' | 'connecting' | 'connected'
type Signal =
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit; from: Role }
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

/**
 * In-browser WebRTC audio call (WhatsApp-style) over a Supabase broadcast channel.
 * Both peers mount this with the same conversationId; one calls, the other gets a ringing banner.
 */
export function WebCall({ conversationId, role, peerLabel = 'the other person' }: { conversationId: number | null; role: Role; peerLabel?: string }) {
  const [status, setStatus] = useState<Status>('idle')
  const [muted, setMuted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState('')

  const supabaseRef = useRef(createClient())
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null)
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null)
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const send = useCallback((signal: Signal) => {
    channelRef.current?.send({ type: 'broadcast', event: 'signal', payload: signal })
  }, [])

  const cleanup = useCallback(() => {
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
    setSeconds(0)
  }, [])

  const buildPeer = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    localStreamRef.current = stream
    const pc = new RTCPeerConnection(RTC_CONFIG)
    stream.getTracks().forEach((t) => pc.addTrack(t, stream))
    pc.onicecandidate = (e) => { if (e.candidate) send({ kind: 'ice', candidate: e.candidate.toJSON(), from: role }) }
    pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0] }
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      if (st === 'connected') {
        setStatus('connected')
        if (!timerRef.current) timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      } else if (st === 'failed' || st === 'disconnected' || st === 'closed') {
        cleanup()
      }
    }
    pcRef.current = pc
    return pc
  }, [role, send, cleanup])

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
          pendingOfferRef.current = payload.sdp
          setStatus('incoming')
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

  const startCall = async () => {
    setError('')
    if (!navigator.mediaDevices?.getUserMedia) return setError('Calling is not supported on this device.')
    try {
      setStatus('calling')
      const pc = await buildPeer()
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send({ kind: 'offer', sdp: offer, from: role })
    } catch (e) {
      cleanup()
      setError(e instanceof Error ? e.message : 'Could not start the call. Allow microphone access.')
    }
  }

  const accept = async () => {
    setError('')
    const offer = pendingOfferRef.current
    if (!offer) return
    try {
      setStatus('connecting')
      const pc = await buildPeer()
      await pc.setRemoteDescription(offer)
      await drainIce()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send({ kind: 'answer', sdp: answer, from: role })
    } catch (e) {
      cleanup()
      setError(e instanceof Error ? e.message : 'Could not answer. Allow microphone access.')
    }
  }

  const decline = () => { send({ kind: 'decline', from: role }); cleanup() }
  const hangup = () => { send({ kind: 'hangup', from: role }); cleanup() }
  const toggleMute = () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    if (track) { track.enabled = !track.enabled; setMuted(!track.enabled) }
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const disabled = !conversationId

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay className="hidden" />

      {/* Call trigger button (shown when idle) */}
      {status === 'idle' && (
        <button
          onClick={startCall}
          disabled={disabled}
          aria-label="Start voice call"
          title={disabled ? 'Start a conversation first' : 'Call'}
          className="flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-300/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-300/25 disabled:opacity-40"
        >
          <PhoneCall className="size-3.5" /> Call
        </button>
      )}

      {/* In-call / ringing overlay */}
      {status !== 'idle' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-3xl border border-white/15 bg-[#0b1a28] p-6 text-center text-white shadow-2xl">
            <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${status === 'connected' ? 'bg-emerald-400/20 text-emerald-300' : 'bg-cyan-400/20 text-cyan-300'} ${status === 'calling' || status === 'incoming' ? 'animate-pulse' : ''}`}>
              <Phone className="size-7" />
            </div>
            <p className="mt-4 text-sm font-semibold">
              {status === 'calling' ? `Calling ${peerLabel}…` : status === 'incoming' ? `Incoming call from ${peerLabel}` : status === 'connecting' ? 'Connecting…' : 'In call'}
            </p>
            {status === 'connected' && <p className="mt-1 text-xs tabular-nums text-slate-400">{mmss}</p>}
            {error && <p className="mt-2 text-xs text-rose-300">{error}</p>}

            <div className="mt-6 flex items-center justify-center gap-3">
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
