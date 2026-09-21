import type Lenis from "lenis";
import { isSideLayout, STACKED_TEXT_TOP } from "./layout";

/** Shared, mutable scroll state. Read from the render loop, never from React state. */
export const scroll: { progress: number; lenis: Lenis | null } = {
  progress: 0,
  lenis: null,
};

export const SECTION_COUNT = 6;

const sections = () => Array.from(document.querySelectorAll<HTMLElement>("main > section"));

/**
 * The scroll position at which each section's camera pose is fully reached.
 *  side layout    – when the section's text block is centred in the viewport
 *  stacked layout – when the text block's top reaches STACKED_TEXT_TOP of the viewport (bike above, text below)
 * The hero is always at the very top. Values are clamped to the scrollable range and kept increasing.
 */
function anchors(): number[] {
  const els = sections();
  const vh = window.innerHeight;
  const side = isSideLayout(window.innerWidth, vh);
  const max = Math.max(0, document.documentElement.scrollHeight - vh);
  const out = els.map((el, i) => {
    if (i === 0) return 0;
    const box = (el.querySelector<HTMLElement>(".reveal") ?? el).getBoundingClientRect();
    const top = box.top + window.scrollY;
    const raw = side ? top + box.height / 2 - vh / 2 : top - vh * STACKED_TEXT_TOP;
    return Math.min(Math.max(raw, 0), max);
  });
  for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1] + 1);
  return out;
}

/** Scroll progress (0..1) measured between the section anchors, so every camera pose lands on its section. */
export function progressFromScroll(scrollY: number): number {
  const a = anchors();
  if (a.length < 2) return 0;
  const last = a.length - 1;
  if (scrollY <= a[0]) return 0;
  if (scrollY >= a[last]) return 1;
  let i = 0;
  while (scrollY > a[i + 1]) i++;
  return (i + (scrollY - a[i]) / (a[i + 1] - a[i])) / last;
}

/** The scroll position that brings section `i` to its pose (used by the nav dots). */
export function scrollTargetFor(i: number): number {
  return anchors()[i] ?? 0;
}
