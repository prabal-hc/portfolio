"use client";

import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { announceSceneReady } from "@/lib/loading";
import { Bike } from "./Bike";
import { Rig } from "./Rig";

const BG = "#050506";

export default function Scene() {
  return (
    <div className="fixed inset-0 z-0">
      <Canvas
        onCreated={() => window.setTimeout(announceSceneReady, 600)}
        dpr={[1, 1.75]}
        camera={{ fov: 35, near: 0.1, far: 60, position: [3, 1.5, 4.5] }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 9, 24]} />

        <Rig />

        <ambientLight intensity={0.12} />
        <spotLight position={[3, 7, 4]} angle={0.5} penumbra={1} intensity={120} color="#ffffff" />
        <spotLight position={[-5, 3, -4]} angle={0.6} penumbra={1} intensity={90} color="#ff6a1a" />
        <spotLight position={[5, 2.5, -4]} angle={0.6} penumbra={1} intensity={70} color="#5b8cff" />

        <Environment resolution={256} environmentIntensity={0.7}>
          <Lightformer form="rect" intensity={2.5} position={[0, 5, -3]} scale={[10, 2, 1]} rotation-x={Math.PI / 2} />
          <Lightformer form="rect" intensity={4} color="#ff6a1a" position={[-6, 1.5, 1]} rotation-y={Math.PI / 2} scale={[8, 1.5, 1]} />
          <Lightformer form="rect" intensity={3} color="#5b8cff" position={[6, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[8, 1.5, 1]} />
        </Environment>

        <Bike />

        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
          <planeGeometry args={[60, 60]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={512}
            mixBlur={1}
            mixStrength={30}
            roughness={1}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#0a0a0c"
            metalness={0.5}
            mirror={0}
          />
        </mesh>
        <ContactShadows position={[0, 0.005, 0]} opacity={0.7} scale={8} blur={2.6} far={1.2} />

        <EffectComposer multisampling={0}>
          <Bloom intensity={0.7} luminanceThreshold={0.9} mipmapBlur />
          <Noise opacity={0.04} />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
