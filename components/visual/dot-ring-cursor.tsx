"use client";

import { useEffect, useState } from "react";

function watchMedia(query: MediaQueryList, onChange: () => void) {
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }
  query.addListener(onChange);
  return () => query.removeListener(onChange);
}

/**
 * Dot & Ring cursor — an additive overlay for fine-pointer desktops only.
 * The native cursor is never hidden and no element intercepts input.
 */
export function DotRingCursor() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(fine.matches && !reduced.matches);

    update();
    const offFine = watchMedia(fine, update);
    const offReduced = watchMedia(reduced, update);
    return () => {
      offFine();
      offReduced();
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const dot = document.createElement("div");
    const ring = document.createElement("div");
    const label = document.createElement("div");

    const shared: CSSStyleDeclaration["cssText"] =
      "position:fixed;left:0;top:0;pointer-events:none;will-change:transform;z-index:9999;";

    ring.setAttribute("aria-hidden", "true");
    dot.setAttribute("aria-hidden", "true");
    label.setAttribute("aria-hidden", "true");
    ring.style.cssText =
      shared +
      "width:36px;height:36px;box-sizing:border-box;border:1.5px solid #FFFFFF;border-radius:50%;background:transparent;transition:border-color 140ms ease;";
    dot.style.cssText =
      shared + "width:6px;height:6px;border:0;border-radius:50%;background:#FFFFFF;transition:background-color 140ms ease;";
    label.style.cssText =
      "position:fixed;left:0;top:0;pointer-events:none;will-change:transform;z-index:10000;" +
      "padding:3px 7px;border:1px solid rgba(0,240,255,0.3);border-radius:999px;" +
      "background:rgba(6,11,20,0.88);color:#a5f3fc;font:700 9px/1 ui-monospace,SFMono-Regular,monospace;" +
      "letter-spacing:.14em;opacity:0;transition:opacity 120ms ease;";

    // Ring first so the dot paints on top.
    document.body.append(ring, dot, label);

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let rx = x;
    let ry = y;
    let scale = 1;
    let overInteractive = false;
    let labelText = "";
    let raf = 0;

    const aim = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      const target = document.elementFromPoint(x, y) as HTMLElement | null;
      const interactive = target?.closest<HTMLElement>("a, button, input, textarea, select, [role='button']") ?? null;
      const explicit = target?.closest<HTMLElement>("[data-cursor-label]")?.getAttribute("data-cursor-label");
      if (explicit) labelText = explicit.toUpperCase();
      else if (interactive) {
        const tag = interactive.tagName;
        labelText = tag === "A" ? "GO" : tag === "BUTTON" || interactive.getAttribute("role") === "button" ? "ACT" : "TYPE";
      } else labelText = "";
      overInteractive = Boolean(interactive || explicit);
      const accent = labelText ? "#67e8f9" : "#FFFFFF";
      ring.style.borderColor = accent;
      dot.style.backgroundColor = accent;
      label.textContent = labelText;
      label.style.opacity = labelText ? "1" : "0";
    };
    const leave = () => {
      overInteractive = false;
      labelText = "";
      label.style.opacity = "0";
    };

    const tick = () => {
      rx += (x - rx) * 0.14;
      ry += (y - ry) * 0.14;
      scale += ((overInteractive ? (labelText ? 2.35 : 1.9) : 1) - scale) * 0.22;

      dot.style.transform = `translate3d(${x - 3}px, ${y - 3}px, 0)`;
      ring.style.transform = `translate3d(${rx - 18}px, ${ry - 18}px, 0) scale(${scale})`;
      label.style.transform = `translate3d(${x + 22}px, ${y + 18}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", aim, { passive: true });
    window.addEventListener("pointerdown", aim, { passive: true });
    document.addEventListener("pointerleave", leave);
    window.addEventListener("blur", leave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", aim);
      window.removeEventListener("pointerdown", aim);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("blur", leave);
      ring.remove();
      dot.remove();
      label.remove();
    };
  }, [enabled]);

  return null;
}

export default DotRingCursor;
