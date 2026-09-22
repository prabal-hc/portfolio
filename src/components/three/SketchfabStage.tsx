"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";
import { cameraAt, FOV } from "@/lib/cameraPath";
import { isSideLayout } from "@/lib/layout";
import { announceSceneReady } from "@/lib/loading";

/** Royal Enfield Hunter 350 – Dapper Grey by Bhavik Suthar (Sketchfab, embed enabled by the author). */
const MODEL_UID = "acb58ee62cfa4644af99caf4adbfdb5b";
const API_SRC = "https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js";

type Vec3 = [number, number, number];
interface SketchfabApi {
  start(): void;
  addEventListener(name: string, cb: () => void): void;
  setCameraLookAt(position: Vec3, target: Vec3, duration?: number): void;
  setFov(fov: number, cb?: () => void): void;
  setTextureQuality(quality: "ld" | "hd", cb?: () => void): void;
  setPostProcessing(options: Record<string, unknown>, cb?: () => void): void;
  setEnvironment(options: Record<string, unknown>, cb?: () => void): void;
  mouseDown(x: number, y: number): void;
  mouseMove(x: number, y: number): void;
  mouseUp(x: number, y: number): void;
}

/**
 * Soft-edged holes over the three corners where the viewer draws its own UI (model title, share icon, controls).
 * The corners only ever contain the dark vignette, never the bike. (The "click & hold" hint is handled by nudging the
 * viewer, not by masking: a mask over the bottom-centre darkens the bike whenever it sweeps past.)
 */
function cornerMask(narrow: boolean) {
  const hole = (shape: string, at: string) =>
    `radial-gradient(${shape} at ${at}, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 82%, #000 100%)`;
  // The viewer's own icons are a fixed pixel size, so on a narrow phone screen they take a much bigger share of it.
  return (
    narrow
      ? [
          hole("ellipse 78% 16%", "0% 0%"), // model title / author, top-left (two lines on a narrow phone)
          hole("ellipse 30% 12%", "100% 0%"), // share icon, top-right
          hole("ellipse 50% 11%", "100% 100%"), // viewer controls, bottom-right
        ]
      : [
          hole("ellipse 22% 12%", "0% 0%"),
          hole("ellipse 6% 8%", "100% 0%"),
          hole("ellipse 14% 8%", "100% 100%"),
        ]
  ).join(", ");
}

/**
 * Render the viewer at this multiple of its on-screen size, then scale it down (super-sampling = smoother edges).
 * Screens that are already dense (phones at 2–3× pixel ratio) don't need it, and it would be very heavy for them:
 * 1× pixel ratio → 1.5, 1.5× → 1.33, 2× and up → 1.
 */
function supersampleFor(dpr: number) {
  return Math.max(1, Math.min(1.5, 2 / dpr));
}

/** Sharper, richer render: full-res textures, ambient occlusion, a touch of bloom, brighter image-based light.
 * Same settings on every device, so the bike looks identical on phones and desktops; only genuinely low-memory
 * devices (reported by Chrome on Android) fall back to lower-res textures. */
function applyQuality(api: SketchfabApi) {
  const memoryGB = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  api.setTextureQuality(memoryGB < 4 ? "ld" : "hd");
  api.setPostProcessing({
    enable: true,
    taaEnable: false, // temporal AA smears while the camera is always moving; super-sampling covers edges
    sharpenEnable: true,
    sharpenFactor: 0.3,
    ssaoEnable: true,
    ssaoRadius: 0.18,
    ssaoIntensity: 1.1,
    ssaoBias: 0.006,
    bloomEnable: true,
    bloomFactor: 0.18,
    bloomThreshold: 0.92,
    bloomRadius: 0.6,
    toneMappingEnable: false, // filmic/default tone mapping crushes the bike to a silhouette on a dark set
    vignetteEnable: false, // we draw our own vignette
  });
  // Restrained exposure: soft highlights, shadows that hold shape, so the backdrop's warm/cool lights carry the mood.
  api.setEnvironment({
    enabled: true,
    exposure: 1.55,
    lightIntensity: 3.4,
    rotation: 4.537856055185257,
    shadowEnabled: true,
  });
}
interface SketchfabClient {
  init(uid: string, opts: Record<string, unknown>): void;
}
declare global {
  interface Window {
    Sketchfab?: new (iframe: HTMLIFrameElement) => SketchfabClient;
  }
}

/**
 * Bike space (y-up, +X forward) → this model's space (z-up, −Y forward, metres, ground at z = 0).
 * A proper rotation, so orbit direction and left/right shifts carry over unchanged.
 */
const TO_MODEL = new THREE.Matrix4().set(
  0, 0, -1, 0, //
  -1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 0, 1,
);

function loadApi() {
  return new Promise<void>((resolve, reject) => {
    if (window.Sketchfab) return resolve();
    const el = document.createElement("script");
    el.src = API_SRC;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Sketchfab API failed to load"));
    document.head.appendChild(el);
  });
}

export default function SketchfabStage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [supersample] = useState(() => supersampleFor(window.devicePixelRatio || 1)); // this component only renders in the browser
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    let raf = 0;
    let nudgeTimer = 0;
    const pointer = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);

    const start = (api: SketchfabApi) => {
      api.setFov(FOV);
      applyQuality(api);
      const pos = new THREE.Vector3();
      const target = new THREE.Vector3();
      const par = { x: 0, y: 0 };
      let smooth = 0;
      let last = 0;
      let lastKey = "";

      if (frame.current) {
        // each layer is opaque except one soft hole; "intersect" makes the holes add up
        const el = frame.current;
        const mask = cornerMask(window.innerWidth < 640);
        el.style.setProperty("mask-image", mask);
        el.style.setProperty("mask-composite", "intersect");
        el.style.setProperty("-webkit-mask-image", mask);
        el.style.setProperty("-webkit-mask-composite", "source-in");
      }

      // The hint appears while the viewer thinks nobody has touched it. Our camera is driven through the API, which
      // doesn't count, so give it a tiny synthetic drag now and then. The camera is re-sent right after.
      const nudge = () => {
        try {
          const x = 220;
          const y = 220;
          api.mouseDown(x, y);
          api.mouseMove(x + 2, y);
          api.mouseUp(x + 2, y);
        } catch {
          // best effort only; never let it stop the camera loop
        }
        lastKey = "";
      };
      nudge();
      nudgeTimer = window.setInterval(nudge, 6000);

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        const dt = Math.min((now - (last || now)) / 1000, 0.1);
        last = now;

        smooth = THREE.MathUtils.damp(smooth, scroll.progress, 6, dt);

        par.x = THREE.MathUtils.damp(par.x, pointer.x, 3, dt);
        par.y = THREE.MathUtils.damp(par.y, pointer.y, 3, dt);

        cameraAt(smooth, window.innerWidth / window.innerHeight, now / 1000, par, pos, target, isSideLayout(window.innerWidth, window.innerHeight));
        pos.applyMatrix4(TO_MODEL);
        target.applyMatrix4(TO_MODEL);

        // skip redundant postMessages while the camera is at rest
        const key = `${pos.x.toFixed(4)},${pos.y.toFixed(4)},${pos.z.toFixed(4)},${target.x.toFixed(4)},${target.y.toFixed(4)},${target.z.toFixed(4)}`;
        if (key === lastKey) return;
        lastKey = key;
        api.setCameraLookAt(pos.toArray(), target.toArray(), 0);
      };
      raf = requestAnimationFrame(tick);
    };

    loadApi()
      .then(() => {
        if (!alive || !frame.current || !window.Sketchfab) return;
        new window.Sketchfab(frame.current).init(MODEL_UID, {
          autostart: 1,
          preload: 1,
          dnt: 1,
          transparent: 1,
          camera: 0,
          ui_controls: 0,
          ui_infos: 0,
          ui_stop: 0,
          ui_inspector: 0,
          ui_ar: 0,
          ui_help: 0,
          ui_hint: 0,
          ui_settings: 0,
          ui_vr: 0,
          ui_fullscreen: 0,
          ui_annotations: 0,
          ui_animations: 0,
          scrollwheel: 0,
          double_click: 0,
          success: (api: SketchfabApi) => {
            api.start();
            api.addEventListener("viewerready", () => {
              if (!alive) return;
              start(api);
              setReady(true);
              // let the first camera pose and a few frames land before the loader lifts away
              window.setTimeout(announceSceneReady, 900);
            });
          },
          error: () => console.warn("Sketchfab viewer failed to initialise"),
        });
      })
      .catch((e) => console.warn(e));

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      clearInterval(nudgeTimer);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-bg">
      <Backdrop />
      <iframe
        ref={frame}
        title="Royal Enfield Hunter 350 – Dapper Grey, 3D model by Bhavik Suthar"
        className="pointer-events-none absolute left-0 top-0 border-0"
        allow="autoplay; fullscreen; xr-spatial-tracking"
        style={{
          width: `${supersample * 100}%`,
          height: `${supersample * 100}%`,
          transform: `scale(${1 / supersample})`,
          transformOrigin: "0 0",
          opacity: ready ? 1 : 0,
          transition: "opacity 1.4s",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(4,4,6,0.72)_100%)]" />
    </div>
  );
}

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/** A lit studio behind the transparent viewer: warm key, cool rim, floor pool, haze, light shafts, grain. */
function Backdrop() {
  return (
    <>
      {/* room: lifted, slightly warm floor, cool upper wall */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg,#0d1119 0%,#121722 34%,#1a1613 63%,#0e0c0b 100%)" }}
      />
      {/* warm key light, high left */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(52% 62% at 34% 6%, rgba(255,178,112,0.34), transparent 66%)" }}
      />
      {/* cool rim light, back right */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(42% 52% at 86% 30%, rgba(96,152,255,0.30), transparent 70%)" }}
      />
      {/* light shafts */}
      <div
        className="absolute inset-0 opacity-70 blur-[6px]"
        style={{
          background:
            "linear-gradient(104deg, transparent 30%, rgba(255,214,170,0.08) 38%, transparent 46%), linear-gradient(112deg, transparent 44%, rgba(255,200,150,0.06) 52%, transparent 60%)",
        }}
      />
      {/* horizon haze + floor light pool */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 46%, rgba(255,176,120,0.08) 62%, transparent 74%), radial-gradient(56% 24% at 50% 78%, rgba(255,140,72,0.26), transparent 72%)",
        }}
      />
      {/* film grain */}
      <div
        className="absolute inset-0 opacity-[0.09] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, backgroundSize: "160px 160px" }}
      />
    </>
  );
}
