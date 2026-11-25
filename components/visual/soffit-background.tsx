'use client'

import { useEffect, useRef } from 'react'

const CONFIG = {
  bgColor: '#062334',
  colorA: '#2b7be8',
  colorB: '#2bc8e8',
  colorC: '#4fe0d8',
  colorD: '#7fe8a0',
  scale: 1,
  speed: 0.33,
  tilt: 1.87,
  rock: 0.12,
  horizon: 0.36,
  breathe: 0.29,
  spread: 0.41,
  curve: 3.32,
  direct: 0.97,
  bounce: 0.38,
  bounceCurve: 4.25,
  spillCentre: 0.3,
  spillWidth: 2.18,
  spillFloor: 0.26,
  amount: 0.2,
  warp: 2.58,
  warpScale: 0.78,
  flow: 0.475,
  roughness: 0.29,
  lacunarity: 1.99,
  motes: 0.074,
  moteScale: 7,
  ambient: 0.24,
  contrast: 2.45,
  midpoint: 0.57,
  sink: 0.24,
  glow: 0.38,
  grain: 0,
  grainAnim: 0,
  dither: 0.58,
  vignette: 0.21,
  steer: -0.13,
  lift: 0.11,
  sweep: 0.5,
  cursor: 1,
  parallax: 0.0137,
  maxDpr: 1,
} as const

const VERTEX_SHADER = `#version 300 es
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform float uScale;
uniform vec3 uBgColor, uColorA, uColorB, uColorC, uColorD;
uniform float uSpeed, uTilt, uRock, uHorizon, uBreathe, uSpread, uCurve, uDirect;
uniform float uBounce, uBounceCurve;
uniform float uSpillCentre, uSpillWidth, uSpillFloor;
uniform float uAmount, uWarp, uWarpScale, uFlow, uRoughness, uLacunarity, uMotes, uMoteScale;
uniform float uAmbient, uContrast, uMidpoint, uSink, uGlow;
uniform float uGrain, uGrainAnim, uDither, uVignette;
uniform float uSteer, uLift, uSweep, uParallax;
#define OCTAVES 4
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float snoise(vec2 p) {
  const float K1 = 0.366025404, K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
  vec3 n = h * h * h * h * vec3(dot(a, hash2(i)), dot(b, hash2(i + o)), dot(c, hash2(i + 1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p) {
  float v = 0.0, amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    v += amp * snoise(p);
    p *= uLacunarity;
    amp *= uRoughness;
  }
  return v;
}
vec3 ramp4(float t) {
  vec3 c = mix(uColorA, uColorB, smoothstep(0.00, 0.36, t));
  c = mix(c, uColorC, smoothstep(0.32, 0.70, t));
  c = mix(c, uColorD, smoothstep(0.66, 1.00, t));
  return c;
}
float triDither(vec2 fc) {
  float a = fract(sin(dot(fc, vec2(12.9898, 78.233))) * 43758.5453);
  float b = fract(sin(dot(fc + 17.0, vec2(12.9898, 78.233))) * 43758.5453);
  return (a + b - 1.0) / 255.0;
}
float houseGrain(vec2 fc) {
  uvec2 q = uvec2(fc) * uvec2(1597334677u, 3812015801u)
          + uint(floor(iTime * 24.0 * uGrainAnim)) * 2654435769u;
  uint n = q.x ^ q.y; n = n * 1664525u + 1013904223u; n ^= n >> 16u; n *= 2246822519u; n ^= n >> 13u;
  float a = float(n & 0xffffu) / 65535.0;
  n *= 3266489917u; n ^= n >> 16u;
  float b = float(n & 0xffffu) / 65535.0;
  return a + b - 1.0;
}
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * iResolution) / iResolution.y;
  uv *= uScale;
  vec2 iM = iMouse * uScale;
  float t = iTime * uSpeed;
  vec2 p = uv - iM * uParallax;
  float tilt = uTilt + sin(t * 0.13) * uRock + iM.x * uSteer;
  vec2 dir = vec2(cos(tilt), sin(tilt));
  float axis = dot(p, dir);
  float across = dot(p, vec2(-dir.y, dir.x));
  vec2 q = vec2(fbm(p * uWarpScale + vec2(0.0, t * uFlow)),
                fbm(p * uWarpScale + vec2(5.2, 1.3) - t * uFlow * 0.7));
  float air = fbm(p + uWarp * q + vec2(t * 0.12, -t * 0.09)) * 0.5 + 0.5;
  float horizon = uHorizon + sin(t * 0.09 + 2.1) * uBreathe - iM.y * uLift;
  float alt = clamp(0.5 + (axis - horizon) * uSpread + (air - 0.5) * uAmount, 0.0, 1.0);
  float ac = (across - uSpillCentre - iM.x * uSweep) / max(0.05, uSpillWidth);
  float spill = mix(uSpillFloor, 1.0, exp(-ac * ac));
  float direct = pow(alt, max(0.05, uCurve)) * uDirect * spill;
  float bounce = uBounce * pow(1.0 - alt, max(0.05, uBounceCurve));
  float f = uAmbient + direct + bounce;
  f += uMotes * snoise(p * uMoteScale + vec2(-t * 0.5, t * 0.35)) * 0.5 * alt;
  f = clamp((f - uMidpoint) * uContrast + 0.5, 0.0, 1.0);
  vec3 col = ramp4(f);
  col += uColorD * uGlow * pow(f, 4.0);
  col = mix(uBgColor, col, smoothstep(0.0, max(0.01, uSink), f) * 0.90 + 0.10);
  col *= 1.0 - uVignette * dot(uv, uv);
  float hgL = clamp(dot(col, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
  col += houseGrain(gl_FragCoord.xy) * uGrain * mix(1.0, 4.0 * hgL * (1.0 - hgL), 0.6);
  col += triDither(gl_FragCoord.xy) * uDither;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`

const colorKeys = new Set(['bgColor', 'colorA', 'colorB', 'colorC', 'colorD'])

function colorToVec3(hex: string) {
  const value = hex.replace('#', '')
  return [0, 2, 4].map((start) => Number.parseInt(value.slice(start, start + 2), 16) / 255)
}

export function SoffitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    })
    if (!canvas || !gl) return

    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Unable to create WebGL shader')
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader) || 'Unknown WebGL shader error'
        gl.deleteShader(shader)
        throw new Error(error)
      }
      return shader
    }

    let program: WebGLProgram | null = null
    try {
      program = gl.createProgram()
      if (!program) throw new Error('Unable to create WebGL program')
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX_SHADER))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Unable to link WebGL program')
    } catch (error) {
      console.error('[Nexus] Soffit shader setup failed:', error)
      return
    }

    gl.useProgram(program)
    gl.bindVertexArray(gl.createVertexArray())
    const uniformLocations = new Map<string, WebGLUniformLocation | null>()
    const uniform = (name: string) => {
      if (!uniformLocations.has(name)) uniformLocations.set(name, gl.getUniformLocation(program, name))
      return uniformLocations.get(name) ?? null
    }
    const uniform1f = (name: string, value: number) => gl.uniform1f(uniform(name), value)
    const uniform2f = (name: string, x: number, y: number) => gl.uniform2f(uniform(name), x, y)
    const uniform3f = (name: string, value: string) => gl.uniform3fv(uniform(name), colorToVec3(value))

    for (const [key, value] of Object.entries(CONFIG)) {
      if (key === 'cursor' || key === 'maxDpr') continue
      const name = `u${key[0].toUpperCase()}${key.slice(1)}`
      if (colorKeys.has(key)) uniform3f(name, value as string)
      else uniform1f(name, value as number)
    }

    let dpr = 1
    let width = 0
    let height = 0
    let resizeQueued = false
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDpr)
      width = Math.max(1, Math.round(window.innerWidth * dpr))
      height = Math.max(1, Math.round(window.innerHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
      gl.useProgram(program)
      uniform2f('iResolution', width, height)
    }
    const onResize = () => { resizeQueued = true }
    window.addEventListener('resize', onResize, { passive: true })

    const pointer = { x: 0, y: 0, leadX: 0, leadY: 0, targetX: 0, targetY: 0 }
    const aim = (event: PointerEvent) => {
      const aspect = window.innerWidth / window.innerHeight
      pointer.targetX = (event.clientX / window.innerWidth - 0.5) * aspect
      pointer.targetY = 0.5 - event.clientY / window.innerHeight
    }
    window.addEventListener('pointermove', aim, { passive: true })
    window.addEventListener('pointerdown', aim, { passive: true })

    let visible = true
    const observer = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true }, { threshold: 0 })
    observer.observe(canvas)
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let previousTime = performance.now()
    let clock = 0
    let frameId = 0

    const frame = (now: number) => {
      frameId = window.requestAnimationFrame(frame)
      if (resizeQueued) {
        resizeQueued = false
        resize()
      }
      if (!visible || document.hidden) {
        previousTime = now
        return
      }
      const raw = now - previousTime
      previousTime = now
      const ms = raw > 50 ? 50 : raw < 4.167 ? 4.167 : raw
      const step = ms > 36.7 ? 2.2 : ms * 0.06
      if (!reducedMotion.matches) {
        clock += ms * 0.001
        const lead = 0.105 * step
        const body = 0.043 * step
        pointer.leadX += (pointer.targetX - pointer.leadX) * lead
        pointer.leadY += (pointer.targetY - pointer.leadY) * lead
        pointer.x += (pointer.leadX - pointer.x) * body
        pointer.y += (pointer.leadY - pointer.y) * body
      }
      uniform1f('iTime', clock)
      uniform2f('iMouse', pointer.x, pointer.y)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    resize()
    uniform1f('iTime', 0)
    uniform2f('iMouse', 0, 0)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    frameId = window.requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', aim)
      window.removeEventListener('pointerdown', aim)
      observer.disconnect()
      if (program) gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={canvasRef} className="soffit-background" aria-hidden="true" />
}
