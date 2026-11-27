'use client'

import { useEffect, useState } from 'react'
import * as QRCode from 'qrcode'
import { Download, QrCode } from 'lucide-react'

const W = 1080
const H = 1620
const INK = '#09090B'
const MINT = '#00F5D4'
const CYAN = '#00F0FF'

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let value = text
  while (value.length > 4 && ctx.measureText(`${value}…`).width > maxWidth) value = value.slice(0, -1)
  return `${value}…`
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not draw the Quick Response code.'))
    image.src = src
  })
}

/** Draws the whole flyer on a canvas; the QR encodes the real ?ref=CODE link. */
async function buildPoster(link: string, code: string, name: string) {
  const qrData = await QRCode.toDataURL(link, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 700,
    color: { dark: INK, light: '#F2FFFB' },
  })
  const qr = await loadImage(qrData)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')

  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)
  const glow = ctx.createRadialGradient(W / 2, 700, 40, W / 2, 700, 820)
  glow.addColorStop(0, 'rgba(0,245,212,0.16)')
  glow.addColorStop(1, 'rgba(0,245,212,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = 'rgba(0,245,212,0.05)'
  ctx.lineWidth = 2
  for (let x = 0; x <= W; x += 90) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  ctx.strokeStyle = MINT
  ctx.globalAlpha = 0.5
  ctx.lineWidth = 3
  roundedRect(ctx, 28, 28, W - 56, H - 56, 30)
  ctx.stroke()
  ctx.globalAlpha = 1

  // GN emblem + wordmark
  roundedRect(ctx, 76, 82, 104, 104, 26)
  ctx.fillStyle = 'rgba(0,245,212,0.1)'
  ctx.fill()
  ctx.strokeStyle = MINT
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.font = 'bold 52px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = MINT
  ctx.textAlign = 'center'
  ctx.fillText('GN', 128, 150)
  ctx.textAlign = 'left'
  ctx.font = 'bold 34px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('GEMINI NEXUS', 208, 130)
  ctx.font = '18px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = '#7FD8CC'
  ctx.fillText('DIGITAL OPERATIONS NETWORK', 209, 163)

  ctx.font = 'bold 22px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = MINT
  ctx.fillText(`SHARED BY ${fitText(ctx, (name || 'a Gemini Nexus agent').toUpperCase(), 880)}`, 76, 292)
  ctx.font = 'bold 82px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('Earn with', 76, 392)
  ctx.fillStyle = MINT
  ctx.fillText('Gemini Nexus', 76, 482)
  ctx.font = '28px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = '#A9B8C0'
  ctx.fillText('Scan the code to send me a brief. I earn a', 76, 546)
  ctx.fillText('commission when your job is paid.', 76, 584)

  // QR plate: light on dark keeps the code scannable
  roundedRect(ctx, 120, 620, 840, 780, 40)
  ctx.fillStyle = MINT
  ctx.fill()
  roundedRect(ctx, 156, 650, 768, 720, 24)
  ctx.fillStyle = '#F2FFFB'
  ctx.fill()
  ctx.drawImage(qr, 190, 660, 700, 700)

  roundedRect(ctx, 76, 1432, 928, 92, 22)
  ctx.fillStyle = 'rgba(0,240,255,0.08)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(0,245,212,0.35)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.font = 'bold 30px ui-monospace, monospace'
  ctx.fillStyle = CYAN
  ctx.fillText(`REFERENCE ${code}`, 104, 1491)
  ctx.font = '22px ui-monospace, monospace'
  ctx.fillStyle = '#B9C7CE'
  ctx.fillText(fitText(ctx, link.replace(/^https?:\/\//, ''), 530), 370, 1490)

  ctx.font = '20px ui-sans-serif, system-ui, sans-serif'
  ctx.fillStyle = '#77878F'
  ctx.fillText('Fast quotes  ·  Secure files  ·  Ghana-wide support', 76, 1570)
  return canvas.toDataURL('image/png')
}

/** Client-side poster preview + PNG download for the dashboard. */
export function QrPosterButton({ link, code, name }: { link: string; code: string; name: string }) {
  const [poster, setPoster] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!link || !code) return
    let cancelled = false
    buildPoster(link, code, name)
      .then((url) => { if (!cancelled) { setPoster(url); setError('') } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not build the poster.') })
    return () => { cancelled = true }
  }, [link, code, name])

  const download = () => {
    if (!poster) return
    const anchor = document.createElement('a')
    anchor.href = poster
    anchor.download = `GN-referral-poster-${code}.png`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl border border-cyan-300/20 bg-[#0A0F1C]/70 p-3">
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={poster} alt="Referral poster preview" className="h-28 w-auto rounded-lg border border-white/10 object-top" />
      ) : (
        <div className="flex h-28 w-20 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-300/60"><QrCode className="size-6" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">Quick Response referral poster</p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">Scan-ready poster image (1080 × 1620) with your referral code {code}.</p>
        <button
          type="button"
          onClick={download}
          disabled={!poster}
          className="mt-2 flex h-9 items-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-3 text-xs font-bold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-50"
        >
          <Download className="size-3.5" /> Download poster
        </button>
        {error && <p role="alert" className="mt-2 text-[11px] text-rose-300">{error}</p>}
      </div>
    </div>
  )
}
