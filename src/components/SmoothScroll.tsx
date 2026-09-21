"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { progressFromScroll, scroll } from "@/lib/scroll";

export default function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    scroll.lenis = lenis;

    const sync = () => {
      scroll.progress = progressFromScroll(lenis.scroll);
    };
    lenis.on("scroll", sync);
    window.addEventListener("resize", sync);
    sync();

    let raf = requestAnimationFrame(function loop(time) {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", sync);
      lenis.destroy();
      scroll.lenis = null;
    };
  }, []);

  return null;
}
