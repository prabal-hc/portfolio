import Cursor from "@/components/Cursor";
import Hud from "@/components/Hud";
import Loader from "@/components/Loader";
import Sections from "@/components/Sections";
import SmoothScroll from "@/components/SmoothScroll";
import SceneClient from "@/components/three/SceneClient";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <SceneClient />
      <Cursor />
      <Sections />
      <Hud />
      <Loader />
    </>
  );
}
