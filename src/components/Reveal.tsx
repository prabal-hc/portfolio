"use client";

import { createContext, useEffect, useRef, useState, useSyncExternalStore } from "react";

/** True while this <Reveal> is in view (and the loader has gone). Lets effects inside it (count-ups, scrambles) replay. */
export const RevealContext = createContext(false);

const subscribeLoading = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-loading"] });
  return () => mo.disconnect();
};
const isLoading = () => document.documentElement.hasAttribute("data-loading");

/** Slides its children up from below and in from `side`; replays each time it re-enters. */
export default function Reveal({
  side,
  className = "",
  children,
}: {
  side: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [intersecting, setIntersecting] = useState(false);
  const loading = useSyncExternalStore(subscribeLoading, isLoading, () => true);
  const visible = intersecting && !loading;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setIntersecting(entry.intersectionRatio > 0.25), {
      threshold: [0, 0.25, 1],
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-side={side} data-in={visible} className={`reveal ${className}`}>
      <RevealContext.Provider value={visible}>{children}</RevealContext.Provider>
    </div>
  );
}
