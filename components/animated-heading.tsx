'use client'

import { createElement, useSyncExternalStore, type HTMLAttributes, type ReactNode } from 'react'
import TextEngine from 'spring-text-engine'

type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
type AnimatedHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as: HeadingTag
  children: ReactNode
}

const motionPreference = '(prefers-reduced-motion: reduce)'

function subscribeToMotionPreference(onChange: () => void) {
  const query = window.matchMedia(motionPreference)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

function getReducedMotionPreference() {
  return window.matchMedia(motionPreference).matches
}

export function AnimatedHeading({ as, className = '', children, ...props }: AnimatedHeadingProps) {
  const reduceMotion = useSyncExternalStore(subscribeToMotionPreference, getReducedMotionPreference, () => true)
  const headingClassName = `${className} justify-center`.trim()

  if (reduceMotion) {
    return createElement(as, { ...props, className: headingClassName }, children)
  }

  return (
    <TextEngine
      {...props}
      tag={as}
      mode="once"
      overflow
      letterOut={{ opacity: 0, y: 24 }}
      letterIn={{ opacity: 1, y: 0 }}
      letterConfig={{ tension: 220, friction: 22 }}
      letterStagger={30}
      className={headingClassName}
    >
      {children}
    </TextEngine>
  )
}
