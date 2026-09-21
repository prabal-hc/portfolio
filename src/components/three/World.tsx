"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";

/**
 * Tech environment, in the bike's space (y-up, ground at y = 0, bike at the origin):
 *  - a neon data-grid floor with pulses rolling outward
 *  - a rotating HUD "turntable" under the bike
 *  - a skyline of data towers with lit windows
 *  - falling code streams and floating code windows (the stuff a frontend dev lives in)
 * Colours drift cyan → violet → orange with scroll progress.
 */

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TINT: [number, THREE.Color][] = [
  [0.0, new THREE.Color("#22d3ee")], // cyan
  [0.35, new THREE.Color("#3b82f6")], // blue
  [0.7, new THREE.Color("#8b5cf6")], // violet
  [1.0, new THREE.Color("#ff6a1a")], // orange (site accent)
];

const SKY: [number, THREE.Color, THREE.Color][] = [
  [0.0, new THREE.Color("#06182a"), new THREE.Color("#02040a")],
  [0.35, new THREE.Color("#0a1030"), new THREE.Color("#020308")],
  [0.7, new THREE.Color("#1a0d2e"), new THREE.Color("#03020a")],
  [1.0, new THREE.Color("#2a1208"), new THREE.Color("#080508")],
];

function tintAt(p: number, out: THREE.Color) {
  const q = THREE.MathUtils.clamp(p, 0, 1);
  for (let i = 0; i < TINT.length - 1; i++) {
    if (q <= TINT[i + 1][0]) {
      const t = (q - TINT[i][0]) / (TINT[i + 1][0] - TINT[i][0]);
      return out.copy(TINT[i][1]).lerp(TINT[i + 1][1], t);
    }
  }
  return out.copy(TINT[TINT.length - 1][1]);
}

function skyAt(p: number, horizon: THREE.Color, zenith: THREE.Color) {
  const q = THREE.MathUtils.clamp(p, 0, 1);
  for (let i = 0; i < SKY.length - 1; i++) {
    if (q <= SKY[i + 1][0]) {
      const t = (q - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]);
      horizon.copy(SKY[i][1]).lerp(SKY[i + 1][1], t);
      zenith.copy(SKY[i][2]).lerp(SKY[i + 1][2], t);
      return;
    }
  }
  horizon.copy(SKY[SKY.length - 1][1]);
  zenith.copy(SKY[SKY.length - 1][2]);
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ------------------------------------------------------------------ */
/* sky + grid shaders                                                  */
/* ------------------------------------------------------------------ */

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFrag = /* glsl */ `
  uniform vec3 horizon;
  uniform vec3 zenith;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 c = mix(horizon, zenith, pow(h, 0.5));
    c += horizon * 0.9 * exp(-abs(vDir.y) * 16.0);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const gridVert = /* glsl */ `
  varying vec2 vXZ;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vXZ = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const gridFrag = /* glsl */ `
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform float time;
  varying vec2 vXZ;

  float grid(vec2 p, float size, float w) {
    vec2 q = p / size;
    vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
    return 1.0 - min(min(g.x, g.y) / w, 1.0);
  }

  void main() {
    float d = length(vXZ);
    float minor = grid(vXZ, 1.0, 1.0) * 0.28;
    float major = grid(vXZ, 5.0, 1.6) * 0.9;
    float lines = max(minor, major);

    // pulses rolling outward from the bike
    float wave = fract(time * 0.09);
    float pulse = exp(-pow((d - wave * 90.0) * 0.16, 2.0));
    float pulse2 = exp(-pow((d - fract(time * 0.09 + 0.5) * 90.0) * 0.16, 2.0));

    vec3 col = mix(colorA, colorB, smoothstep(0.0, 70.0, d));
    float fade = exp(-d * 0.028);
    float a = lines * (fade * 0.9 + (pulse + pulse2) * 1.4);
    // soft glow pool right around the bike
    a += exp(-d * 0.55) * 0.18;
    gl_FragColor = vec4(col * (1.0 + (pulse + pulse2) * 1.6), clamp(a, 0.0, 1.0));
  }
`;

/* ------------------------------------------------------------------ */
/* textures                                                            */
/* ------------------------------------------------------------------ */

const CHARS = "01{}<>/=;()[]$#@+*ｱｲｳｴｵｶｷｸｹｺ0123456789abcdef";

function windowTexture() {
  const r = rng(11);
  return canvasTex(
    256,
    512,
    (g) => {
      g.fillStyle = "#000";
      g.fillRect(0, 0, 256, 512);
      const palette = ["#67e8f9", "#60a5fa", "#a78bfa", "#ffb070", "#e0f2fe"];
      for (let y = 0; y < 512; y += 10) {
        for (let x = 0; x < 256; x += 8) {
          if (r() < 0.2) {
            g.fillStyle = palette[Math.floor(r() * palette.length)];
            g.globalAlpha = 0.5 + r() * 0.5;
            g.fillRect(x + 1, y + 2, 5, 5);
          }
        }
        if (r() < 0.05) {
          g.globalAlpha = 0.9;
          g.fillStyle = "#67e8f9";
          g.fillRect(0, y + 4, 256, 2);
        }
      }
      g.globalAlpha = 1;
    },
    true,
  );
}

function streamTexture(seed: number) {
  const r = rng(seed);
  return canvasTex(
    64,
    1024,
    (g) => {
      g.clearRect(0, 0, 64, 1024);
      g.font = "14px monospace";
      g.textBaseline = "top";
      for (let col = 0; col < 4; col++) {
        const x = 3 + col * 16;
        let y = -r() * 400;
        while (y < 1024) {
          const len = 10 + Math.floor(r() * 26);
          for (let i = 0; i < len; i++) {
            const t = i / len;
            g.fillStyle = i === len - 1 ? "#ffffff" : `rgba(255,255,255,${0.08 + t * 0.7})`;
            g.fillText(CHARS[Math.floor(r() * CHARS.length)], x, y + i * 15);
          }
          y += len * 15 + 40 + r() * 260;
        }
      }
    },
    true,
  );
}

function hudTexture(kind: "outer" | "inner") {
  const r = rng(kind === "outer" ? 5 : 9);
  return canvasTex(1024, 1024, (g) => {
    g.clearRect(0, 0, 1024, 1024);
    g.translate(512, 512);
    g.strokeStyle = "#fff";
    g.fillStyle = "#fff";
    const ring = (rad: number, w: number, dash?: number[]) => {
      g.lineWidth = w;
      g.setLineDash(dash ?? []);
      g.beginPath();
      g.arc(0, 0, rad, 0, Math.PI * 2);
      g.stroke();
    };
    if (kind === "outer") {
      ring(500, 3);
      ring(468, 2, [4, 10]);
      g.setLineDash([]);
      for (let i = 0; i < 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        const long = i % 10 === 0;
        g.lineWidth = long ? 4 : 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * (long ? 440 : 456), Math.sin(a) * (long ? 440 : 456));
        g.lineTo(Math.cos(a) * 498, Math.sin(a) * 498);
        g.stroke();
      }
      for (let i = 0; i < 7; i++) {
        const a0 = r() * Math.PI * 2;
        g.lineWidth = 12;
        g.beginPath();
        g.arc(0, 0, 400, a0, a0 + 0.2 + r() * 0.6);
        g.stroke();
      }
    } else {
      ring(490, 2);
      ring(420, 6, [60, 30]);
      ring(330, 2, [2, 12]);
      for (let i = 0; i < 4; i++) {
        const a0 = (i / 4) * Math.PI * 2 + 0.3;
        g.lineWidth = 8;
        g.beginPath();
        g.arc(0, 0, 250, a0, a0 + 0.9);
        g.stroke();
      }
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.moveTo(Math.cos(a) * 130, Math.sin(a) * 130);
        g.lineTo(Math.cos(a) * 170, Math.sin(a) * 170);
        g.lineWidth = 3;
        g.stroke();
      }
    }
  });
}

/* code windows --------------------------------------------------------- */

const SNIPPETS: { file: string; code: string }[] = [
  {
    file: "Bike.tsx",
    code: `export function Bike() {
  const { scene } = useGLTF('/hunter350.glb')

  useFrame((state) => {
    // follow the scroll
    state.camera.position.lerp(target, 0.08)
  })

  return <primitive object={scene} />
}`,
  },
  {
    file: "terminal",
    code: `$ npm run build
> next build
✓ Compiled successfully in 9.6s
✓ Generating static pages (4/4)

$ vercel --prod
▲ Deploying portfolio...
✓ Production: https://prabal.dev`,
  },
  {
    file: "hero.css",
    code: `.hero {
  display: grid;
  place-items: center;
  min-height: 100svh;
  background: radial-gradient(
    60% 45% at 50% 78%,
    rgba(255, 106, 26, 0.1),
    transparent 70%
  );
}`,
  },
  {
    file: "package.json",
    code: `{
  "name": "portfolio",
  "dependencies": {
    "next": "16.3.5",
    "react": "19.2.8",
    "three": "0.186.0",
    "@react-three/fiber": "9.7.0",
    "gsap": "3.15.0"
  }
}`,
  },
  {
    file: "glow.frag",
    code: `uniform vec3 colorA;
uniform vec3 colorB;

void main() {
  float d = length(vXZ);
  vec3 col = mix(colorA, colorB, d / 70.0);
  gl_FragColor = vec4(col, glow(d));
}`,
  },
];

const KW = /^(export|function|const|let|return|import|from|async|await|uniform|void|float|vec3|vec4|new)\b/;

function highlight(line: string): [string, string][] {
  const out: [string, string][] = [];
  let s = line;
  const push = (t: string, c: string) => t && out.push([t, c]);
  while (s.length) {
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^\/\/.*/)) || (m = s.match(/^\s*\/\/.*/))) push(m[0], "#6e7681");
    else if ((m = s.match(/^(["'`])(?:\\.|(?!\1).)*\1/))) push(m[0], "#7ee787");
    else if ((m = s.match(KW))) push(m[0], "#ff8a4c");
    else if ((m = s.match(/^[✓▲>$]/))) push(m[0], "#67e8f9");
    else if ((m = s.match(/^\d[\d.]*/))) push(m[0], "#79c0ff");
    else if ((m = s.match(/^[A-Za-z_][\w-]*(?=\()/))) push(m[0], "#d2a8ff");
    else if ((m = s.match(/^[A-Za-z_@][\w./-]*/))) push(m[0], "#c9d1d9");
    else {
      m = [s[0]] as unknown as RegExpMatchArray;
      push(m[0], "#8b949e");
    }
    s = s.slice(m[0].length);
  }
  return out;
}

function codeTexture({ file, code }: { file: string; code: string }) {
  return canvasTex(640, 400, (g) => {
    g.fillStyle = "rgba(6,10,20,0.82)";
    g.fillRect(0, 0, 640, 400);
    g.strokeStyle = "rgba(103,232,249,0.65)";
    g.lineWidth = 3;
    g.strokeRect(1.5, 1.5, 637, 397);
    g.fillStyle = "rgba(103,232,249,0.12)";
    g.fillRect(0, 0, 640, 40);
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(24 + i * 22, 20, 6, 0, Math.PI * 2);
      g.fill();
    });
    g.font = "16px monospace";
    g.fillStyle = "#8b949e";
    g.textBaseline = "middle";
    g.fillText(file, 108, 21);
    g.font = "20px monospace";
    g.textBaseline = "top";
    code.split("\n").forEach((line, i) => {
      let x = 28;
      for (const [t, c] of highlight(line)) {
        g.fillStyle = c;
        g.fillText(t, x, 62 + i * 27);
        x += g.measureText(t).width;
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* scene                                                               */
/* ------------------------------------------------------------------ */

const PANELS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2 + 0.3;
  const r = 11 + (i % 3) * 2.2;
  return { x: Math.sin(a) * r, z: Math.cos(a) * r, y: 1.6 + ((i * 37) % 30) / 12, snippet: i % SNIPPETS.length, phase: i * 1.7 };
});

export function World() {
  const smooth = useRef(0);
  const fogRef = useRef<THREE.Fog>(null);
  const bgRef = useRef<THREE.Color>(null);
  const gridMat = useRef<THREE.ShaderMaterial>(null);
  const skyMat = useRef<THREE.ShaderMaterial>(null);
  const hudOuter = useRef<THREE.Mesh>(null);
  const hudInner = useRef<THREE.Mesh>(null);
  const hudMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const streamMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const panelRefs = useRef<(THREE.Group | null)[]>([]);

  const tintA = useMemo(() => new THREE.Color(), []);
  const tintB = useMemo(() => new THREE.Color(), []);
  const zenith = useMemo(() => new THREE.Color(), []);
  const gridUniforms = useMemo(
    () => ({ colorA: { value: new THREE.Color("#22d3ee") }, colorB: { value: new THREE.Color("#3b82f6") }, time: { value: 0 } }),
    [],
  );
  const skyUniforms = useMemo(() => ({ horizon: { value: new THREE.Color() }, zenith: { value: new THREE.Color() } }), []);

  const winTex = useMemo(() => windowTexture(), []);
  const streamTex = useMemo(() => [streamTexture(3), streamTexture(17), streamTexture(29)], []);
  const hudTex = useMemo(() => ({ outer: hudTexture("outer"), inner: hudTexture("inner") }), []);
  const codeTex = useMemo(() => SNIPPETS.map(codeTexture), []);

  const towers = useMemo(() => {
    const r = rng(42);
    return Array.from({ length: 64 }, () => {
      const a = r() * Math.PI * 2;
      const dist = 26 + r() * 70;
      const w = 2 + r() * 4.5;
      const d = 2 + r() * 4.5;
      const h = 6 + Math.pow(r(), 1.8) * 58;
      const geo = new THREE.BoxGeometry(w, h, d);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.max(w, d)) / 4, (uv.getY(i) * h) / 5);
      return { geo, x: Math.sin(a) * dist, z: Math.cos(a) * dist, h };
    });
  }, []);

  const streams = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 24 }, (_, i) => {
      const a = r() * Math.PI * 2;
      const dist = 18 + r() * 30;
      return { x: Math.sin(a) * dist, z: Math.cos(a) * dist, ry: Math.atan2(-Math.sin(a), -Math.cos(a)), tex: i % 3, y: 6 + r() * 12 };
    });
  }, []);

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    smooth.current = THREE.MathUtils.damp(smooth.current, scroll.progress, 4, dt);
    const p = smooth.current;

    tintAt(p, tintA);
    tintAt(p + 0.3, tintB);

    const sky = skyMat.current?.uniforms;
    if (sky) {
      skyAt(p, sky.horizon.value, zenith);
      sky.zenith.value.copy(zenith);
      fogRef.current?.color.copy(sky.horizon.value).multiplyScalar(0.7);
      bgRef.current?.copy(zenith);
    }

    const grid = gridMat.current?.uniforms;
    if (grid) {
      grid.time.value = t;
      grid.colorA.value.copy(tintA);
      grid.colorB.value.copy(tintB);
    }
    if (hudOuter.current) hudOuter.current.rotation.z = t * 0.06;
    if (hudInner.current) hudInner.current.rotation.z = -t * 0.11;
    hudMats.current.forEach((m) => m?.color.copy(tintA));
    streamMats.current.forEach((m, i) => {
      if (!m?.map) return;
      m.map.offset.y = (m.map.offset.y - dt * (0.05 + (i % 3) * 0.035)) % 1;
      m.color.copy(tintB);
    });
    panelRefs.current.forEach((g, i) => {
      if (g) g.position.y = PANELS[i].y + Math.sin(t * 0.5 + PANELS[i].phase) * 0.12;
    });
  });

  return (
    <group>
      <fog ref={fogRef} attach="fog" args={["#06182a", 14, 170]} />
      <color ref={bgRef} attach="background" args={["#02040a"]} />
      <ambientLight intensity={0.35} color="#7f9cff" />
      <directionalLight position={[8, 20, 6]} intensity={0.6} color="#a9c1ff" />

      {/* sky dome */}
      <mesh renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[300, 32, 16]} />
        <shaderMaterial ref={skyMat} vertexShader={skyVert} fragmentShader={skyFrag} uniforms={skyUniforms} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>

      {/* floor: dark base + glowing data grid */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.002, 0]}>
        <planeGeometry args={[500, 500]} />
        <meshStandardMaterial color="#04060b" roughness={0.55} metalness={0.7} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0]} renderOrder={1}>
        <planeGeometry args={[500, 500]} />
        <shaderMaterial
          ref={gridMat}
          vertexShader={gridVert}
          fragmentShader={gridFrag}
          uniforms={gridUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
          toneMapped={false}
        />
      </mesh>

      {/* HUD turntable under the bike */}
      <mesh ref={hudOuter} rotation-x={-Math.PI / 2} position={[0, 0.012, 0]} renderOrder={2}>
        <planeGeometry args={[7.2, 7.2]} />
        <meshBasicMaterial
          ref={(m) => {
            hudMats.current[0] = m;
          }}
          map={hudTex.outer}
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={hudInner} rotation-x={-Math.PI / 2} position={[0, 0.014, 0]} renderOrder={2}>
        <planeGeometry args={[4.6, 4.6]} />
        <meshBasicMaterial
          ref={(m) => {
            hudMats.current[1] = m;
          }}
          map={hudTex.inner}
          transparent
          opacity={0.6}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* data towers */}
      {towers.map((t, i) => (
        <mesh key={i} geometry={t.geo} position={[t.x, t.h / 2, t.z]}>
          <meshStandardMaterial color="#05070d" roughness={0.5} metalness={0.6} emissive="#ffffff" emissiveMap={winTex} emissiveIntensity={1.15} />
        </mesh>
      ))}

      {/* falling code streams */}
      {streams.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]} rotation-y={s.ry}>
          <planeGeometry args={[1.7, 34]} />
          <meshBasicMaterial
            ref={(m) => {
              streamMats.current[i] = m;
              if (m && !m.map) m.map = streamTex[s.tex];
            }}
            transparent
            opacity={0.55}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* floating code windows */}
      {PANELS.map((p, i) => (
        <group
          key={i}
          ref={(g) => {
            panelRefs.current[i] = g;
          }}
          position={[p.x, p.y, p.z]}
          rotation-y={Math.atan2(-p.x, -p.z)}
        >
          <mesh>
            <planeGeometry args={[5.2, 3.25]} />
            <meshBasicMaterial map={codeTex[p.snippet]} transparent opacity={0.92} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}

      {/* data specks drifting up around the bike */}
      <Sparkles count={140} scale={[18, 8, 18]} size={2.2} speed={0.4} opacity={0.7} color="#67e8f9" position={[0, 3, 0]} />
      <Sparkles count={40} scale={[12, 6, 12]} size={2.6} speed={0.3} opacity={0.6} color="#ff8a4c" position={[0, 2.5, 0]} />
    </group>
  );
}
