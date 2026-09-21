import Hud from "@/components/Hud";
import Sections from "@/components/Sections";
import SmoothScroll from "@/components/SmoothScroll";
import SceneClient from "@/components/three/SceneClient";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <SceneClient />
      <Sections />
      <Hud />
    </>
  );
}
