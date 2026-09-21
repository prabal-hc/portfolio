/**
 * The 3D scene tells the loader when it is ready to be seen.
 * A flag is kept on `window` as well as the event, so it works whichever of the two mounts first.
 */
declare global {
  interface Window {
    __sceneReady?: boolean;
  }
}

export function announceSceneReady() {
  if (typeof window === "undefined" || window.__sceneReady) return;
  window.__sceneReady = true;
  window.dispatchEvent(new Event("scene-ready"));
}
