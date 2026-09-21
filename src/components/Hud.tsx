"use client";

import { useEffect, useRef } from "react";
import { scroll, scrollTargetFor, SECTION_COUNT } from "@/lib/scroll";

const LABELS = ["Start", "About", "Skills", "Work", "Journey", "Contact"];

/**
 * Fixed chrome. Side layout: section dots and a speedometer that tracks scroll progress.
 * Stacked layout (phones, portrait tablets): just a slim progress bar, so nothing collides with the text panels.
 */
export default function Hud() {
  const speedRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const CIRC = 2 * Math.PI * 34;
    const tick = () => {
      shown += (scroll.progress - shown) * 0.12;
      if (speedRef.current) speedRef.current.textContent = String(Math.round(shown * 180)).padStart(3, "0");
      if (arcRef.current) arcRef.current.style.strokeDashoffset = String(CIRC * (1 - shown * 0.75));
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown.toFixed(4)})`;
      const active = Math.round(shown * (SECTION_COUNT - 1));
      dotRefs.current.forEach((d, i) => d?.setAttribute("data-active", String(i === active)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const go = (i: number) => scroll.lenis?.scrollTo(scrollTargetFor(i), { duration: 1.6 });

  return (
    <>
      {/* stacked layouts: progress bar along the top edge */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px] bg-white/[0.06] side:hidden">
        <div ref={barRef} className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
      </div>

      <nav aria-label="Sections" className="fixed right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 md:flex side:right-4">
        {LABELS.map((label, i) => (
          <button
            key={label}
            ref={(el) => {
              dotRefs.current[i] = el;
            }}
            onClick={() => go(i)}
            aria-label={label}
            className="group flex items-center justify-end gap-3 p-1"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted opacity-0 transition-opacity group-hover:opacity-100">
              {label}
            </span>
            <span className="block h-2 w-2 rounded-full border border-fg/40 transition-all group-data-[active=true]:scale-125 group-data-[active=true]:border-accent group-data-[active=true]:bg-accent" />
          </button>
        ))}
      </nav>

      {/* side layouts: speedometer */}
      <div className="pointer-events-none fixed bottom-6 left-8 z-30 hidden items-center gap-3 side:flex side:bottom-8 side:left-[clamp(2rem,5vw,9rem)]">
        <svg viewBox="0 0 80 80" className="-rotate-[225deg] h-[clamp(64px,4.6vw,110px)] w-[clamp(64px,4.6vw,110px)]">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--line)" strokeWidth="2" strokeDasharray={`${2 * Math.PI * 34 * 0.75} 999`} />
          <circle
            ref={arcRef}
            cx="40"
            cy="40"
            r="34"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 34} 999`}
            strokeDashoffset={2 * Math.PI * 34}
          />
        </svg>
        <div className="font-mono leading-none">
          <span ref={speedRef} className="text-[clamp(1.5rem,1.6vw,2.4rem)]">000</span>
          <span className="ml-1 text-[10px] uppercase tracking-widest text-muted">km/h</span>
          <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-muted">Scroll to ride</div>
        </div>
      </div>
    </>
  );
}
