import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Headlines: a bold geometric sans, used at heavier weights for name and section titles.
const display = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

// Body: neutral, highly legible on dark.
const sans = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Labels, dates, tags, HUD readouts.
const mono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Prabal Holla",
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
