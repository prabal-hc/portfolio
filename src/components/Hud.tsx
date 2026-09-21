"use client";

import { useEffect, useRef } from "react";
import { scroll } from "@/lib/scroll";
import FuelBar, { type FuelBarHandle } from "./FuelBar";
import Speedometer, { type SpeedometerHandle } from "./Speedometer";

/** The speedometer reads 0 at the top of the page and stops at this many km/h at the very end (the dial itself goes to 160). */
const END_SPEED = 140;

/**
 * Fixed chrome.
 *  side layout    – on the right, an upright fuel indicator (full at the hero, draining as you scroll, empty at the end), and
 *                   bottom-left, a Hunter-style speedometer that tracks scroll progress.
 *  stacked layout – phones and portrait tablets: just a slim progress bar, so nothing collides with the text.
 */
export default function Hud() {
  const barRef = useRef<HTMLDivElement>(null);
  const fuelRef = useRef<FuelBarHandle>(null);
  const pctRef = useRef<HTMLSpanElement>(null);
  const speedoRef = useRef<SpeedometerHandle>(null);

  useEffect(() => {
    let raf = 0;
    let shown = 0;
    const tick = () => {
      shown += (scroll.progress - shown) * 0.12;
      speedoRef.current?.set(shown * END_SPEED);
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown.toFixed(4)})`;
      // fuel burns as you ride: full at the hero, draining as you scroll, nearly empty at the very end
      fuelRef.current?.set(1 - shown);
      if (pctRef.current) pctRef.current.textContent = String(Math.round((1 - shown) * 100)).padStart(2, "0");
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      {/* stacked layouts: progress bar along the top edge */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-40 h-[3px] bg-white/[0.06] side:hidden">
        <div ref={barRef} className="h-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
      </div>

      {/* side layouts: scroll progress as an upright fuel indicator on the right (full at the top of the page, empty at the end) */}
      <div
        role="img"
        aria-label="Scroll progress"
        // width + right offset here must fit inside the right margin set on <Section> in Sections.tsx
        className="pointer-events-none fixed right-[clamp(1rem,1.8vw,2.5rem)] top-1/2 z-30 hidden w-[clamp(44px,3vw,72px)] -translate-y-1/2 flex-col items-center gap-1 side:flex"
      >
        <FuelBar ref={fuelRef} initialLevel={1} className="w-[70%]" />
        <div className="flex items-baseline gap-0.5 font-display leading-none">
          <span ref={pctRef} className="text-[clamp(1.4rem,1.7vw,2.4rem)]">
            100
          </span>
          <span className="text-[clamp(0.7rem,0.8vw,1.1rem)] text-accent">%</span>
        </div>
      </div>

      {/* side layouts: the speedometer (hidden on very short windows, where it would run into the text) */}
      <div className="pointer-events-none fixed bottom-6 left-8 z-30 hidden flex-col items-center gap-1 side:flex side:bottom-8 side:left-[clamp(2rem,5vw,9rem)] [@media(max-height:640px)]:!hidden">
        <Speedometer ref={speedoRef} className="w-[clamp(118px,8vw,210px)]" />
        <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted">Scroll to ride</p>
      </div>
    </>
  );
}
