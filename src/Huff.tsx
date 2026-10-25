import { useEffect, useState } from "react";
import type { Expression, Gaze } from "./script";

// Huff: a friendly but clearly robotic face on a screen, so it reads as a machine.
// Every expression is fixed, and both conditions use exactly the same ones.

type Props = { expr: Expression; gaze: Gaze | "left" | "right"; speaking: boolean; waving: boolean };

const EYE_L = { x: 115, y: 138 };
const EYE_R = { x: 185, y: 138 };

const OPEN: Record<Expression, number> = { neutral: 1, happy: 0.72, attentive: 1.1, thinking: 0.9, regret: 0.68 };

const GAZE: Record<Gaze | "up" | "left" | "right", [number, number]> = {
  user: [0, 0], card: [13, -1], left: [-13, 1], right: [13, 1], down: [0, 11], up: [9, -9],
};

// Brows as [outerY, innerY] above each eye
const BROWS: Record<Expression, { l: [number, number]; r: [number, number] }> = {
  neutral: { l: [106, 106], r: [106, 106] },
  happy: { l: [102, 99], r: [102, 99] },
  attentive: { l: [99, 98], r: [99, 98] },
  thinking: { l: [106, 107], r: [95, 99] },
  regret: { l: [108, 97], r: [108, 97] },
};

const MOUTH: Record<Expression, string> = {
  neutral: "M128 182 Q150 189 172 182",
  happy: "M124 177 Q150 199 176 177",
  attentive: "M134 182 Q150 187 166 182",
  thinking: "M137 185 Q150 184 163 180",
  regret: "M130 189 Q150 176 170 189",
};

const TILT: Record<Expression, string> = {
  neutral: "rotate(0deg) translateY(0px)",
  happy: "rotate(0deg) translateY(-2px)",
  attentive: "rotate(-3deg) translateY(0px)",
  thinking: "rotate(4deg) translateY(0px)",
  regret: "rotate(0deg) translateY(5px)",
};

function brow(eye: { x: number }, side: "l" | "r", [outer, inner]: [number, number]) {
  const ox = side === "l" ? eye.x - 19 : eye.x + 19;
  const ix = side === "l" ? eye.x + 17 : eye.x - 17;
  const cy = Math.min(outer, inner) - 4;
  return `M${ox} ${outer} Q${eye.x} ${cy} ${ix} ${inner}`;
}

export default function Huff({ expr, gaze, speaking, waving }: Props) {
  const [blink, setBlink] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(0);

  // Natural, slightly irregular blinking
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 130);
        loop();
      }, 2400 + Math.random() * 3200);
    };
    loop();
    return () => clearTimeout(t);
  }, []);

  // Mouth movement while speaking
  useEffect(() => {
    if (!speaking) {
      setMouthOpen(0);
      return;
    }
    const i = setInterval(() => setMouthOpen(0.25 + Math.random() * 0.75), 110);
    return () => clearInterval(i);
  }, [speaking]);

  const g = expr === "thinking" && gaze === "user" ? GAZE.up : GAZE[gaze];
  const open = blink ? 0.08 : OPEN[expr];
  const b = BROWS[expr];
  const hx = g[0] > 0 ? 5 : g[0] < 0 ? -5 : 3; // eye highlight follows the gaze
  const eyeStyle = (eye: { x: number; y: number }): React.CSSProperties => ({
    transform: `translate(${g[0]}px, ${g[1]}px) scaleY(${open})`,
    transformOrigin: `${eye.x}px ${eye.y}px`,
    transition: blink ? "transform 60ms linear" : "transform 280ms ease",
  });
  const pathStyle = (d: string): React.CSSProperties => ({ d: `path("${d}")`, transition: "d 300ms ease" } as React.CSSProperties);

  return (
    <svg viewBox="0 0 300 330" className="huff" role="img" aria-label={`Huff, looking ${expr}`}>
      {/* body */}
      <rect x={128} y={232} width={44} height={22} fill="#262626" />
      <rect x={70} y={250} width={160} height={74} rx={30} fill="#1E4DB7" />
      <rect x={124} y={272} width={52} height={20} rx={6} fill="#4FB3D9" />
      <circle cx={136} cy={282} r={4} fill="#262626" />
      <circle cx={150} cy={282} r={4} fill="#262626" />
      <circle cx={164} cy={282} r={4} fill="#262626" />
      {/* head */}
      <g style={{ transform: TILT[expr], transformOrigin: "150px 150px", transition: "transform 400ms ease" }}>
        <line x1={150} y1={56} x2={150} y2={26} stroke="#262626" strokeWidth={4} />
        <circle cx={150} cy={22} r={10} fill="#E85A2A" className={expr === "thinking" ? "antenna thinking" : "antenna"} />
        <rect x={26} y={118} width={22} height={50} rx={8} fill="#1E4DB7" />
        <rect x={252} y={118} width={22} height={50} rx={8} fill="#1E4DB7" />
        <rect x={42} y={54} width={216} height={180} rx={46} fill="#F2EFE8" stroke="#262626" strokeWidth={4} />
        <rect x={64} y={78} width={172} height={132} rx={32} fill="#262626" />

        {/* brows */}
        <path d={brow(EYE_L, "l", b.l)} style={pathStyle(brow(EYE_L, "l", b.l))} stroke="#4FB3D9" strokeWidth={6} strokeLinecap="round" fill="none" />
        <path d={brow(EYE_R, "r", b.r)} style={pathStyle(brow(EYE_R, "r", b.r))} stroke="#4FB3D9" strokeWidth={6} strokeLinecap="round" fill="none" />

        {/* eyes */}
        <g style={eyeStyle(EYE_L)}>
          <ellipse cx={EYE_L.x} cy={EYE_L.y} rx={14} ry={19} fill="#4FB3D9" />
          <circle cx={EYE_L.x + hx} cy={EYE_L.y - 7} r={4} fill="#E4F4FB" />
        </g>
        <g style={eyeStyle(EYE_R)}>
          <ellipse cx={EYE_R.x} cy={EYE_R.y} rx={14} ry={19} fill="#4FB3D9" />
          <circle cx={EYE_R.x + hx} cy={EYE_R.y - 7} r={4} fill="#E4F4FB" />
        </g>

        {/* mouth: shaped by expression, opens and closes while speaking */}
        {speaking ? (
          <ellipse cx={150} cy={184} rx={15} ry={2.5 + mouthOpen * 8} fill="#4FB3D9" />
        ) : (
          <path d={MOUTH[expr]} style={pathStyle(MOUTH[expr])} stroke="#4FB3D9" strokeWidth={6} strokeLinecap="round" fill="none" />
        )}
      </g>
      {/* waving arm: drawn after the head so the hand is always in front, raised beside the head */}
      <g className={waving ? "arm waving" : "arm"} style={{ transformOrigin: "214px 272px" }}>
        <line x1={214} y1={272} x2={268} y2={236} stroke="#1E4DB7" strokeWidth={18} strokeLinecap="round" />
        <circle cx={276} cy={226} r={15} fill="#F2EFE8" stroke="#262626" strokeWidth={3} />
      </g>
    </svg>
  );
}
