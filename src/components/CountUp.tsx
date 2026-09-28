"use client";

import { useContext, useEffect, useRef } from "react";
import { RevealContext } from "./Reveal";

const DURATION_MS = 1600;

/** Counts a stat like "2.5+" up from zero each time its section comes into view (keeps decimals and suffix). */
export default function CountUp({ value }: { value: string }) {
  const visible = useContext(RevealContext);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    const m = value.match(/^(\d+(?:\.\d+)?)(.*)$/);
    if (!el || !m) return;
    const target = parseFloat(m[1]);
    const decimals = (m[1].split(".")[1] ?? "").length;
    const show = (n: number) => {
      el.textContent = n.toFixed(decimals) + m[2];
    };
    if (!visible) {
      show(0);
      return;
    }
    // timers rather than rAF, and time-based, so a throttled background tab still lands on the exact value
    const t0 = performance.now() + 250;
    let id = 0;
    const step = () => {
      const t = Math.min(Math.max((performance.now() - t0) / DURATION_MS, 0), 1);
      show(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) id = window.setTimeout(step, 16);
    };
    id = window.setTimeout(step, 250);
    return () => window.clearTimeout(id);
  }, [visible, value]);

  return <span ref={ref}>{value}</span>;
}
