"use client";

import { useContext, useEffect, useRef } from "react";
import { RevealContext } from "./Reveal";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+<>";
const DURATION_MS = 850;
const NOISE = 0.2; // share of the time that's pure noise before letters start locking in, left to right

/** Mono label that shuffles through random glyphs and settles into its text each time its section comes into view. */
export default function Scramble({ text }: { text: string }) {
  const visible = useContext(RevealContext);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !visible) return;
    const chars = [...text];
    // time-based, so a throttled (backgrounded) tab still finishes on schedule instead of crawling
    const t0 = performance.now() + 180;
    let id = 0;
    const step = () => {
      const t = (performance.now() - t0) / DURATION_MS;
      if (t >= 1) {
        el.textContent = text;
        return;
      }
      const locked = Math.floor(Math.max(0, (t - NOISE) / (1 - NOISE)) * chars.length);
      el.textContent = chars
        .map((c, i) => (i < locked || c === " " || c === "—" ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
        .join("");
      id = window.setTimeout(step, 34);
    };
    id = window.setTimeout(step, 180);
    return () => {
      window.clearTimeout(id);
      el.textContent = text;
    };
  }, [visible, text]);

  return <span ref={ref}>{text}</span>;
}
