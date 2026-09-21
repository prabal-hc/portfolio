"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

/**
 * The bike's segmented fuel indicator, standing upright: a stack of bars that light up from E (bottom, red) to
 * F (top, amber), with the fuel-pump icon. Same look as the fuel gauge on the loader, and as the real dash, but vertical.
 *
 * Driven imperatively (`ref.current.set(0..1)`) so it can be updated every animation frame without re-rendering.
 */

const SEGMENTS = 12;
/** below this fuel level (the last ~12% of the page) the low-fuel warning blinks */
const LOW_FUEL = 0.12;
const BAR_W = 28;
const BAR_H = 10;
const PITCH = 12;
const X = 6;
const TOP = 52; // y of the top edge of the topmost bar
const BOTTOM = TOP + SEGMENTS * PITCH - (PITCH - BAR_H); // y of the bottom edge of the lowest bar

const RED = [255, 61, 46] as const;
const ORANGE = [255, 106, 26] as const;
const AMBER = [255, 179, 71] as const;
const mix = (a: readonly number[], b: readonly number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
/** red at the bottom (E), through orange, to amber at the top (F) */
const colourAt = (t: number) => {
  const c = t < 0.4 ? mix(RED, ORANGE, t / 0.4) : mix(ORANGE, AMBER, (t - 0.4) / 0.6);
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
};

export interface FuelBarHandle {
  /** 0 = empty, 1 = full */
  set(level: number): void;
}

const FuelBar = forwardRef<FuelBarHandle, { className?: string; initialLevel?: number }>(function FuelBar(
  { className = "", initialLevel = 0 },
  ref,
) {
  const bars = useRef<(SVGRectElement | null)[]>([]);
  const emptyRef = useRef<SVGTextElement>(null);
  const pumpRef = useRef<SVGGElement>(null);

  useImperativeHandle(ref, () => ({
    set(p: number) {
      const level = Math.min(Math.max(p, 0), 1);
      const filled = level * SEGMENTS;
      bars.current.forEach((b, i) => {
        if (!b) return;
        // whole bars light up fully; the one being filled glows in proportion
        const amount = Math.min(Math.max(filled - i, 0), 1);
        b.style.opacity = String(0.1 + 0.9 * amount);
        b.style.filter = amount > 0.5 ? "drop-shadow(0 0 3px rgba(255,106,26,0.7))" : "none";
      });
      // low-fuel warning, as on the real dash: near the end of the page the last (red) bar flashes on and off,
      // and the E blinks with it.
      const low = level < LOW_FUEL;
      const lastBar = bars.current[0];
      if (low && lastBar) {
        const on = Math.floor(performance.now() / 420) % 2 === 0;
        lastBar.style.opacity = on ? "1" : "0.12";
        lastBar.style.filter = on ? "drop-shadow(0 0 4px rgba(255,61,46,0.9))" : "none";
      }
      emptyRef.current?.classList.toggle("animate-pulse", low);
      // the pump warms up when the tank is full
      if (pumpRef.current) pumpRef.current.style.color = level > 0.97 ? "var(--accent)" : "";
    },
  }));

  return (
    <svg viewBox="0 0 40 240" className={`block h-auto overflow-visible ${className}`} aria-hidden>
      {/* fuel pump icon */}
      <g ref={pumpRef} className="text-fg/55" style={{ transition: "color 0.4s" }} transform="translate(20 16) scale(0.7)">
        <rect x="-9" y="-13" width="14" height="24" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="-6" y="-9.5" width="8" height="7" rx="1" fill="currentColor" opacity="0.55" />
        <path d="M5 -6 h3.5 a2.5 2.5 0 0 1 2.5 2.5 v9.5 a1.8 1.8 0 0 0 3.6 0 v-11 l-3.4 -3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="-11.5" y1="11" x2="7.5" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* F at the top */}
      <text x="20" y="46" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--accent)" className="font-display">
        F
      </text>

      {/* the bars: index 0 is the bottom one (E), the last is the top one (F) */}
      {Array.from({ length: SEGMENTS }, (_, i) => {
        // the starting look (before the first animation frame), so e.g. the hero shows a full tank on first paint
        const amount = Math.min(Math.max(initialLevel * SEGMENTS - i, 0), 1);
        return (
          <rect
            key={i}
            ref={(el) => {
              bars.current[i] = el;
            }}
            x={X}
            y={BOTTOM - BAR_H - i * PITCH}
            width={BAR_W}
            height={BAR_H}
            rx="2.4"
            fill={colourAt(i / (SEGMENTS - 1))}
            style={{
              opacity: 0.1 + 0.9 * amount,
              filter: amount > 0.5 ? "drop-shadow(0 0 3px rgba(255,106,26,0.7))" : "none",
              transition: "opacity 0.15s",
            }}
          />
        );
      })}

      {/* E at the bottom */}
      <text ref={emptyRef} x="20" y={BOTTOM + 17} textAnchor="middle" fontSize="13" fontWeight="700" fill="#ff3d2e" className="font-display">
        E
      </text>
    </svg>
  );
});

export default FuelBar;
