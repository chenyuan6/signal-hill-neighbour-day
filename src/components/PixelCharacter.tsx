"use client";

import { MovingCharacter } from "@/lib/movement";

interface Props {
  char: MovingCharacter;
  index: number;
}

/**
 * RCT-style tiny pixel character.
 * Supports facing direction (left/right flip) and walk-frame leg animation.
 */
export default function PixelCharacter({ char, index }: Props) {
  const isWalking = char.state === "walking";
  const flipX = char.facing === "left";

  // Leg offsets for 2-frame walk cycle
  const legL = isWalking && char.walkFrame === 0 ? { dx: -1, dy: -1 } : { dx: 0, dy: 0 };
  const legR = isWalking && char.walkFrame === 0 ? { dx: 1, dy: 1 } : { dx: 0, dy: 0 };

  // Character is drawn at origin, then translated to world position
  // flipX mirrors the character around its center (x=7)
  const transform = flipX
    ? `translate(${char.x + 14}, ${char.y}) scale(-1, 1)`
    : `translate(${char.x}, ${char.y})`;

  // Subtle idle bob via y offset
  const idleBob = !isWalking ? Math.sin(char.frameCounter * 0.08) * 1.2 : 0;

  // VIP character (gold + crown + purple body)
  if (char.type === "vip") {
    return (
      <g transform={transform}>
        <g transform={`translate(0, ${idleBob})`}>
          <title>{char.name} (VIP)</title>
          {/* Crown */}
          <rect x="2" y="-6" width="2" height="2" fill="#FFD700" />
          <rect x="6" y="-6" width="2" height="2" fill="#FFD700" />
          <rect x="10" y="-6" width="2" height="2" fill="#FFD700" />
          <rect x="0" y="-4" width="14" height="4" fill="#FFD700" />
          {/* Head */}
          <rect x="3" y="0" width="8" height="8" fill={char.color} />
          {/* Eyes */}
          <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
          <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
          {/* Body */}
          <rect x="2" y="8" width="10" height="8" fill="#7C3AED" />
          {/* Legs with walk animation */}
          <rect x={3 + legL.dx} y={16 + legL.dy} width="3" height="4" fill="#0F172A" />
          <rect x={8 + legR.dx} y={16 + legR.dy} width="3" height="4" fill="#0F172A" />
        </g>
      </g>
    );
  }

  // RSVP character (green with balloon)
  if (char.type === "rsvp") {
    const balloonColors = ["#F87171", "#FBBF24", "#4ADE80", "#60A5FA", "#A78BFA"];
    const balloonColor = balloonColors[index % balloonColors.length];
    const balloonSway = Math.sin(char.frameCounter * 0.06 + index) * 2;
    return (
      <g transform={transform}>
        <g transform={`translate(0, ${idleBob})`}>
          <title>{char.name}</title>
          {/* Balloon string */}
          <line x1="7" y1="-2" x2={7 + balloonSway * 0.5} y2="-14" stroke="#94A3B8" strokeWidth="1" />
          {/* Balloon */}
          <ellipse
            cx={7 + balloonSway}
            cy="-18"
            rx="5"
            ry="6"
            fill={balloonColor}
            opacity="0.9"
          />
          {/* Head */}
          <rect x="3" y="0" width="8" height="8" fill={char.color} />
          {/* Eyes */}
          <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
          <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
          {/* Smile */}
          <rect x="5" y="5" width="4" height="1" fill="#0F172A" />
          {/* Body */}
          <rect x="2" y="8" width="10" height="6" fill={char.color} />
          {/* Legs */}
          <rect x={3 + legL.dx} y={14 + legL.dy} width="3" height="4" fill="#1E293B" />
          <rect x={8 + legR.dx} y={14 + legR.dy} width="3" height="4" fill="#1E293B" />
        </g>
      </g>
    );
  }

  // Volunteer character (blue with clipboard)
  if (char.type === "volunteer") {
    return (
      <g transform={transform}>
        <g transform={`translate(0, ${idleBob})`}>
          <title>{char.name}</title>
          {/* Head */}
          <rect x="3" y="0" width="8" height="8" fill="#FBBF24" />
          {/* Eyes */}
          <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
          <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
          {/* Body (blue vest) */}
          <rect x="2" y="8" width="10" height="8" fill={char.color} />
          {/* Clipboard */}
          <rect x="12" y="8" width="5" height="6" fill="#F0FDF4" />
          <rect x="13" y="9" width="3" height="1" fill="#94A3B8" />
          <rect x="13" y="11" width="3" height="1" fill="#94A3B8" />
          {/* Legs */}
          <rect x={3 + legL.dx} y={16 + legL.dy} width="3" height="4" fill="#1E293B" />
          <rect x={8 + legR.dx} y={16 + legR.dy} width="3" height="4" fill="#1E293B" />
        </g>
      </g>
    );
  }

  // Vendor character (pink with apron)
  return (
    <g transform={transform}>
      <g transform={`translate(0, ${idleBob})`}>
        <title>{char.name}</title>
        {/* Head */}
        <rect x="3" y="0" width="8" height="8" fill="#FBBF24" />
        {/* Eyes */}
        <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
        <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
        {/* Body */}
        <rect x="2" y="8" width="10" height="8" fill={char.color} />
        {/* Apron */}
        <rect x="3" y="10" width="8" height="4" fill="#F0FDF4" />
        {/* Legs */}
        <rect x={3 + legL.dx} y={16 + legL.dy} width="3" height="4" fill="#1E293B" />
        <rect x={8 + legR.dx} y={16 + legR.dy} width="3" height="4" fill="#1E293B" />
      </g>
    </g>
  );
}
