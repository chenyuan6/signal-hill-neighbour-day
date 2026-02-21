"use client";

import { PixelCharacterData } from "@/lib/types";

interface Props {
  character: PixelCharacterData;
  index: number;
}

export default function PixelCharacter({ character, index }: Props) {
  const delay = (index * 0.15) % 2;

  // VIP crown badge
  if (character.type === "vip") {
    return (
      <g
        transform={`translate(${character.x}, ${character.y})`}
        className="animate-pixel-bounce"
        style={{ animationDelay: `${delay}s` }}
      >
        <title>{character.name} (VIP)</title>
        {/* Crown */}
        <rect x="2" y="-6" width="2" height="2" fill="#FFD700" />
        <rect x="6" y="-6" width="2" height="2" fill="#FFD700" />
        <rect x="10" y="-6" width="2" height="2" fill="#FFD700" />
        <rect x="0" y="-4" width="14" height="4" fill="#FFD700" />
        {/* Head */}
        <rect x="3" y="0" width="8" height="8" fill={character.color} />
        {/* Eyes */}
        <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
        <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
        {/* Body */}
        <rect x="2" y="8" width="10" height="8" fill="#7C3AED" />
        {/* Legs */}
        <rect x="3" y="16" width="3" height="4" fill="#0F172A" />
        <rect x="8" y="16" width="3" height="4" fill="#0F172A" />
      </g>
    );
  }

  // RSVP characters wait with balloons
  if (character.type === "rsvp") {
    const balloonColors = ["#F87171", "#FBBF24", "#4ADE80", "#60A5FA", "#A78BFA"];
    const balloonColor = balloonColors[index % balloonColors.length];
    return (
      <g
        transform={`translate(${character.x}, ${character.y})`}
        style={{ animationDelay: `${delay}s` }}
      >
        <title>{character.name}</title>
        {/* Balloon string */}
        <line x1="7" y1="-2" x2="7" y2="-14" stroke="#94A3B8" strokeWidth="1" />
        {/* Balloon */}
        <ellipse
          cx="7"
          cy="-18"
          rx="5"
          ry="6"
          fill={balloonColor}
          className="animate-float-balloon"
          style={{ animationDelay: `${delay + 0.3}s` }}
        />
        {/* Head */}
        <rect x="3" y="0" width="8" height="8" fill={character.color} />
        {/* Eyes */}
        <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
        <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
        {/* Smile */}
        <rect x="5" y="5" width="4" height="1" fill="#0F172A" />
        {/* Body */}
        <rect x="2" y="8" width="10" height="6" fill={character.color} />
        {/* Legs */}
        <rect x="3" y="14" width="3" height="4" fill="#1E293B" />
        <rect x="8" y="14" width="3" height="4" fill="#1E293B" />
      </g>
    );
  }

  // Volunteer characters (blue with clipboard)
  if (character.type === "volunteer") {
    return (
      <g
        transform={`translate(${character.x}, ${character.y})`}
        className="animate-pixel-bounce"
        style={{ animationDelay: `${delay}s` }}
      >
        <title>{character.name}</title>
        {/* Head */}
        <rect x="3" y="0" width="8" height="8" fill="#FBBF24" />
        {/* Eyes */}
        <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
        <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
        {/* Body (blue vest) */}
        <rect x="2" y="8" width="10" height="8" fill={character.color} />
        {/* Clipboard */}
        <rect x="12" y="8" width="5" height="6" fill="#F0FDF4" />
        <rect x="13" y="9" width="3" height="1" fill="#94A3B8" />
        <rect x="13" y="11" width="3" height="1" fill="#94A3B8" />
        {/* Legs */}
        <rect x="3" y="16" width="3" height="4" fill="#1E293B" />
        <rect x="8" y="16" width="3" height="4" fill="#1E293B" />
      </g>
    );
  }

  // Vendor characters (pink with stall)
  return (
    <g
      transform={`translate(${character.x}, ${character.y})`}
      className="animate-pixel-wave"
      style={{ animationDelay: `${delay}s` }}
    >
      <title>{character.name}</title>
      {/* Head */}
      <rect x="3" y="0" width="8" height="8" fill="#FBBF24" />
      {/* Eyes */}
      <rect x="4" y="2" width="2" height="2" fill="#0F172A" />
      <rect x="8" y="2" width="2" height="2" fill="#0F172A" />
      {/* Body */}
      <rect x="2" y="8" width="10" height="8" fill={character.color} />
      {/* Apron */}
      <rect x="3" y="10" width="8" height="4" fill="#F0FDF4" />
      {/* Legs */}
      <rect x="3" y="16" width="3" height="4" fill="#1E293B" />
      <rect x="8" y="16" width="3" height="4" fill="#1E293B" />
    </g>
  );
}
