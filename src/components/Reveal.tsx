"use client";

import { useEffect, useRef, useState } from "react";

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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.intersectionRatio > 0.25), {
      threshold: [0, 0.25, 1],
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} data-side={side} data-in={visible} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
