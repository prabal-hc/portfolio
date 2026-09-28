"use client";

import { useRef } from "react";

/** Pulls its child toward the mouse while hovered, then springs back on leave. Mouse only; touch is untouched. */
export default function Magnetic({
  children,
  strength = 0.35,
  className = "",
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - (r.left + r.width / 2)) * strength;
    const y = (e.clientY - (r.top + r.height / 2)) * strength;
    el.style.transition = "transform 0.25s var(--ease-out)";
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 0.8s var(--ease-back)";
    el.style.transform = "";
  };

  return (
    <span ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`inline-block max-w-full ${className}`}>
      {children}
    </span>
  );
}
