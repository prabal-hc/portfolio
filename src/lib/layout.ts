/**
 * The one rule for how the page is laid out, shared by the CSS (custom variant `side` in globals.css) and the camera.
 *
 *  side    – text sits beside the bike (desktops, laptops, landscape tablets, landscape phones)
 *  stacked – the bike sits in the top part of the screen with the text underneath (phones, portrait tablets, squarish windows)
 *
 * Keep this in sync with the `@custom-variant side` media query in globals.css.
 */
export function isSideLayout(width: number, height: number): boolean {
  const aspect = width / height;
  return (width >= 1024 && aspect >= 1.15) || (width >= 640 && aspect >= 1.7);
}

/** Aspect ratio the camera keyframes were designed for (a 16:9 desktop window). */
export const REF_ASPECT = 16 / 9;

/** In the stacked layout, where the bike is centred vertically, as a fraction of the screen height from the top. */
export const STACKED_BIKE_Y = 0.27;

/** In the stacked layout, where a section's text starts, as a fraction of the screen height from the top.
 *  Keep in sync with `pt-[50svh]` on <Section> in Sections.tsx. */
export const STACKED_TEXT_TOP = 0.5;
