"use client";

import { useEffect, useRef, useState } from "react";
import { scroll } from "@/lib/scroll";
import FuelGauge, { type FuelGaugeHandle } from "./FuelGauge";

/**
 * Full-screen loader shown until everything is ready: web fonts, the page itself, and the 3D bike viewer
 * (which announces itself with a "scene-ready" event, see src/lib/loading.ts). It's a fuel gauge: the needle
 * sweeps from E (empty) to F (full) as loading progresses, then the screen lifts away. A safety timeout dismisses it
 * even if the viewer never reports in, so a slow or blocked network can't trap a visitor.
 *
 * While it is up: page scroll is locked and section content is held back (`html[data-loading]` in globals.css), so
 * the hero animates in as the loader leaves.
 */

const GIVE_UP_AFTER_S = 45;

const STATUS = [
  [0.0, "Running on fumes"],
  [0.25, "Fuelling up"],
  [0.55, "Filling the tank"],
  [0.85, "Almost full"],
  [1.0, "Full tank. Let's ride"],
] as const;

export default function Loader() {
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);
  const gaugeRef = useRef<FuelGaugeHandle>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const msgRef = useRef<HTMLParagraphElement>(null);

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
      gaugeRef.current?.set(p);
      if (numRef.current) numRef.current.textContent = String(Math.round(p * 100)).padStart(2, "0");
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

      <FuelGauge ref={gaugeRef} className="relative w-[clamp(250px,56vmin,480px)]" />

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
