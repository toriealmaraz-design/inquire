'use client'

import { useEffect, useState } from 'react'

const POINTER_QUERY = '(hover: hover) and (pointer: fine)'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const BOX_SIZE = 16
const LINE_OPACITY = 0.3
const COLOR = '#FFFFFF'

export function CrosshairHud() {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    const pointerQuery = window.matchMedia(POINTER_QUERY)
    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)
    const update = () => setEnabled(pointerQuery.matches && !motionQuery.matches)
    update()
    pointerQuery.addEventListener('change', update)
    motionQuery.addEventListener('change', update)
    return () => {
      pointerQuery.removeEventListener('change', update)
      motionQuery.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    const canvas = document.createElement('canvas')
    canvas.setAttribute('aria-hidden', 'true')
    canvas.dataset.crosshairHud = 'true'
    Object.assign(canvas.style, {
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: '90',
    })
    document.body.appendChild(canvas)

    const context = canvas.getContext('2d')
    if (!context) {
      canvas.remove()
      return
    }

    const pointer = { x: 0, y: 0, active: false, interactive: false }
    let frameId = 0
    let needsResize = true
    let dpr = 1
    let width = 0
    let height = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      needsResize = false
    }

    const trackPointer = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
      pointer.active = true
      pointer.interactive = event.target instanceof Element && Boolean(event.target.closest('a, button, input'))
    }

    const clearPointer = () => {
      pointer.active = false
      pointer.interactive = false
    }

    const draw = () => {
      frameId = window.requestAnimationFrame(draw)
      if (needsResize || width !== window.innerWidth || height !== window.innerHeight) resize()
      context.clearRect(0, 0, width, height)
      if (!pointer.active) return

      const { x, y } = pointer
      context.lineWidth = 1
      context.strokeStyle = `rgba(255, 255, 255, ${LINE_OPACITY})`
      context.beginPath()
      context.moveTo(x + 0.5, 0)
      context.lineTo(x + 0.5, height)
      context.moveTo(0, y + 0.5)
      context.lineTo(width, y + 0.5)
      context.stroke()

      context.strokeStyle = pointer.interactive ? '#00F0FF' : COLOR
      context.strokeRect(Math.round(x - BOX_SIZE / 2) + 0.5, Math.round(y - BOX_SIZE / 2) + 0.5, BOX_SIZE, BOX_SIZE)

      const coordinates = `X ${Math.round(x).toString().padStart(4, '0')}   Y ${Math.round(y).toString().padStart(4, '0')}`
      context.font = '10px "Geist Mono", ui-monospace, monospace'
      context.textBaseline = 'middle'
      const labelWidth = context.measureText(coordinates).width + 16
      const labelX = x + labelWidth + 22 > width ? x - labelWidth - 22 : x + 22
      const labelY = y - 20 < 0 ? y + 24 : y - 20
      context.fillStyle = 'rgba(6, 11, 20, 0.82)'
      context.fillRect(labelX, labelY - 9, labelWidth, 18)
      context.fillStyle = COLOR
      context.fillText(coordinates, labelX + 8, labelY)
    }

    const handleResize = () => { needsResize = true }
    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('pointerdown', trackPointer, { passive: true })
    window.addEventListener('pointerleave', clearPointer, { passive: true })
    window.addEventListener('resize', handleResize, { passive: true })
    frameId = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('pointerdown', trackPointer)
      window.removeEventListener('pointerleave', clearPointer)
      window.removeEventListener('resize', handleResize)
      canvas.remove()
    }
  }, [enabled])

  return null
}
