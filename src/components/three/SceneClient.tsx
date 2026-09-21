"use client";

import dynamic from "next/dynamic";

const Scene = dynamic(() => import("./Scene"), { ssr: false });
const SketchfabStage = dynamic(() => import("./SketchfabStage"), { ssr: false });

/** "sketchfab": the author's public embed, camera driven through the Viewer API.
 *  "procedural": the R3F scene with the stand-in bike (or /public/models/hunter350.glb if present). */
const SOURCE: "sketchfab" | "procedural" = "sketchfab";

export default function SceneClient() {
  return SOURCE === "sketchfab" ? <SketchfabStage /> : <Scene />;
}
