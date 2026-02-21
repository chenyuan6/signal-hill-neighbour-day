"use client";

import { MovingCharacter } from "@/lib/movement";

interface Props {
  char: MovingCharacter;
  index: number;
}

/**
 * RCT-style tiny pixel character with shadow, facing, walk animation,
 * and thought bubble support.
 */
export default function PixelCharacter({ char, index }: Props) {
  const isWalking = char.state === "walking";
  const flipX = char.facing === "left";

  // Leg offsets for 2-frame walk cycle
  const legL = isWalking && char.walkFrame === 0 ? { dx: -1, dy: -1 } : { dx: 0, dy: 0 };
  const legR = isWalking && char.walkFrame === 0 ? { dx: 1, dy: 1 } : { dx: 0, dy: 0 };

  // Translate + flip
  const transform = flipX
    ? `translate(${char.x + 14}, ${char.y}) scale(-1, 1)`
    : `translate(${char.x}, ${char.y})`;

  // Subtle idle bob
  const idleBob = !isWalking ? Math.sin(char.frameCounter * 0.08) * 1.2 : 0;

  // Thought bubble float offset
  const thoughtFloat = char.thought ? Math.sin(char.frameCounter * 0.1) * 1.5 : 0;

  return (
    <g transform={transform}>
      {/* Shadow ellipse (always on ground plane, not affected by bob) */}
      <ellipse
        cx="7"
        cy="20"
        rx="6"
        ry="2.5"
        fill="#000000"
        opacity="0.2"
      />

      <g transform={`translate(0, ${idleBob})`}>
        <title>{char.name} ({char.type})</title>

        {/* ---- VIP (gold + crown + purple body) ---- */}
        {char.type === "vip" && (
          <>
            <rect x="2" y="-6" width="2" height="2" fill="#FFD700" />
            <rect x="6" y="-6" width="2" height="2" fill="#FFD700" />
            <rect x="10" y="-6" width="2" height="2" fill="#FFD700" />
            <rect x="0" y="-4" width="14" height="4" fill="#FFD700" />
            <rect x="3" y="0" width="8" height="8" fill={char.color} />
            <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
            <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
            <rect x="5" y="5" width="4" height="1" fill="#B8860B" />
            <rect x="2" y="8" width="10" height="8" fill="#7C3AED" />
            {/* Sash */}
            <rect x="3" y="9" width="2" height="6" fill="#FFD700" opacity="0.6" />
            <rect x={3 + legL.dx} y={16 + legL.dy} width="3" height="4" fill="#1E293B" />
            <rect x={8 + legR.dx} y={16 + legR.dy} width="3" height="4" fill="#1E293B" />
            {/* Shoes */}
            <rect x={2 + legL.dx} y={19 + legL.dy} width="4" height="2" fill="#4A2500" />
            <rect x={8 + legR.dx} y={19 + legR.dy} width="4" height="2" fill="#4A2500" />
          </>
        )}

        {/* ---- RSVP (green with balloon) ---- */}
        {char.type === "rsvp" && (() => {
          const balloonColors = ["#F87171", "#FBBF24", "#4ADE80", "#60A5FA", "#A78BFA"];
          const balloonColor = balloonColors[index % balloonColors.length];
          const balloonSway = Math.sin(char.frameCounter * 0.06 + index) * 2;
          return (
            <>
              <line x1="7" y1="-2" x2={7 + balloonSway * 0.5} y2="-14" stroke="#94A3B8" strokeWidth="1" />
              <ellipse cx={7 + balloonSway} cy="-18" rx="5" ry="6" fill={balloonColor} opacity="0.9" />
              {/* Balloon highlight */}
              <ellipse cx={5.5 + balloonSway} cy="-20" rx="2" ry="2.5" fill="#FFFFFF" opacity="0.3" />
              <rect x="3" y="0" width="8" height="8" fill={char.color} />
              <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
              <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
              <rect x="5" y="5" width="4" height="1" fill="#0F172A" />
              <rect x="2" y="8" width="10" height="6" fill={char.color} />
              {/* Shirt detail */}
              <rect x="5" y="9" width="4" height="1" fill="#F0FDF4" opacity="0.4" />
              <rect x={3 + legL.dx} y={14 + legL.dy} width="3" height="4" fill="#1E293B" />
              <rect x={8 + legR.dx} y={14 + legR.dy} width="3" height="4" fill="#1E293B" />
              <rect x={2 + legL.dx} y={17 + legL.dy} width="4" height="2" fill="#4A2500" />
              <rect x={8 + legR.dx} y={17 + legR.dy} width="4" height="2" fill="#4A2500" />
            </>
          );
        })()}

        {/* ---- Volunteer (blue vest + clipboard) ---- */}
        {char.type === "volunteer" && (
          <>
            {/* Hard hat */}
            <rect x="2" y="-2" width="10" height="3" fill="#FBBF24" rx="1" />
            <rect x="3" y="0" width="8" height="8" fill="#FBBF24" />
            <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
            <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
            <rect x="6" y="5" width="2" height="1" fill="#0F172A" />
            <rect x="2" y="8" width="10" height="8" fill={char.color} />
            {/* Vest V */}
            <rect x="5" y="8" width="4" height="2" fill="#3B82F6" />
            {/* Clipboard */}
            <rect x="12" y="8" width="5" height="6" fill="#F0FDF4" />
            <rect x="13" y="7" width="3" height="2" fill="#92400E" />
            <rect x="13" y="9" width="3" height="1" fill="#94A3B8" />
            <rect x="13" y="11" width="3" height="1" fill="#94A3B8" />
            <rect x={3 + legL.dx} y={16 + legL.dy} width="3" height="4" fill="#1E293B" />
            <rect x={8 + legR.dx} y={16 + legR.dy} width="3" height="4" fill="#1E293B" />
            <rect x={2 + legL.dx} y={19 + legL.dy} width="4" height="2" fill="#4A2500" />
            <rect x={8 + legR.dx} y={19 + legR.dy} width="4" height="2" fill="#4A2500" />
          </>
        )}

        {/* ---- Vendor (pink with apron + chef hat) ---- */}
        {char.type === "vendor" && (
          <>
            {/* Chef hat */}
            <rect x="3" y="-4" width="8" height="5" fill="#F0FDF4" />
            <rect x="4" y="-6" width="6" height="3" fill="#F0FDF4" />
            <rect x="3" y="0" width="8" height="8" fill="#FBBF24" />
            <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
            <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
            <rect x="5" y="5" width="4" height="1" fill="#0F172A" />
            <rect x="2" y="8" width="10" height="8" fill={char.color} />
            {/* Apron */}
            <rect x="3" y="10" width="8" height="5" fill="#F0FDF4" />
            <rect x="6" y="10" width="2" height="1" fill="#94A3B8" />
            <rect x={3 + legL.dx} y={16 + legL.dy} width="3" height="4" fill="#1E293B" />
            <rect x={8 + legR.dx} y={16 + legR.dy} width="3" height="4" fill="#1E293B" />
            <rect x={2 + legL.dx} y={19 + legL.dy} width="4" height="2" fill="#4A2500" />
            <rect x={8 + legR.dx} y={19 + legR.dy} width="4" height="2" fill="#4A2500" />
          </>
        )}
      </g>

      {/* Thought bubble (rendered above character, not affected by bob) */}
      {char.thought && (
        <g
          transform={`translate(${flipX ? -16 : 16}, ${-20 + thoughtFloat})`}
          opacity={char.thoughtTimer < 10 ? char.thoughtTimer / 10 : 1}
        >
          {/* Bubble */}
          <rect x="-8" y="-10" width="16" height="14" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.5" />
          {/* Tail dots */}
          <circle cx={flipX ? 5 : -5} cy="6" r="1.5" fill="#FFFFFF" />
          <circle cx={flipX ? 3 : -3} cy="8" r="1" fill="#FFFFFF" />
          {/* Emoji */}
          <text x="0" y="1" textAnchor="middle" fontSize="8">
            {char.thought}
          </text>
        </g>
      )}
    </g>
  );
}
