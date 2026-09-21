"use client";

import { useEffect, useRef, useState } from "react";
import { scroll } from "@/lib/scroll";

/**
 * Full-screen loader shown until everything is ready: web fonts, the page itself, and the 3D bike viewer
 * (which announces itself with a "scene-ready" event, see src/lib/loading.ts). It's a fuel gauge: the needle
 * sweeps from E (empty) to F (full) as loading progresses, then the screen lifts away. A safety timeout dismisses it
 * even if the viewer never reports in, so a slow or blocked network can't trap a visitor.
 *
 * While it is up: page scroll is locked and section content is held back (`html[data-loading]` in globals.css), so
 * the hero animates in as the loader leaves.
 */

// The dial is the top half of a circle: from the left (E) over the top to the right (F).
const CX = 100;
const CY = 100;
const R = 80;
const ARC_LEN = Math.PI * R;
const TICKS = 21;
const GIVE_UP_AFTER_S = 45;

const STATUS = [
  [0.0, "Running on fumes"],
  [0.25, "Fuelling up"],
  [0.55, "Filling the tank"],
  [0.85, "Almost full"],
  [1.0, "Full tank. Let's ride"],
] as const;

// Rounded on purpose: Node and the browser can disagree in the last digits of Math.cos/Math.sin, and that difference
// in the server-rendered vs client-rendered SVG attributes is a React hydration error.
const round2 = (n: number) => Math.round(n * 100) / 100;
const pt = (angle: number, r: number) => [round2(CX + Math.cos(angle) * r), round2(CY + Math.sin(angle) * r)] as const;
const tickAngle = (i: number) => Math.PI + (Math.PI * i) / (TICKS - 1); // π (left) → 2π (right), over the top

export default function Loader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const numRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGPathElement>(null);
  const needleRef = useRef<SVGGElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);
  const emptyRef = useRef<SVGTextElement>(null);
  const tickRefs = useRef<(SVGLineElement | null)[]>([]);
  const pumpRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    root.style.overflow = "hidden";

    let fonts = false;
    let loaded = document.readyState === "complete";
    let scene = Boolean(window.__sceneReady);
    document.fonts?.ready.then(() => {
      fonts = true;
    });
    const onLoad = () => {
      loaded = true;
    };
    const onScene = () => {
      scene = true;
    };
    window.addEventListener("load", onLoad);
    window.addEventListener("scene-ready", onScene);

    const t0 = performance.now();
    let shown = 0;
    let raf = 0;
    let finishing = false;

    const render = (p: number) => {
      if (numRef.current) numRef.current.textContent = String(Math.round(p * 100)).padStart(2, "0");
      if (arcRef.current) arcRef.current.style.strokeDasharray = `${(ARC_LEN * p).toFixed(2)} 999`;
      if (needleRef.current) needleRef.current.style.transform = `rotate(${(-90 + 180 * p).toFixed(2)}deg)`;
      // ticks light up as the needle passes them
      tickRefs.current.forEach((t, i) => {
        if (t) t.style.opacity = i / (TICKS - 1) <= p + 0.001 ? "1" : "0.28";
      });
      // low-fuel warning: the E blinks red while the tank is nearly empty
      emptyRef.current?.classList.toggle("animate-pulse", p < 0.12);
      // the pump icon warms up as the tank fills
      if (pumpRef.current) pumpRef.current.style.color = p > 0.97 ? "var(--accent)" : "";
      if (msgRef.current) {
        let text: string = STATUS[0][1];
        for (const [at, label] of STATUS) if (p >= at) text = label;
        if (msgRef.current.textContent !== text) msgRef.current.textContent = text;
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      scroll.lenis?.stop(); // smooth-scroll starts after us, so keep stopping it until we leave

      const elapsed = (now - t0) / 1000;
      const ready = scene || elapsed > GIVE_UP_AFTER_S;
      // Fonts and the page load are quick milestones; the viewer is the long wait, so between milestones the gauge
      // creeps up slowly (and never reaches Full until the viewer is really ready).
      const milestones = 0.04 + (fonts ? 0.1 : 0) + (loaded ? 0.16 : 0);
      const creep = (1 - Math.exp(-elapsed / 14)) * 0.6;
      const target = ready ? 1 : Math.min(milestones + creep, 0.93);
      shown += (target - shown) * (ready ? 0.14 : 0.05);
      render(shown);

      if (!finishing && shown > 0.996) {
        finishing = true;
        render(1);
        window.setTimeout(() => {
          cancelAnimationFrame(raf);
          setDone(true);
        }, 600); // a short beat on Full before lifting away
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("scene-ready", onScene);
      root.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!done) return;
    const root = document.documentElement;
    root.removeAttribute("data-loading"); // lets the hero animate in
    root.style.overflow = "";
    scroll.lenis?.start();
    const t = window.setTimeout(() => setGone(true), 1000);
    return () => window.clearTimeout(t);
  }, [done]);

  if (gone) return null;

  const arcPath = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

  return (
    <div
      id="loader"
      role="status"
      aria-live="polite"
      aria-label="Loading"
      aria-hidden={done}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.7,0,0.2,1)] ${
        done ? "pointer-events-none scale-[1.04] opacity-0" : "opacity-100"
      }`}
    >
      {/* warm glow, like the site backdrop */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 45% at 50% 52%, rgba(255,106,26,0.14), transparent 70%), radial-gradient(40% 40% at 85% 25%, rgba(96,152,255,0.10), transparent 70%)",
        }}
      />

      <div className="relative w-[clamp(250px,56vmin,480px)]">
        <svg viewBox="0 0 200 138" className="block h-auto w-full overflow-visible" aria-hidden>
          <defs>
            {/* red at Empty, through orange, to amber at Full */}
            <linearGradient id="fuelGrad" x1="20" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
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
            stroke="url(#fuelGrad)"
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

          {/* fuel pump icon */}
          {/* (below the hub, on the E/F row, so the needle never sweeps across it) */}
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
      </div>

      <div className="relative mt-[clamp(0.5rem,2vmin,1.5rem)] flex items-baseline gap-1 font-display leading-none">
        <span ref={numRef} className="text-[clamp(3rem,12vmin,6rem)] [-webkit-text-stroke:0.02em_currentColor]">
          00
        </span>
        <span className="text-[clamp(1.1rem,3.6vmin,2rem)] text-accent">%</span>
      </div>

      <p ref={msgRef} className="relative mt-4 font-mono text-[11px] uppercase tracking-[0.35em] text-muted sm:text-xs">
        Running on fumes
      </p>
      <p className="absolute bottom-[6svh] font-display text-xl uppercase tracking-[0.2em] text-fg/70 sm:text-2xl">
        Prabal Holla<span className="text-accent">.</span>
      </p>
    </div>
  );
}
