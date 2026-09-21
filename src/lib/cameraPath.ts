import * as THREE from "three";
import { REF_ASPECT, STACKED_BIKE_Y } from "./layout";

export const FOV = 35;
export const BIKE_CENTER_Y = 0.5;

/**
 * One keyframe per page section, in a normalised "bike space":
 * y-up, bike ~2.15 long, front wheel toward +X, ground at y = 0.
 *
 *  theta   – orbit angle around the focus point, degrees. 0 = camera on the bike's right side (nose to screen-right),
 *            180 = left side (nose to screen-left), −90 = camera behind the bike (nose points *up the screen* from overhead).
 *  r, h    – horizontal orbit radius and camera height (absolute)
 *  shift   – how far the bike sits off-centre, as a fraction of the half-viewport.
 *            +  → bike on the LEFT, content on the right.   −  → bike on the RIGHT, content on the left.
 *  lift    – raises the bike on screen (fraction of the half-viewport)
 *  tx,ty,tz – what the camera looks at (default: the bike's centre). Move it to zoom on a part.
 */
interface Key {
  theta: number;
  r: number;
  h: number;
  shift: number;
  lift: number;
  tx: number;
  ty: number;
  tz: number;
  /** 1 = slide the whole camera sideways to place the bike (parallel shift); 0 = keep the camera where it is and only
   *  turn its aim (the bike stays perfectly symmetrical, useful when looking dead along the bike's axis). */
  pivot: number;
}

const key = (k: Pick<Key, "theta" | "r" | "h" | "shift"> & Partial<Key>): Key => ({
  lift: 0,
  tx: 0,
  ty: BIKE_CENTER_Y,
  tz: 0,
  pivot: 1,
  ...k,
});

// The camera keeps turning the same way (theta only decreases), so it sweeps around the bike instead of reversing.
export const KEYS: Key[] = [
  // hero: three-quarter front, wide, bike lifted clear of the headline
  key({ theta: 35, r: 4.3, h: 1.2, shift: 0, lift: 0.2 }),
  // about: a rider's angle, dead behind the seat on the bike's centre line (theta −90), ~33° down, nose pointing up the
  // screen, tight on the console (bars, mirrors, pod, tank). pivot 0 keeps the camera on that centre line and only turns
  // its aim to place the bike on the left, so the bike stays symmetrical. lift raises the bike on screen.
  key({ theta: -90, r: 1.6, h: 2.0, shift: 0.42, lift: 0.25, pivot: 0, tx: 0.36, ty: 0.95 }),
  // skills: back to a horizontal side view, tight on the engine (from the left, nose toward the text)
  key({ theta: -188, r: 1.6, h: 0.75, shift: -0.42, lift: -0.2, tx: 0.1, ty: 0.46 }), // lift < 0 sits the bike lower
  // work: tight on the front wheel, fork and brake disc, from the front-right (the disc is on the right side)
  key({ theta: -345, r: 1.5, h: 0.5, shift: 0.42, lift: -0.2, tx: 0.68, ty: 0.34, tz: 0.04 }), // lift < 0 sits the bike lower
  // journey: dead behind the tail light at lamp height, looking straight down the bike to the console
  // (theta −450 ≡ −90 = directly behind; the focus is the console, so the tail lamp is big in the foreground).
  // pivot 0: the camera stays exactly on the bike's centre line and only its aim turns, so the bike is perfectly
  // symmetrical instead of slanting. lift raises the bike on screen.
  key({ theta: -450, r: 1.95, h: 0.9, shift: -0.42, lift: 0.22, pivot: 0, tx: 0.35, ty: 0.92 }),
  // contact: closing wide shot, higher, clear of the headline
  key({ theta: -685, r: 4.4, h: 1.2, shift: 0, lift: 0.3 }),
];

/** Catmull-Rom spline through p1 → p2 (p0 and p3 are the neighbours). Smooth, and never stops at a keyframe. */
const spline = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 *
  (2 * p1 +
    (p2 - p0) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);

const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _pan = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

/**
 * Camera position + look-at for a smoothed scroll `progress` (0..1), in bike space.
 * `idleTime` adds the slow hero sway; `pointer` (-1..1) adds a touch of parallax.
 */
export function cameraAt(
  progress: number,
  aspect: number,
  idleTime: number,
  pointer: { x: number; y: number },
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3,
  /** true when the page lays text beside the bike; false when it is stacked under it (see isSideLayout in layout.ts) */
  sideBySide: boolean,
) {
  const N = KEYS.length - 1;
  const s = progress * N;
  const i = Math.min(Math.floor(s), N - 1);
  const t = s - i; // no easing: the motion is one continuous glide from pose to pose
  const k0 = KEYS[Math.max(i - 1, 0)];
  const k1 = KEYS[i];
  const k2 = KEYS[i + 1];
  const k3 = KEYS[Math.min(i + 2, N)];
  const F = (f: keyof Key) => spline(k0[f], k1[f], k2[f], k3[f], t);

  const heroWeight = THREE.MathUtils.clamp(1 - s, 0, 1);
  const idle = Math.sin(idleTime * 0.35) * 0.5 * heroWeight;

  const theta = THREE.MathUtils.degToRad(F("theta")) + idle;
  let h = Math.max(F("h"), 0.3); // never dip to the floor
  let r = Math.max(F("r"), 0.3);
  const shift = F("shift");
  const lift = F("lift");
  const tx = F("tx");
  const ty = F("ty");
  const tz = F("tz");
  const pivot = THREE.MathUtils.clamp(F("pivot"), 0, 1);

  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

  // Real camera-to-focus distance. (For an overhead shot the horizontal radius r is tiny, so r alone is not a distance.)
  let d = Math.hypot(r, h - ty);

  // The keyframes were designed on a 16:9 window. On any other window shape, back the camera off along its own line of
  // sight so the subject keeps the same share of the bike's zone instead of being cropped (narrow) or lost (wide).
  //  side layout    – the bike lives in roughly the left/right half. Shots that are centred (hero, contact) have more room.
  //  stacked layout – the bike is centred but the screen is narrow, so it needs roughly half the 16:9 width.
  const sidedness = THREE.MathUtils.clamp(Math.abs(shift) / 0.42, 0, 1);
  const zone = sideBySide ? 0.6 + 0.4 * sidedness : 0.55;
  const scale = Math.max(1, (zone * REF_ASPECT) / aspect);
  if (scale !== 1) {
    r *= scale;
    h = ty + (h - ty) * scale;
    d *= scale;
  }

  outTarget.set(tx, ty, tz);
  outPos.set(tx + Math.sin(theta) * r, h, tz + Math.cos(theta) * r);
  _fwd.copy(outTarget).sub(outPos).normalize();
  _right.crossVectors(_fwd, _worldUp).normalize();
  _up.crossVectors(_right, _fwd).normalize();

  if (sideBySide) {
    _pan.copy(_right).multiplyScalar(shift * d * tanHalf * aspect);
    _pan.addScaledVector(_up, -lift * d * tanHalf); // camera down = subject up
  } else {
    // stacked layout: the bike is centred across and parked in the top part of the screen, text underneath
    const up = 1 - 2 * STACKED_BIKE_Y; // how far above the screen centre the bike sits, in half-heights
    _pan.copy(_up).multiplyScalar(-up * d * tanHalf);
  }

  // mouse parallax only on the hero; after that the poses stay perfectly still (a pointer near the scrollbar was tilting the bike)
  const parallax = heroWeight;
  outPos
    .addScaledVector(_pan, pivot)
    .addScaledVector(_right, pointer.x * 0.12 * parallax)
    .addScaledVector(_up, pointer.y * 0.07 * parallax);
  outTarget.add(_pan);
}
