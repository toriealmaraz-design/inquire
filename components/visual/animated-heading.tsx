"use client";

import { createElement, useSyncExternalStore, type HTMLAttributes, type ReactNode } from "react";
import TextEngine from "spring-text-engine";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type AnimatedHeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as: HeadingTag;
  children: ReactNode;
};

const motionQuery = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(motionQuery).matches;
}

/**
 * Rise & Settle — letters lift and spring into place, one after another.
 * All motion is driven by spring-text-engine / react-spring. Body copy stays static.
 * Reduced-motion users get the plain heading with the same semantics.
 */
export function AnimatedHeading({ as, className = "", children, ...props }: AnimatedHeadingProps) {
  const reduced = useSyncExternalStore(subscribe, getReducedMotion, () => true);
  const headingClassName = `justify-center ${className}`.trim();

  if (reduced) return createElement(as, { ...props, className: headingClassName }, children);

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
  );
}

export default AnimatedHeading;
