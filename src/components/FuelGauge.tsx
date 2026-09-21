"use client";

import { forwardRef, useId, useImperativeHandle, useRef } from "react";

/**
 * The fuel gauge: a half-circle dial with a red E on the left, an orange F on the right, a needle that sweeps from E to F,
 * a red-to-amber fuel bar, and ticks that light up as the needle passes. Used by the loader and by the scroll indicator
 * on the right side of the page, so both are always the same design.
 *
 * It is driven imperatively (`ref.current.set(0..1)`) so it can be updated every animation frame without re-rendering.
 */

// The dial is the top half of a circle: from the left (E) over the top to the right (F).
const CX = 100;
const CY = 100;
const R = 80;
const ARC_LEN = Math.PI * R;
const TICKS = 21;

// Rounded on purpose: Node and the browser can disagree in the last digits of Math.cos/Math.sin, and that difference
// in the server-rendered vs client-rendered SVG attributes is a React hydration error.
const round2 = (n: number) => Math.round(n * 100) / 100;
const pt = (angle: number, r: number) => [round2(CX + Math.cos(angle) * r), round2(CY + Math.sin(angle) * r)] as const;
const tickAngle = (i: number) => Math.PI + (Math.PI * i) / (TICKS - 1); // π (left) → 2π (right), over the top

export interface FuelGaugeHandle {
  /** 0 = empty, 1 = full */
  set(level: number): void;
}

const FuelGauge = forwardRef<FuelGaugeHandle, { className?: string }>(function FuelGauge({ className = "" }, ref) {
  const gradId = "fuel" + useId().replace(/[^a-zA-Z0-9]/g, ""); // unique per instance (the loader and the side gauge coexist)
  const arcRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const emptyRef = useRef<SVGTextElement>(null);
  const pumpRef = useRef<SVGGElement>(null);
  const tickRefs = useRef<(SVGLineElement | null)[]>([]);

  useImperativeHandle(ref, () => ({
    set(p: number) {
      const level = Math.min(Math.max(p, 0), 1);
      if (arcRef.current) arcRef.current.style.strokeDasharray = `${(ARC_LEN * level).toFixed(2)} 999`;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${(-90 + 180 * level).toFixed(2)}deg)`;
      // ticks light up as the needle passes them
      tickRefs.current.forEach((t, i) => {
        if (t) t.style.opacity = i / (TICKS - 1) <= level + 0.001 ? "1" : "0.28";
      });
      // low-fuel warning: the E blinks red while the tank is nearly empty
      emptyRef.current?.classList.toggle("animate-pulse", level < 0.12);
      // the pump icon warms up as the tank fills
      if (pumpRef.current) pumpRef.current.style.color = level > 0.97 ? "var(--accent)" : "";
    },
  }));

  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <svg viewBox="0 0 200 138" className={`block h-auto overflow-visible ${className}`} aria-hidden>
      <defs>
        {/* red at Empty, through orange, to amber at Full */}
        <linearGradient id={gradId} x1="20" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ff3d2e" />
          <stop offset="0.4" stopColor="#ff6a1a" />
          <stop offset="1" stopColor="#ffb347" />
        </linearGradient>
      </defs>

      {/* tick marks along the dial; the first two are the red low-fuel zone */}
      {Array.from({ length: TICKS }, (_, i) => {
        const a = tickAngle(i);
        const major = i % 5 === 0;
        const [x1, y1] = pt(a, 91);
        const [x2, y2] = pt(a, major ? 102 : 97);
        return (
          <line
            key={i}
            ref={(el) => {
              tickRefs.current[i] = el;
            }}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth={major ? 1.6 : 0.9}
            strokeLinecap="round"
            stroke={i < 2 ? "#ff3d2e" : "currentColor"}
            className={i < 2 ? "" : "text-fg/70"}
            style={{ opacity: 0.28, transition: "opacity 0.2s" }}
          />
        );
      })}

      {/* track + fuel level */}
      <path d={arcPath} fill="none" stroke="var(--line)" strokeWidth="4" strokeLinecap="round" />
      <path
        ref={arcRef}
        d={arcPath}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0 999"
        style={{ filter: "drop-shadow(0 0 5px rgba(255,106,26,0.65))" }}
      />

      {/* E and F */}
      <text ref={emptyRef} x={CX - R} y={CY + 22} textAnchor="middle" fontSize="15" fontWeight="700" fill="#ff3d2e" className="font-display">
        E
      </text>
      <text x={CX + R} y={CY + 22} textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--accent)" className="font-display">
        F
      </text>

      {/* fuel pump icon (below the hub, on the E/F row, so the needle never sweeps across it) */}
      <g ref={pumpRef} className="text-fg/55" style={{ transition: "color 0.4s" }} transform="translate(100 122) scale(0.75)">
        <rect x="-9" y="-13" width="14" height="24" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <rect x="-6" y="-9.5" width="8" height="7" rx="1" fill="currentColor" opacity="0.55" />
        <path d="M5 -6 h3.5 a2.5 2.5 0 0 1 2.5 2.5 v9.5 a1.8 1.8 0 0 0 3.6 0 v-11 l-3.4 -3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="-11.5" y1="11" x2="7.5" y2="11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      {/* needle, sweeping from E (left) to F (right) */}
      <g ref={needleRef} style={{ transformOrigin: `${CX}px ${CY}px`, transform: "rotate(-90deg)" }}>
        <line x1={CX} y1={CY} x2={CX} y2={CY - 70} stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <circle cx={CX} cy={CY} r="6" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.2" />
    </svg>
  );
});

export default FuelGauge;
