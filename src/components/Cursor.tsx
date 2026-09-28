"use client";

import { useEffect, useRef } from "react";

/**
 * Desktop (fine pointer) only, and the native cursor stays:
 *  – a trailing ring that grows over links and turns into a "Drag" puck over the sliders (`data-cursor="drag"`)
 *  – a faint warm "headlight" glow that drifts after the pointer across the scene, behind the text
 */
export default function Cursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ring = ringRef.current;
    const glow = glowRef.current;
    if (!ring || !glow || !window.matchMedia("(pointer: fine)").matches) return;

    const p = { x: 0, y: 0 };
    const r = { x: 0, y: 0 };
    const g = { x: 0, y: 0 };
    let active = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (!active) {
        active = true;
        r.x = g.x = p.x;
        r.y = g.y = p.y;
        ring.style.opacity = "1";
        glow.style.opacity = "1";
      }
      const hit = (e.target as Element | null)?.closest?.("a, button, [data-cursor]");
      ring.dataset.mode = hit ? (hit.getAttribute("data-cursor") ?? "link") : "";
    };
    const onLeave = () => {
      active = false;
      ring.style.opacity = "0";
      glow.style.opacity = "0";
    };

    const tick = () => {
      r.x += (p.x - r.x) * 0.22;
      r.y += (p.y - r.y) * 0.22;
      g.x += (p.x - g.x) * 0.07;
      g.y += (p.y - g.y) * 0.07;
      ring.style.transform = `translate3d(${r.x}px, ${r.y}px, 0) translate(-50%, -50%)`;
      glow.style.transform = `translate3d(${g.x}px, ${g.y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden
        className="cursor-glow pointer-events-none fixed left-0 top-0 z-[1] h-[560px] w-[560px] rounded-full opacity-0"
      />
      <div
        ref={ringRef}
        aria-hidden
        className="cursor-ring pointer-events-none fixed left-0 top-0 z-[90] flex items-center justify-center rounded-full opacity-0"
      >
        <span>Drag</span>
      </div>
    </>
  );
}
