"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { scroll } from "@/lib/scroll";
import { cameraAt } from "@/lib/cameraPath";
import { isSideLayout } from "@/lib/layout";

export function Rig() {
  const smooth = useRef(0);
  const parallax = useRef({ x: 0, y: 0 });
  const v = useMemo(() => ({ pos: new THREE.Vector3(), target: new THREE.Vector3() }), []);

  useFrame((state, dt) => {
    const cam = state.camera as THREE.PerspectiveCamera;
    smooth.current = THREE.MathUtils.damp(smooth.current, scroll.progress, 6, dt);

    const p = parallax.current;
    p.x = THREE.MathUtils.damp(p.x, state.pointer.x, 3, dt);
    p.y = THREE.MathUtils.damp(p.y, state.pointer.y, 3, dt);

    cameraAt(smooth.current, state.size.width / state.size.height, state.clock.elapsedTime, p, v.pos, v.target, isSideLayout(state.size.width, state.size.height));
    cam.position.copy(v.pos);
    cam.lookAt(v.target);
  });

  return null;
}
