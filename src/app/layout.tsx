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
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
