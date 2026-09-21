"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { FOV } from "@/lib/cameraPath";
import { Rig } from "./Rig";
import { World } from "./World";

/** The environment on its own, for use behind a transparent bike viewer (the Sketchfab embed).
 *  It follows the same camera path as the bike so the parallax matches. */
export default function EnvStage() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ fov: FOV, near: 0.1, far: 500, position: [3, 1.5, 4.5] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      className="!absolute inset-0"
    >
      <Rig />
      <World />
      <EffectComposer multisampling={0}>
        <Bloom intensity={0.8} luminanceThreshold={0.85} mipmapBlur />
        <Noise opacity={0.035} />
        <Vignette eskil={false} offset={0.25} darkness={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
