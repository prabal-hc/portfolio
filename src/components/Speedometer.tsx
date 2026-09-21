"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

/**
 * A speedometer styled after the Hunter 350's dash: a round black dial, the scale 20–160 sweeping around the edge
 * with the numbers set radially (tops pointing outward), a red needle, and a pale digital display in the middle
 * with the speed, the gear and the neutral lamp.
 *
 * Driven imperatively (`ref.current.set(kmh)`) so it can be updated every animation frame without re-rendering.
 */

const SCALE_MAX = 160; // the dial reads 0–160
const START_DEG = 135; // 0 km/h sits at the lower left…
const SWEEP_DEG = 270; // …and the scale sweeps clockwise over the top to the lower right

// Rounded on purpose: Node and the browser can disagree in the last digits of Math.cos/Math.sin, and that difference
// in the server-rendered vs client-rendered SVG attributes is a React hydration error.
const round2 = (n: number) => Math.round(n * 100) / 100;
const angleFor = (v: number) => START_DEG + (SWEEP_DEG * v) / SCALE_MAX; // degrees, 0 = +x, clockwise (SVG y is down)
const at = (v: number, r: number) => {
  const a = (angleFor(v) * Math.PI) / 180;
  return [round2(Math.cos(a) * r), round2(Math.sin(a) * r)] as const;
};

/** Hunter 350 is a 5-speed: which gear you'd plausibly be in at this speed */
const gearFor = (kmh: number) => (kmh < 3 ? 0 : kmh < 25 ? 1 : kmh < 50 ? 2 : kmh < 80 ? 3 : kmh < 110 ? 4 : 5);

export interface SpeedometerHandle {
  set(kmh: number): void;
}

const Speedometer = forwardRef<SpeedometerHandle, { className?: string }>(function Speedometer({ className = "" }, ref) {
  const needleRef = useRef<SVGGElement>(null);
  const speedRef = useRef<SVGTextElement>(null);
  const gearRef = useRef<SVGTextElement>(null);
  const neutralRef = useRef<SVGTextElement>(null);

  useImperativeHandle(ref, () => ({
    set(kmh: number) {
      const v = Math.min(Math.max(kmh, 0), SCALE_MAX);
      // the needle is drawn pointing straight up (−90°), so rotate it by (target angle + 90°)
      if (needleRef.current) needleRef.current.style.transform = `rotate(${(angleFor(v) + 90).toFixed(2)}deg)`;
      if (speedRef.current) speedRef.current.textContent = String(Math.round(v)).padStart(3, "0");
      const gear = gearFor(v);
      if (gearRef.current) gearRef.current.textContent = gear === 0 ? "N" : String(gear);
      if (neutralRef.current) neutralRef.current.style.opacity = gear === 0 ? "1" : "0.15";
    },
  }));

  const ticks = [];
  for (let v = 0; v <= SCALE_MAX; v += 5) {
    const major = v % 20 === 0;
    const mid = !major && v % 10 === 0;
    const [x1, y1] = at(v, major ? 89 : mid ? 92 : 95);
    const [x2, y2] = at(v, 99);
    ticks.push(
      <line
        key={v}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#f2f2ee"
        strokeWidth={major ? 2.4 : mid ? 1.5 : 0.9}
        strokeLinecap="round"
        opacity={major || mid ? 1 : 0.55}
      />,
    );
  }

  const numbers = [];
  for (let v = 20; v <= SCALE_MAX; v += 20) {
    const [x, y] = at(v, 76);
    numbers.push(
      <text
        key={v}
        x={x}
        y={y}
        transform={`rotate(${round2(angleFor(v) + 90)} ${x} ${y})`} // top of each number points outward, as on the dash
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="14"
        fontWeight="700"
        fill="#f4f4f0"
        className="font-display"
        style={{ letterSpacing: "0.02em" }}
      >
        {v}
      </text>,
    );
  }

  return (
    <svg viewBox="-110 -110 220 220" className={`block h-auto overflow-visible ${className}`} aria-hidden>
      <defs>
        <radialGradient id="dashFace" cx="50%" cy="45%" r="60%">
          <stop offset="0" stopColor="#1b1d23" />
          <stop offset="1" stopColor="#090a0d" />
        </radialGradient>
        <radialGradient id="dashLcd" cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#d6e6ef" />
          <stop offset="1" stopColor="#9db9ca" />
        </radialGradient>
      </defs>

      {/* bezel + dial face */}
      <circle r="106" fill="#050608" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
      <circle r="101" fill="url(#dashFace)" />

      {ticks}
      {numbers}

      {/* "km/h" at the start of the scale, where the dash prints it */}
      <text x="-44" y="70" textAnchor="middle" fontSize="6.5" fill="#cfcfca" fontWeight="600" className="font-mono">
        km/h
      </text>

      {/* neutral lamp, green, under the display */}
      <text ref={neutralRef} x="0" y="74" textAnchor="middle" fontSize="13" fontWeight="800" fill="#3ddc84" className="font-display" style={{ opacity: 1 }}>
        N
      </text>

      {/* the digital display */}
      <circle r="46" fill="url(#dashLcd)" stroke="#040507" strokeWidth="3" />
      <text x="-19" y="-24" textAnchor="middle" fontSize="6" fontWeight="700" fill="#0f2230" opacity="0.7" className="font-mono">
        ECO
      </text>
      <text x="9" y="-24" textAnchor="middle" fontSize="6" fontWeight="700" fill="#0f2230" opacity="0.7" className="font-mono">
        GEAR
      </text>
      <text ref={gearRef} x="27" y="-21" textAnchor="middle" fontSize="15" fontWeight="800" fill="#0f2230" className="font-mono">
        N
      </text>
      <text ref={speedRef} x="0" y="9" textAnchor="middle" fontSize="33" fontWeight="800" fill="#0f2230" className="font-mono">
        000
      </text>
      <text x="0" y="24" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0f2230" opacity="0.75" className="font-mono">
        km/h
      </text>

      {/* the needle: a red pointer running over the number ring; drawn pointing up, rotated into place */}
      <g ref={needleRef} style={{ transform: `rotate(${angleFor(0) + 90}deg)`, filter: "drop-shadow(0 0 3px rgba(255,46,77,0.7))" }}>
        <polygon points="-2.8,-52 2.8,-52 1.3,-91 -1.3,-91" fill="#ff2e4d" />
      </g>
    </svg>
  );
});

export default Speedometer;
