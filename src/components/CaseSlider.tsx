"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A one-at-a-time slider for Work and Journey: all slides sit in one horizontal strip, and moving between them
 * animates the whole strip's transform, so it reads as one continuous glide rather than a swap.
 *
 *  - Loops forever in either direction. A clone of the last slide is placed before the first, and a clone of the
 *    first is placed after the last; wrapping animates onto a clone (visually identical to the real slide) and then
 *    silently snaps back to the real position with no transition, so the loop never visibly jumps backward.
 *  - Auto-advances every few seconds, and pauses while you're hovering, dragging or have kept keyboard focus on it.
 *  - You can always move it yourself: drag/swipe (mouse, touch or pen, via the Pointer Events API) follows the
 *    pointer live and springs back or commits on release, and the arrow buttons and ← → keys work at any time.
 *
 * A giant ghost numeral behind the text ticks over on top, and a slim arrow + progress-bar nav sits below.
 * No boxed card — the bike stays visible around the text, same as elsewhere on the site.
 */
export interface SliderItem {
  key: string;
  eyebrow: string; // "01", or a date like "Jul 2026"
  title: string; // project name, or role
  meta?: string; // tag line, or company
  metaHref?: string; // link on the meta line (e.g. the company's site)
  detail: string; // blurb, or the achievement line
  href?: string; // "visit" link for the whole item (e.g. the live project)
  linkLabel?: string; // defaults to "Visit"
}

const pad = (n: number) => String(n).padStart(2, "0");
const EASE = "cubic-bezier(0.16,1,0.3,1)"; // the same "smooth deceleration" curve used by the section reveals
const TRANSITION_MS = 550; // must match the transform transition duration below
const AUTOPLAY_MS = 5500;

export default function CaseSlider({ items }: { items: SliderItem[] }) {
  const total = items.length;
  // clones at both ends for a seamless loop: [last, ...items, first]; trackPos 1..total are the real slides.
  const slides = [items[total - 1], ...items, items[0]];

  const [trackPos, setTrackPos] = useState(1);
  const [realIndex, setRealIndex] = useState(0);
  const [instant, setInstant] = useState(false); // true only for the one silent post-wrap snap (no transition)
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);

  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [clipHeight, setClipHeight] = useState<number>();
  const drag = useRef({ startX: 0, width: 0, wasDrag: false });
  const animating = useRef(false);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useLayoutEffect(() => {
    const measure = () => {
      const el = slideRefs.current[trackPos];
      if (el) setClipHeight(el.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure); // the active slide's own content can reflow (fonts, viewport width)
    if (slideRefs.current[trackPos]) ro.observe(slideRefs.current[trackPos]!);
    return () => ro.disconnect();
  }, [trackPos]);

  // The instant, transition-less snap (off a clone, back onto the real slide) needs exactly one paint with no
  // transition, then transitions resume. A timer, not the `transitionend` event: that event depends on the browser
  // actually rendering the transition, which a backgrounded/hidden tab can skip or throttle, and a visitor switching
  // tabs mid-slide should never be able to jam the carousel.
  useLayoutEffect(() => {
    if (!instant) return;
    const id = window.setTimeout(() => setInstant(false), 16);
    return () => window.clearTimeout(id);
  }, [instant]);

  const goNext = () => {
    if (animating.current) return;
    animating.current = true;
    setRealIndex((i) => (i + 1) % total);
    setTrackPos((p) => {
      const next = p + 1;
      window.setTimeout(() => {
        animating.current = false;
        if (next === total + 1) {
          setInstant(true);
          setTrackPos(1);
        }
      }, TRANSITION_MS);
      return next;
    });
  };
  const goPrev = () => {
    if (animating.current) return;
    animating.current = true;
    setRealIndex((i) => (i - 1 + total) % total);
    setTrackPos((p) => {
      const prev = p - 1;
      window.setTimeout(() => {
        animating.current = false;
        if (prev === 0) {
          setInstant(true);
          setTrackPos(total);
        }
      }, TRANSITION_MS);
      return prev;
    });
  };

  // auto-advance, paused while hovering, dragging, focused within, or for reduced-motion users
  useEffect(() => {
    if (paused || dragging || reducedMotion.current) return;
    const id = window.setInterval(() => {
      if (!document.hidden) goNext();
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goNext is stable in effect (only reads refs/total)
  }, [paused, dragging, realIndex]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (animating.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, width: e.currentTarget.getBoundingClientRect().width, wasDrag: false };
    setDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.wasDrag = true;
    setDragX(dx);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    const threshold = Math.max(48, drag.current.width * 0.16);
    setDragX(0);
    if (dragX < -threshold) goNext();
    else if (dragX > threshold) goPrev();
  };
  // a drag that actually moved shouldn't also fire the "Visit" link underneath the pointer on release
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.wasDrag) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.wasDrag = false;
    }
  };

  const offsetPercent = -trackPos * 100;

  return (
    <div
      role="group"
      aria-roledescription="slider"
      aria-label="Selected items"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div className="relative">
        {/* giant ghost numeral, a watermark that ticks over on top of the sliding strip */}
        <span
          key={realIndex}
          aria-hidden
          className="pointer-events-none absolute -left-1 -top-3 z-10 select-none font-display text-[clamp(4.5rem,20vw,7rem)] font-extrabold uppercase leading-none text-transparent [-webkit-text-stroke:1.5px_rgba(236,235,232,0.14)] [animation:numeral-in_0.35s_ease-out] side:-top-4 side:text-[clamp(5rem,7.5vw,9.5rem)]"
        >
          {pad(realIndex + 1)}
        </span>

        <div
          className="touch-pan-y overflow-hidden transition-[height] duration-300 ease-out"
          style={{ height: clipHeight }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") goNext();
            if (e.key === "ArrowLeft") goPrev();
          }}
          tabIndex={0}
        >
          <div
            className="flex select-none"
            style={{
              transform: `translateX(calc(${offsetPercent}% + ${dragX}px))`,
              transition: dragging || instant ? "none" : `transform 0.55s ${EASE}`,
            }}
          >
            {slides.map((item, i) => {
              const isActive = i === trackPos;
              return (
                <div
                  key={`${item.key}-${i}`}
                  ref={(el) => {
                    slideRefs.current[i] = el;
                  }}
                  className="w-full shrink-0 pt-8 side:pt-10"
                  aria-hidden={!isActive}
                  inert={!isActive}
                >
                  <p className="font-mono text-xs uppercase tracking-widest text-accent">{item.eyebrow}</p>
                  <h3 className="mt-1.5 font-display text-2xl font-bold uppercase leading-tight tracking-[-0.01em] sm:text-3xl side:text-[clamp(1.6rem,2vw,2.7rem)]">
                    {item.title}
                  </h3>
                  {item.meta && (
                    <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest text-muted side:text-[clamp(10px,0.7vw,13px)]">
                      {item.metaHref ? (
                        <a href={item.metaHref} target="_blank" rel="noreferrer" className="transition-colors hover:text-accent hover:underline">
                          {item.meta}
                        </a>
                      ) : (
                        item.meta
                      )}
                    </p>
                  )}
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-muted side:text-[clamp(14px,0.95vw,19px)]">{item.detail}</p>
                  {item.href && (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="group/link mt-4 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-fg transition-colors hover:text-accent"
                    >
                      {item.linkLabel ?? "Visit"}
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-[0.9em] w-[0.9em] transition-transform duration-300 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
                        aria-hidden
                      >
                        <path d="M6 14 14 6M14 6H8M14 6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* nav: prev/next arrows, a progress line, and a "02 / 04" counter */}
      <div className="mt-6 flex items-center gap-4 side:mt-8">
        <button
          onClick={goPrev}
          aria-label="Previous"
          className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line transition-colors hover:border-accent"
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 origin-left scale-x-0 bg-accent/15 transition-transform duration-300 group-hover:scale-x-100" />
          <svg viewBox="0 0 20 20" fill="none" className="relative h-4 w-4" aria-hidden>
            <path d="M12 15 7 10l5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="relative h-px flex-1 bg-line">
          <span
            className="absolute inset-y-0 left-0 bg-accent transition-[width] duration-300 ease-out"
            style={{ width: `${((realIndex + 1) / total) * 100}%` }}
          />
        </div>

        <button
          onClick={goNext}
          aria-label="Next"
          className="group relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line transition-colors hover:border-accent"
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 origin-right scale-x-0 bg-accent/15 transition-transform duration-300 group-hover:scale-x-100" />
          <svg viewBox="0 0 20 20" fill="none" className="relative h-4 w-4" aria-hidden>
            <path d="M8 15l5-5-5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <span className="shrink-0 font-mono text-[11px] tracking-widest text-muted">
          {pad(realIndex + 1)} / {pad(total)}
        </span>
      </div>
    </div>
  );
}
