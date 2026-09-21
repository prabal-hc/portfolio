"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";

/**
 * Drop your Hunter 350 model at /public/models/hunter350.glb and it is picked up
 * automatically. Until then a procedural stand-in bike is rendered.
 */
export const MODEL_URL = "/models/hunter350.glb";
/** Rotate the imported model so the front wheel points to +X. Try 0, Math.PI/2, Math.PI, -Math.PI/2. */
const MODEL_YAW = 0;
const BIKE_LENGTH = 2.15;

export function Bike() {
  const [hasModel, setHasModel] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(MODEL_URL, { method: "HEAD" })
      .then((r) => {
        const type = r.headers.get("content-type") ?? "";
        if (alive && r.ok && !type.includes("text/html")) setHasModel(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return hasModel ? (
    <Suspense fallback={<ProceduralBike />}>
      <GltfBike />
    </Suspense>
  ) : (
    <ProceduralBike />
  );
}

function GltfBike() {
  const { scene } = useGLTF(MODEL_URL);

  const { object, scale } = useMemo(() => {
    const root = scene.clone(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    root.position.set(-center.x, -box.min.y, -center.z);
    return { object: root, scale: BIKE_LENGTH / Math.max(size.x, size.z) };
  }, [scene]);

  return (
    <group rotation-y={MODEL_YAW} scale={scale}>
      <primitive object={object} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Procedural stand-in                                                 */
/* ------------------------------------------------------------------ */

type V3 = [number, number, number];

function Tube({
  from,
  to,
  r = 0.02,
  material,
}: {
  from: V3;
  to: V3;
  r?: number;
  material: THREE.Material;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.normalize(),
    );
    return { position: a.add(b).multiplyScalar(0.5), quaternion, length };
  }, [from, to]);

  return (
    <mesh position={position} quaternion={quaternion} material={material}>
      <cylinderGeometry args={[r, r, length, 12]} />
    </mesh>
  );
}

const R = 0.365; // wheel radius (tyre outer)

function Wheel({ x, mats }: { x: number; mats: Mats }) {
  return (
    <group position={[x, R, 0]}>
      <mesh material={mats.rubber}>
        <torusGeometry args={[R - 0.075, 0.075, 20, 64]} />
      </mesh>
      <mesh material={mats.alloy}>
        <torusGeometry args={[R - 0.135, 0.018, 12, 48]} />
      </mesh>
      {Array.from({ length: 5 }).map((_, i) => (
        <group key={i} rotation-z={(i / 5) * Math.PI * 2}>
          {[-0.035, 0.035].map((z) => (
            <mesh key={z} position={[(R - 0.135) / 2, 0, z]} material={mats.alloy}>
              <boxGeometry args={[R - 0.135, 0.028, 0.02]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh rotation-x={Math.PI / 2} material={mats.alloy}>
        <cylinderGeometry args={[0.045, 0.045, 0.16, 20]} />
      </mesh>
      <mesh rotation-x={Math.PI / 2} position={[0, 0, 0.055]} material={mats.disc}>
        <cylinderGeometry args={[0.15, 0.15, 0.008, 40]} />
      </mesh>
    </group>
  );
}

type Mats = ReturnType<typeof makeMaterials>;

function makeMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({
      color: "#6c7075",
      metalness: 0.55,
      roughness: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
    }),
    accent: new THREE.MeshStandardMaterial({ color: "#ff6a1a", metalness: 0.3, roughness: 0.4 }),
    black: new THREE.MeshStandardMaterial({ color: "#0c0c0e", metalness: 0.5, roughness: 0.45 }),
    rubber: new THREE.MeshStandardMaterial({ color: "#050506", metalness: 0, roughness: 0.9 }),
    alloy: new THREE.MeshStandardMaterial({ color: "#2a2b2f", metalness: 0.9, roughness: 0.3 }),
    disc: new THREE.MeshStandardMaterial({ color: "#a9adb3", metalness: 1, roughness: 0.35 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#d9dce1", metalness: 1, roughness: 0.12 }),
    seat: new THREE.MeshStandardMaterial({ color: "#101012", metalness: 0, roughness: 0.75 }),
    lamp: new THREE.MeshStandardMaterial({
      color: "#fff3d6",
      emissive: "#ffd9a0",
      emissiveIntensity: 3,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: "#ff1c1c",
      emissive: "#ff1c1c",
      emissiveIntensity: 3,
    }),
  };
}

function ProceduralBike() {
  const m = useMemo(() => makeMaterials(), []);
  const sides = [-1, 1];

  return (
    <group>
      <Wheel x={0.72} mats={m} />
      <Wheel x={-0.72} mats={m} />

      {/* fenders */}
      <mesh position={[0.72, R, 0]} rotation-z={Math.PI / 2 - 0.55} scale={[1, 1, 3.4]} material={m.paint}>
        <torusGeometry args={[R + 0.04, 0.03, 8, 32, 1.0]} />
      </mesh>
      <mesh position={[-0.72, R, 0]} rotation-z={0.55} scale={[1, 1, 3.4]} material={m.black}>
        <torusGeometry args={[R + 0.06, 0.03, 8, 32, 1.05]} />
      </mesh>

      {/* frame */}
      <Tube from={[0.42, 0.95, 0]} to={[-0.12, 0.72, 0]} r={0.028} material={m.black} />
      <Tube from={[0.42, 0.92, 0]} to={[0.12, 0.34, 0]} r={0.028} material={m.black} />
      <Tube from={[0.12, 0.34, 0]} to={[-0.32, 0.4, 0]} r={0.026} material={m.black} />
      {sides.map((s) => (
        <group key={s}>
          <Tube from={[-0.12, 0.72, s * 0.1]} to={[-0.86, 0.78, s * 0.1]} r={0.02} material={m.black} />
          <Tube from={[-0.32, 0.4, s * 0.1]} to={[-0.6, 0.74, s * 0.1]} r={0.02} material={m.black} />
          {/* swingarm */}
          <Tube from={[-0.3, 0.4, s * 0.11]} to={[-0.72, R, s * 0.1]} r={0.024} material={m.alloy} />
          {/* shocks */}
          <Tube from={[-0.55, 0.74, s * 0.15]} to={[-0.68, 0.42, s * 0.12]} r={0.016} material={m.chrome} />
          {/* fork */}
          <Tube from={[0.72, R, s * 0.115]} to={[0.45, 1.02, s * 0.115]} r={0.022} material={m.chrome} />
        </group>
      ))}

      {/* fork crown, handlebar, grips, mirrors */}
      <Tube from={[0.44, 1.0, -0.13]} to={[0.44, 1.0, 0.13]} r={0.03} material={m.black} />
      <Tube from={[0.38, 1.12, -0.33]} to={[0.38, 1.12, 0.33]} r={0.014} material={m.black} />
      {sides.map((s) => (
        <group key={s}>
          <Tube from={[0.38, 1.12, s * 0.22]} to={[0.38, 1.12, s * 0.35]} r={0.02} material={m.rubber} />
          <Tube from={[0.38, 1.13, s * 0.3]} to={[0.3, 1.36, s * 0.34]} r={0.007} material={m.black} />
          <mesh position={[0.3, 1.38, s * 0.34]} scale={[0.4, 1, 1]} material={m.black}>
            <sphereGeometry args={[0.05, 16, 16]} />
          </mesh>
        </group>
      ))}

      {/* headlamp + cluster */}
      <mesh position={[0.6, 1.03, 0]} scale={[0.85, 1, 1]} material={m.chrome}>
        <sphereGeometry args={[0.135, 32, 32]} />
      </mesh>
      <mesh position={[0.685, 1.03, 0]} rotation-z={-Math.PI / 2} material={m.lamp}>
        <circleGeometry args={[0.095, 32]} />
      </mesh>
      <mesh position={[0.36, 1.2, 0]} rotation-z={0.5} material={m.black}>
        <cylinderGeometry args={[0.05, 0.05, 0.04, 24]} />
      </mesh>

      {/* tank */}
      <mesh position={[0.12, 0.86, 0]} rotation-z={Math.PI / 2 + 0.1} scale={[1, 1, 0.72]} material={m.paint}>
        <capsuleGeometry args={[0.16, 0.36, 16, 32]} />
      </mesh>
      <mesh position={[0.12, 0.865, 0]} rotation-z={Math.PI / 2 + 0.1} scale={[1.02, 1, 0.16]} material={m.accent}>
        <capsuleGeometry args={[0.16, 0.36, 16, 32]} />
      </mesh>

      {/* seat + tail */}
      <mesh position={[-0.42, 0.8, 0]} rotation-z={Math.PI / 2 - 0.06} scale={[0.55, 1, 1.15]} material={m.seat}>
        <capsuleGeometry args={[0.13, 0.62, 12, 24]} />
      </mesh>
      <mesh position={[-1.0, 0.8, 0]} material={m.tail}>
        <boxGeometry args={[0.04, 0.04, 0.16]} />
      </mesh>

      {/* engine */}
      <mesh position={[0.05, 0.43, 0]} material={m.alloy}>
        <boxGeometry args={[0.5, 0.3, 0.22]} />
      </mesh>
      <mesh position={[0.2, 0.62, 0]} rotation-z={-0.35} material={m.alloy}>
        <cylinderGeometry args={[0.1, 0.1, 0.36, 24]} />
      </mesh>
      <mesh position={[0.24, 0.8, 0]} rotation-z={-0.35} material={m.black}>
        <cylinderGeometry args={[0.115, 0.115, 0.06, 24]} />
      </mesh>

      {/* exhaust */}
      <Tube from={[0.28, 0.5, 0.1]} to={[0.3, 0.3, 0.16]} r={0.024} material={m.chrome} />
      <Tube from={[0.3, 0.3, 0.16]} to={[-0.3, 0.3, 0.17]} r={0.03} material={m.chrome} />
      <Tube from={[-0.3, 0.3, 0.17]} to={[-1.0, 0.42, 0.17]} r={0.07} material={m.chrome} />

      {/* footpegs */}
      {sides.map((s) => (
        <Tube key={s} from={[-0.05, 0.36, s * 0.13]} to={[-0.05, 0.36, s * 0.26]} r={0.012} material={m.black} />
      ))}

      <pointLight position={[1.1, 1.0, 0]} intensity={4} distance={4} color="#ffd9a0" />
    </group>
  );
}
