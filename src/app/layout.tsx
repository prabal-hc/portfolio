import type { Metadata } from "next";
import { Bebas_Neue, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

// Headlines: tall condensed caps, poster / race-number energy.
const display = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

// Body: neutral, highly legible on dark.
const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Labels, numbers, HUD.
const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prabal Holla — Frontend Developer",
  description:
    "Portfolio of Prabal Holla, a frontend developer building with React, Next.js and TypeScript. Interactive 3D, built around a Royal Enfield Hunter 350.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-loading is removed by <Loader/> when everything is ready; until then section content is held back.
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} data-loading="">
      <body>
        {/* without JavaScript there is no loader and nothing to wait for: show the page */}
        <noscript>
          <style>{`#loader{display:none}html[data-loading] .reveal>*{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
