"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapZone } from "@/lib/types";
import { getCharacters } from "@/lib/store";
import {
  MovingCharacter,
  initMovingCharacter,
  spawnAtEntrance,
  tickCharacters,
} from "@/lib/movement";
import PixelCharacter from "./PixelCharacter";

// ─── Zone definitions ───────────────────────────────────────────
const ZONES: MapZone[] = [
  { id: "bouncy", label: "Bouncy Castles", icon: "", x: 55, y: 80, width: 105, height: 70, color: "#DC2626", description: "Inflatable fun for kids of all ages!" },
  { id: "facepainting", label: "Face Painting", icon: "", x: 175, y: 80, width: 85, height: 65, color: "#9333EA", description: "Get your face painted by local artists" },
  { id: "petting", label: "Petting Zoo", icon: "", x: 55, y: 170, width: 95, height: 70, color: "#CA8A04", description: "Meet friendly farm animals" },
  { id: "food", label: "Food Vendors", icon: "", x: 165, y: 165, width: 115, height: 75, color: "#EA580C", description: "Local food trucks and BBQ" },
  { id: "games", label: "Yard Games", icon: "", x: 295, y: 80, width: 95, height: 70, color: "#16A34A", description: "Cornhole, ladder toss, and more" },
  { id: "stage", label: "Music Stage", icon: "", x: 295, y: 170, width: 105, height: 70, color: "#0891B2", description: "Live music all day long" },
  { id: "info", label: "SHCA Info", icon: "", x: 415, y: 80, width: 85, height: 60, color: "#2563EB", description: "Community info & membership signup" },
  { id: "sponsors", label: "Sponsors", icon: "", x: 415, y: 160, width: 85, height: 70, color: "#DB2777", description: "Meet our amazing community sponsors" },
];

const TICK_MS = 33;
const POLL_MS = 8000;

// ─── Isometric 3D block: top face + right face + front face ─────
function IsoBlock({ x, y, w, h, depth, topColor, frontColor, sideColor, rx }: {
  x: number; y: number; w: number; h: number; depth: number;
  topColor: string; frontColor: string; sideColor: string; rx?: number;
}) {
  const r = rx ?? 0;
  return (
    <g>
      {/* Shadow */}
      <rect x={x + 3} y={y + 3} width={w} height={h} rx={r} fill="#000" opacity="0.12" />
      {/* Right side face */}
      <polygon
        points={`${x + w},${y + h} ${x + w + depth},${y + h - depth * 0.6} ${x + w + depth},${y - depth * 0.6} ${x + w},${y}`}
        fill={sideColor}
      />
      {/* Front face */}
      <rect x={x} y={y} width={w} height={h} rx={r} fill={frontColor} />
      {/* Top face */}
      <polygon
        points={`${x},${y} ${x + depth},${y - depth * 0.6} ${x + w + depth},${y - depth * 0.6} ${x + w},${y}`}
        fill={topColor}
      />
    </g>
  );
}

// ─── Isometric tent/canopy ──────────────────────────────────────
function IsoTent({ x, y, w, h, color, stripeColor }: {
  x: number; y: number; w: number; h: number; color: string; stripeColor: string;
}) {
  const peakY = y - 14;
  const midX = x + w / 2;
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={x + w / 2 + 4} cy={y + h + 2} rx={w / 2 + 2} ry={4} fill="#000" opacity="0.1" />
      {/* Tent poles */}
      <rect x={x + 4} y={y} width="2" height={h} fill="#8B7355" />
      <rect x={x + w - 6} y={y} width="2" height={h} fill="#8B7355" />
      {/* Canopy front */}
      <polygon points={`${x - 2},${y + 4} ${midX},${peakY} ${x + w + 2},${y + 4}`} fill={color} />
      {/* Canopy stripes */}
      <polygon points={`${x + w * 0.15},${y + 1} ${midX},${peakY} ${x + w * 0.35},${y + 1}`} fill={stripeColor} />
      <polygon points={`${x + w * 0.5},${y + 0.5} ${midX},${peakY} ${x + w * 0.7},${y + 0.5}`} fill={stripeColor} />
      {/* Scalloped edge */}
      {Array.from({ length: Math.floor(w / 8) }).map((_, i) => (
        <circle key={`sc-${i}`} cx={x + 4 + i * 8} cy={y + 5} r="3" fill={i % 2 === 0 ? color : stripeColor} />
      ))}
    </g>
  );
}

// ─── Isometric tree (RCT style: round, layered) ────────────────
function RCTTree({ x, y, size }: { x: number; y: number; size?: number }) {
  const s = size ?? 1;
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={x + 3} cy={y + 16 * s} rx={7 * s} ry={3 * s} fill="#000" opacity="0.1" />
      {/* Trunk */}
      <rect x={x} y={y + 4 * s} width={4 * s} height={10 * s} fill="#6B4226" />
      {/* Canopy layers (bottom to top, larger to smaller) */}
      <circle cx={x + 2 * s} cy={y + 2 * s} r={9 * s} fill="#2D5016" />
      <circle cx={x + 2 * s} cy={y - 2 * s} r={7 * s} fill="#3A6B1E" />
      <circle cx={x + 2 * s} cy={y - 5 * s} r={5 * s} fill="#4A7C28" />
      {/* Highlight */}
      <circle cx={x} cy={y - 4 * s} r={3 * s} fill="#5A8C32" opacity="0.6" />
    </g>
  );
}

// ─── Zone-specific isometric structures (NO emojis) ─────────────
function ZoneStructure({ id, x, y, w, h }: { id: string; x: number; y: number; w: number; h: number }) {
  switch (id) {
    case "bouncy":
      return (
        <g>
          {/* Ground pad */}
          <IsoBlock x={x + 5} y={y + 20} w={w - 15} h={h - 28} depth={6} topColor="#E8D5B0" frontColor="#D4C4A0" sideColor="#BBA880" />
          {/* Main bouncy castle */}
          <IsoBlock x={x + 12} y={y + 8} w={40} h={35} depth={5} topColor="#EF4444" frontColor="#DC2626" sideColor="#B91C1C" rx={3} />
          {/* Turrets */}
          <IsoBlock x={x + 12} y={y + 2} w={8} h={10} depth={3} topColor="#F87171" frontColor="#EF4444" sideColor="#DC2626" />
          <IsoBlock x={x + 42} y={y + 2} w={8} h={10} depth={3} topColor="#F87171" frontColor="#EF4444" sideColor="#DC2626" />
          {/* Center turret */}
          <IsoBlock x={x + 26} y={y - 2} w={10} h={12} depth={3} topColor="#FCA5A5" frontColor="#F87171" sideColor="#EF4444" />
          {/* Flag on top */}
          <rect x={x + 30} y={y - 12} width="1" height="10" fill="#475569" />
          <polygon points={`${x + 31},${y - 12} ${x + 38},${y - 10} ${x + 31},${y - 7}`} fill="#FBBF24" />
          {/* Entrance hole */}
          <rect x={x + 27} y={y + 30} width="10" height="12" rx="5" fill="#7F1D1D" />
          {/* Second smaller bouncy (purple) */}
          <IsoBlock x={x + 62} y={y + 18} w={28} h={25} depth={4} topColor="#A78BFA" frontColor="#8B5CF6" sideColor="#7C3AED" rx={3} />
          <IsoBlock x={x + 63} y={y + 12} w={7} h={8} depth={2} topColor="#C4B5FD" frontColor="#A78BFA" sideColor="#8B5CF6" />
          <IsoBlock x={x + 82} y={y + 12} w={7} h={8} depth={2} topColor="#C4B5FD" frontColor="#A78BFA" sideColor="#8B5CF6" />
        </g>
      );
    case "facepainting":
      return (
        <g>
          {/* Tent canopy */}
          <IsoTent x={x + 5} y={y + 5} w={w - 12} h={h - 12} color="#9333EA" stripeColor="#A855F7" />
          {/* Easel */}
          <IsoBlock x={x + 12} y={y + 20} w={14} h={22} depth={2} topColor="#FFF" frontColor="#F0F0F0" sideColor="#DDD" />
          {/* Paint splotches on canvas */}
          <circle cx={x + 16} cy={y + 26} r="3" fill="#EF4444" />
          <circle cx={x + 22} cy={y + 30} r="2.5" fill="#3B82F6" />
          <circle cx={x + 18} cy={y + 34} r="2" fill="#FBBF24" />
          {/* Chair */}
          <IsoBlock x={x + 35} y={y + 30} w={10} h={8} depth={2} topColor="#92400E" frontColor="#78350F" sideColor="#5C2D0E" />
          {/* Paint table */}
          <IsoBlock x={x + 52} y={y + 25} w={18} h={10} depth={3} topColor="#D4A574" frontColor="#B8906A" sideColor="#9C7A5A" />
          {/* Paint pots on table */}
          <circle cx={x + 56} cy={y + 27} r="2" fill="#EF4444" />
          <circle cx={x + 61} cy={y + 27} r="2" fill="#3B82F6" />
          <circle cx={x + 66} cy={y + 27} r="2" fill="#22C55E" />
        </g>
      );
    case "petting":
      return (
        <g>
          {/* Fence enclosure */}
          <rect x={x + 3} y={y + 3} width={w - 8} height={h - 8} rx="2" fill="none" stroke="#8B6914" strokeWidth="2" />
          {/* Fence posts */}
          {Array.from({ length: Math.floor((w - 8) / 10) }).map((_, i) => (
            <rect key={`pp-${i}`} x={x + 5 + i * 10} y={y + 1} width="3" height="6" fill="#8B6914" />
          ))}
          {/* Hay bales */}
          <IsoBlock x={x + 8} y={y + 45} w={16} h={10} depth={3} topColor="#EAB308" frontColor="#CA8A04" sideColor="#A16207" rx={2} />
          <IsoBlock x={x + 60} y={y + 40} w={14} h={9} depth={3} topColor="#EAB308" frontColor="#CA8A04" sideColor="#A16207" rx={2} />
          {/* Water trough */}
          <IsoBlock x={x + 35} y={y + 48} w={18} h={6} depth={2} topColor="#60A5FA" frontColor="#475569" sideColor="#334155" />
          {/* Sheep body */}
          <ellipse cx={x + 30} cy={y + 30} rx="7" ry="5" fill="#F0F0F0" />
          <circle cx={x + 24} cy={y + 28} r="4" fill="#E5E5E5" />
          <rect x={x + 22} y={y + 26} width="2" height="2" fill="#111" />
          <rect x={x + 26} y={y + 33} width="2" height="5" fill="#333" />
          <rect x={x + 32} y={y + 33} width="2" height="5" fill="#333" />
          {/* Goat */}
          <ellipse cx={x + 60} cy={y + 28} rx="6" ry="4" fill="#D4A574" />
          <circle cx={x + 55} cy={y + 26} r="3.5" fill="#C4956A" />
          <rect x={x + 54} y={y + 22} width="1" height="4" fill="#8B6914" />
          <rect x={x + 57} y={y + 22} width="1" height="4" fill="#8B6914" />
          <rect x={x + 56} y={y + 30} width="2" height="5" fill="#333" />
          <rect x={x + 62} y={y + 30} width="2" height="5" fill="#333" />
          {/* Small sign */}
          <rect x={x + 5} y={y + 8} width="2" height="14" fill="#6B4226" />
          <IsoBlock x={x + 0} y={y + 6} w={16} h={10} depth={1} topColor="#FFF8E7" frontColor="#F5ECD0" sideColor="#E8DDB8" />
          <text x={x + 8} y={y + 14} textAnchor="middle" fill="#6B4226" fontSize="4" fontFamily="monospace">ZOO</text>
        </g>
      );
    case "food":
      return (
        <g>
          {/* Food truck (3D block) */}
          <IsoBlock x={x + 45} y={y + 5} w={50} h={30} depth={7} topColor="#F8F8F8" frontColor="#F0F0F0" sideColor="#D0D0D0" rx={3} />
          {/* Truck awning */}
          <IsoBlock x={x + 42} y={y + 5} w={56} h={5} depth={7} topColor="#EA580C" frontColor="#DC2626" sideColor="#B91C1C" rx={2} />
          {/* Serving window */}
          <rect x={x + 50} y={y + 14} width={36} height={14} rx="1" fill="#1E3A5F" />
          <rect x={x + 52} y={y + 16} width={32} height={10} rx="1" fill="#0C4A6E" />
          {/* Counter */}
          <IsoBlock x={x + 48} y={y + 30} w={42} h={4} depth={5} topColor="#8B6914" frontColor="#6B4226" sideColor="#5C2D0E" />
          {/* BBQ grill */}
          <IsoBlock x={x + 5} y={y + 15} w={24} h={18} depth={4} topColor="#444" frontColor="#333" sideColor="#222" rx={2} />
          {/* Grill grates (red hot) */}
          <rect x={x + 8} y={y + 18} width="18" height="1.5" fill="#EF4444" opacity="0.8" />
          <rect x={x + 8} y={y + 22} width="18" height="1.5" fill="#EF4444" opacity="0.7" />
          <rect x={x + 8} y={y + 26} width="18" height="1.5" fill="#EF4444" opacity="0.6" />
          {/* Smoke */}
          <circle cx={x + 17} cy={y + 10} r="4" fill="#94A3B8" opacity="0.2" />
          <circle cx={x + 22} cy={y + 6} r="3" fill="#94A3B8" opacity="0.15" />
          <circle cx={x + 15} cy={y + 3} r="2.5" fill="#94A3B8" opacity="0.1" />
          {/* Picnic tables */}
          <IsoBlock x={x + 10} y={y + 48} w={22} h={8} depth={3} topColor="#A0714D" frontColor="#8B6226" sideColor="#6B4226" />
          <IsoBlock x={x + 50} y={y + 48} w={22} h={8} depth={3} topColor="#A0714D" frontColor="#8B6226" sideColor="#6B4226" />
          {/* Table benches */}
          <rect x={x + 8} y={y + 52} width="3" height="10" fill="#5C2D0E" />
          <rect x={x + 31} y={y + 52} width="3" height="10" fill="#5C2D0E" />
          <rect x={x + 48} y={y + 52} width="3" height="10" fill="#5C2D0E" />
          <rect x={x + 71} y={y + 52} width="3" height="10" fill="#5C2D0E" />
        </g>
      );
    case "games":
      return (
        <g>
          {/* Tent canopy */}
          <IsoTent x={x + 2} y={y + 2} w={w - 6} h={h - 8} color="#16A34A" stripeColor="#22C55E" />
          {/* Cornhole board 1 */}
          <IsoBlock x={x + 10} y={y + 22} w={16} h={26} depth={2} topColor="#B8906A" frontColor="#9C7A5A" sideColor="#806040" />
          <circle cx={x + 18} cy={y + 38} r="3" fill="#3D2000" />
          {/* Cornhole board 2 */}
          <IsoBlock x={x + 55} y={y + 22} w={16} h={26} depth={2} topColor="#B8906A" frontColor="#9C7A5A" sideColor="#806040" />
          <circle cx={x + 63} cy={y + 38} r="3" fill="#3D2000" />
          {/* Bean bags */}
          <rect x={x + 32} y={y + 40} width="5" height="5" rx="1" fill="#EF4444" />
          <rect x={x + 38} y={y + 42} width="5" height="5" rx="1" fill="#3B82F6" />
          <rect x={x + 35} y={y + 47} width="5" height="5" rx="1" fill="#FBBF24" />
          {/* Ring toss poles */}
          <rect x={x + 78} y={y + 18} width="2" height="25" fill="#475569" />
          <circle cx={x + 79} cy={y + 18} r="5" fill="none" stroke="#EF4444" strokeWidth="2" />
          <circle cx={x + 79} cy={y + 24} r="6" fill="none" stroke="#22C55E" strokeWidth="2" />
        </g>
      );
    case "stage":
      return (
        <g>
          {/* Stage platform (raised) */}
          <IsoBlock x={x + 8} y={y + 20} w={80} h={35} depth={10} topColor="#1E293B" frontColor="#0F172A" sideColor="#0A0F1A" rx={2} />
          {/* Stage floor */}
          <rect x={x + 10} y={y + 22} width="76" height="6" fill="#334155" />
          {/* Truss/lighting bar */}
          <rect x={x + 12} y={y + 5} width="2" height="20" fill="#64748B" />
          <rect x={x + 84} y={y + 5} width="2" height="20" fill="#64748B" />
          <rect x={x + 10} y={y + 3} width="78" height="4" fill="#475569" />
          {/* Stage lights */}
          <circle cx={x + 25} cy={y + 6} r="3.5" fill="#FBBF24" opacity="0.8" />
          <circle cx={x + 25} cy={y + 6} r="6" fill="#FBBF24" opacity="0.15" />
          <circle cx={x + 50} cy={y + 6} r="3.5" fill="#EF4444" opacity="0.8" />
          <circle cx={x + 50} cy={y + 6} r="6" fill="#EF4444" opacity="0.15" />
          <circle cx={x + 75} cy={y + 6} r="3.5" fill="#3B82F6" opacity="0.8" />
          <circle cx={x + 75} cy={y + 6} r="6" fill="#3B82F6" opacity="0.15" />
          {/* Speakers */}
          <IsoBlock x={x + 15} y={y + 30} w={14} h={18} depth={3} topColor="#222" frontColor="#111" sideColor="#000" />
          <circle cx={x + 22} cy={y + 39} r="5" fill="#1E293B" />
          <circle cx={x + 22} cy={y + 39} r="2" fill="#334155" />
          <IsoBlock x={x + 68} y={y + 30} w={14} h={18} depth={3} topColor="#222" frontColor="#111" sideColor="#000" />
          <circle cx={x + 75} cy={y + 39} r="5" fill="#1E293B" />
          <circle cx={x + 75} cy={y + 39} r="2" fill="#334155" />
          {/* Mic stand */}
          <rect x={x + 47} y={y + 28} width="2" height="22" fill="#94A3B8" />
          <circle cx={x + 48} cy={y + 27} r="3.5" fill="#475569" />
        </g>
      );
    case "info":
      return (
        <g>
          {/* Info booth building */}
          <IsoBlock x={x + 5} y={y + 12} w={65} h={35} depth={8} topColor="#2563EB" frontColor="#1D4ED8" sideColor="#1E40AF" rx={2} />
          {/* Roof */}
          <IsoBlock x={x + 2} y={y + 10} w={71} h={5} depth={8} topColor="#1E40AF" frontColor="#1E3A8A" sideColor="#172554" />
          {/* Window */}
          <rect x={x + 15} y={y + 22} width="40" height="16" rx="1" fill="#BFDBFE" />
          <rect x={x + 16} y={y + 23} width="38" height="14" rx="1" fill="#93C5FD" />
          <line x1={x + 35} y1={y + 22} x2={x + 35} y2={y + 38} stroke="#1D4ED8" strokeWidth="1" />
          {/* Banner */}
          <rect x={x + 15} y={y + 3} width="40" height="10" fill="#F8FAFC" rx="1" />
          <text x={x + 35} y={y + 10.5} textAnchor="middle" fill="#1D4ED8" fontSize="5" fontFamily="monospace" fontWeight="bold">SHCA</text>
          {/* Door */}
          <rect x={x + 28} y={y + 34} width="14" height="12" rx="1" fill="#1E3A8A" />
          <circle cx={x + 39} cy={y + 40} r="1" fill="#FBBF24" />
          {/* Brochure rack */}
          <IsoBlock x={x + 68} y={y + 20} w={8} h={22} depth={2} topColor="#92400E" frontColor="#78350F" sideColor="#5C2D0E" />
          <rect x={x + 69} y={y + 22} width="6" height="4" fill="#EF4444" />
          <rect x={x + 69} y={y + 27} width="6" height="4" fill="#3B82F6" />
          <rect x={x + 69} y={y + 32} width="6" height="4" fill="#22C55E" />
        </g>
      );
    case "sponsors":
      return (
        <g>
          {/* Tent canopy */}
          <IsoTent x={x + 3} y={y + 3} w={w - 8} h={h - 8} color="#DB2777" stripeColor="#EC4899" />
          {/* Display tables */}
          <IsoBlock x={x + 8} y={y + 28} w={28} h={10} depth={3} topColor="#FFF" frontColor="#F0F0F0" sideColor="#DDD" />
          <IsoBlock x={x + 48} y={y + 28} w={28} h={10} depth={3} topColor="#FFF" frontColor="#F0F0F0" sideColor="#DDD" />
          {/* Table legs */}
          <rect x={x + 8} y={y + 34} width="2" height="10" fill="#94A3B8" />
          <rect x={x + 34} y={y + 34} width="2" height="10" fill="#94A3B8" />
          <rect x={x + 48} y={y + 34} width="2" height="10" fill="#94A3B8" />
          <rect x={x + 74} y={y + 34} width="2" height="10" fill="#94A3B8" />
          {/* Banner stands */}
          <rect x={x + 16} y={y + 8} width="1.5" height="22" fill="#475569" />
          <IsoBlock x={x + 8} y={y + 8} w={18} h={14} depth={1} topColor="#F472B6" frontColor="#EC4899" sideColor="#DB2777" />
          <rect x={x + 58} y={y + 8} width="1.5" height="22" fill="#475569" />
          <IsoBlock x={x + 50} y={y + 8} w={18} h={14} depth={1} topColor="#FDE68A" frontColor="#FBBF24" sideColor="#D97706" />
          {/* Items on tables */}
          <rect x={x + 12} y={y + 26} width="6" height="4" fill="#A78BFA" />
          <rect x={x + 20} y={y + 26} width="6" height="4" fill="#F87171" />
          <rect x={x + 52} y={y + 26} width="6" height="4" fill="#4ADE80" />
          <rect x={x + 60} y={y + 26} width="6" height="4" fill="#60A5FA" />
        </g>
      );
    default:
      return null;
  }
}

// ─── Bench (RCT style) ─────────────────────────────────────────
function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBlock x={x} y={y} w={12} h={4} depth={2} topColor="#A0714D" frontColor="#8B6226" sideColor="#6B4226" />
      <rect x={x} y={y + 4} width="2" height="4" fill="#5C2D0E" />
      <rect x={x + 10} y={y + 4} width="2" height="4" fill="#5C2D0E" />
    </g>
  );
}

// ─── Lamp post ──────────────────────────────────────────────────
function Lamp({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="2" height="16" fill="#5C5C5C" />
      <rect x={x - 3} y={y - 2} width="8" height="3" fill="#707070" rx="1" />
      <circle cx={x + 1} cy={y} r="5" fill="#FBBF24" opacity="0.12" />
      <circle cx={x + 1} cy={y - 1} r="2" fill="#FDE68A" opacity="0.6" />
    </g>
  );
}

// ─── Trash bin ──────────────────────────────────────────────────
function TrashBin({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <IsoBlock x={x} y={y} w={6} h={8} depth={2} topColor="#6B7280" frontColor="#4B5563" sideColor="#374151" />
      <rect x={x + 2} y={y + 2} width="2" height="4" fill="#374151" />
    </g>
  );
}

// ─── Main component ─────────────────────────────────────────────
export default function PixelMap() {
  const [movingChars, setMovingChars] = useState<MovingCharacter[]>([]);
  const [hoveredZone, setHoveredZone] = useState<MapZone | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);
  const [frame, setFrame] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());

  const loadCharacters = useCallback(async (isInitial: boolean) => {
    const rawChars = await getCharacters();
    if (isInitial) {
      const moving = rawChars.map((c) => initMovingCharacter(c));
      knownIds.current = new Set(rawChars.map((c) => c.id));
      setMovingChars(moving);
    } else {
      const newChars = rawChars.filter((c) => !knownIds.current.has(c.id));
      if (newChars.length > 0) {
        const spawned = newChars.map((c) => spawnAtEntrance(c));
        newChars.forEach((c) => knownIds.current.add(c.id));
        setMovingChars((prev) => [...prev, ...spawned]);
      }
    }
  }, []);

  useEffect(() => { loadCharacters(true); }, [loadCharacters]);
  useEffect(() => {
    const interval = setInterval(() => loadCharacters(false), POLL_MS);
    return () => clearInterval(interval);
  }, [loadCharacters]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMovingChars((prev) => tickCharacters(prev));
      setFrame((f) => f + 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const sortedChars = [...movingChars].sort((a, b) => a.y - b.y);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Zone info panel */}
      {selectedZone && (
        <div className="mb-4 bg-[#0F172A] border-4 border-[#4ADE80] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-[10px] text-[#4ADE80]">{selectedZone.label}</h3>
                <p className="text-[8px] text-[#94A3B8] mt-1">{selectedZone.description}</p>
              </div>
            </div>
            <button onClick={() => setSelectedZone(null)} className="text-[8px] text-[#94A3B8] hover:text-[#F0FDF4] px-2 py-1">[CLOSE]</button>
          </div>
        </div>
      )}

      {/* Isometric perspective wrapper */}
      <div style={{ perspective: "1000px", perspectiveOrigin: "50% 40%" }}>
        <svg
          viewBox="0 0 560 420"
          className="w-full h-auto"
          style={{
            imageRendering: "pixelated",
            transform: "rotateX(30deg)",
            transformOrigin: "50% 50%",
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.3))",
          }}
        >
          {/* ═══ Sky gradient ═══ */}
          <defs>
            <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#87CEEB" />
              <stop offset="100%" stopColor="#B0E0FF" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="560" height="58" fill="url(#skyG)" />

          {/* Clouds */}
          {[
            { bx: 40, by: 12, s: 1, spd: 0.03 },
            { bx: 200, by: 8, s: 0.8, spd: 0.02 },
            { bx: 380, by: 16, s: 0.9, spd: 0.025 },
          ].map((c, i) => (
            <g key={`cloud-${i}`} opacity={0.7}>
              <ellipse cx={(c.bx + frame * c.spd) % 600 - 20} cy={c.by + 4} rx={18 * c.s} ry={6 * c.s} fill="#FFF" />
              <ellipse cx={(c.bx + frame * c.spd) % 600 - 10} cy={c.by} rx={14 * c.s} ry={8 * c.s} fill="#FFF" />
              <ellipse cx={(c.bx + frame * c.spd) % 600} cy={c.by + 2} rx={20 * c.s} ry={7 * c.s} fill="#FFF" />
            </g>
          ))}

          {/* Sun */}
          <circle cx="500" cy="28" r="16" fill="#FFE066" />
          <circle cx="500" cy="28" r="22" fill="#FFE066" opacity="0.15" />
          <circle cx="496" cy="24" r="5" fill="#FFF8C4" opacity="0.5" />

          {/* ═══ Ground: Checkered grass tiles (RCT signature look) ═══ */}
          <rect x="0" y="55" width="560" height="365" fill="#3A7D22" />
          {/* Checkered grass pattern */}
          {Array.from({ length: 36 }).map((_, row) =>
            Array.from({ length: 28 }).map((_, col) => (
              <rect
                key={`tile-${row}-${col}`}
                x={col * 20}
                y={55 + row * 10}
                width="20"
                height="10"
                fill={(row + col) % 2 === 0 ? "#3A7D22" : "#347020"}
                opacity="1"
              />
            ))
          )}

          {/* ═══ Paths (tan gravel, RCT style) ═══ */}
          <g>
            {/* Main vertical path: entrance → center of rink */}
            <rect x="274" y="155" width="12" height="160" fill="#C4A46C" />
            <rect x="274" y="155" width="12" height="160" fill="#B89858" opacity="0.5" />
            {/* Gravel dots on paths */}
            {Array.from({ length: 15 }).map((_, i) => (
              <rect key={`pv-${i}`} x={276 + (i * 3) % 8} y={160 + i * 10} width="2" height="2" fill="#A88A50" opacity="0.6" />
            ))}

            {/* Horizontal path across middle */}
            <rect x="48" y="155" width="464" height="10" fill="#C4A46C" />
            {Array.from({ length: 30 }).map((_, i) => (
              <rect key={`ph-${i}`} x={52 + i * 15} y={157 + (i % 3) * 2} width="2" height="2" fill="#A88A50" opacity="0.5" />
            ))}

            {/* Vertical side paths */}
            <rect x="108" y="72" width="8" height="86" fill="#C4A46C" />
            <rect x="458" y="72" width="8" height="86" fill="#C4A46C" />

            {/* Lower horizontal path */}
            <rect x="48" y="248" width="464" height="8" fill="#C4A46C" />

            {/* Path from parking to entrance */}
            <rect x="220" y="300" width="54" height="10" fill="#C4A46C" />
          </g>

          {/* ═══ Rink boards (subtle, not dominant) ═══ */}
          <rect x="42" y="67" width="476" height="192" rx="8" fill="#E8E0D0" stroke="#8B7355" strokeWidth="3" />
          {/* Ice/rink surface texture */}
          <rect x="45" y="70" width="470" height="186" rx="6" fill="#E5DDD0" />
          {/* Center line */}
          <line x1="280" y1="70" x2="280" y2="256" stroke="#D0C8B8" strokeWidth="1.5" opacity="0.5" />
          <circle cx="280" cy="163" r="25" fill="none" stroke="#D0C8B8" strokeWidth="1.5" opacity="0.4" />

          {/* ═══ Zone structures (isometric 3D, no emojis) ═══ */}
          {ZONES.map((zone) => (
            <g key={zone.id}>
              {/* Invisible clickable area */}
              <rect
                x={zone.x} y={zone.y} width={zone.width} height={zone.height}
                fill="transparent"
                onClick={() => setSelectedZone(zone)}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer"
                stroke={selectedZone?.id === zone.id ? "#FFE066" : hoveredZone?.id === zone.id ? "#FFF" : "transparent"}
                strokeWidth={selectedZone?.id === zone.id ? 2 : hoveredZone?.id === zone.id ? 1 : 0}
                strokeDasharray={hoveredZone?.id === zone.id && selectedZone?.id !== zone.id ? "4 2" : "none"}
                rx="3"
                opacity={hoveredZone?.id === zone.id ? 0.1 : 0}
              />
              {/* The actual structure */}
              <g style={{ pointerEvents: "none" }}>
                <ZoneStructure id={zone.id} x={zone.x} y={zone.y} w={zone.width} h={zone.height} />
              </g>
            </g>
          ))}

          {/* ═══ Environment props ═══ */}
          {/* Benches along paths */}
          <Bench x={95} y={256} />
          <Bench x={200} y={256} />
          <Bench x={330} y={256} />
          <Bench x={440} y={256} />

          {/* Lamp posts */}
          <Lamp x={55} y={252} />
          <Lamp x={270} y={252} />
          <Lamp x={500} y={252} />
          <Lamp x={140} y={60} />
          <Lamp x={390} y={60} />

          {/* Trash bins */}
          <TrashBin x={165} y={257} />
          <TrashBin x={350} y={257} />
          <TrashBin x={505} y={257} />

          {/* Flower beds */}
          {[
            { x: 48, y: 268, c: "#EF4444" }, { x: 180, y: 268, c: "#FBBF24" },
            { x: 355, y: 268, c: "#A78BFA" }, { x: 510, y: 268, c: "#EC4899" },
            { x: 48, y: 345, c: "#3B82F6" }, { x: 200, y: 348, c: "#22C55E" },
            { x: 420, y: 348, c: "#F97316" },
          ].map((f, i) => (
            <g key={`fl-${i}`}>
              <rect x={f.x} y={f.y + 3} width="1" height="3" fill="#2D5016" />
              <rect x={f.x + 3} y={f.y + 2} width="1" height="4" fill="#2D5016" />
              <rect x={f.x + 6} y={f.y + 3} width="1" height="3" fill="#2D5016" />
              <circle cx={f.x + 0.5} cy={f.y + 2} r="2" fill={f.c} />
              <circle cx={f.x + 3.5} cy={f.y + 1} r="2" fill={f.c} opacity="0.8" />
              <circle cx={f.x + 6.5} cy={f.y + 2} r="2" fill={f.c} />
            </g>
          ))}

          {/* ═══ Trees (RCT round layered style) ═══ */}
          <RCTTree x={525} y={278} size={1.2} />
          <RCTTree x={540} y={310} />
          <RCTTree x={522} y={345} size={1.1} />
          <RCTTree x={8} y={278} size={1.3} />
          <RCTTree x={20} y={315} />
          <RCTTree x={5} y={350} size={1.1} />
          <RCTTree x={35} y={340} size={0.8} />
          <RCTTree x={530} y={360} size={0.9} />

          {/* ═══ Entry gate (isometric) ═══ */}
          <IsoBlock x={242} y={292} w={76} h={26} depth={6} topColor="#3A3A3A" frontColor="#2A2A2A" sideColor="#1A1A1A" rx={3} />
          {/* Gate arch */}
          <IsoBlock x={240} y={286} w={80} h={8} depth={6} topColor="#5C5C5C" frontColor="#4A4A4A" sideColor="#3A3A3A" rx={2} />
          {/* Gate pillars */}
          <IsoBlock x={240} y={290} w={6} h={32} depth={3} topColor="#707070" frontColor="#5C5C5C" sideColor="#4A4A4A" />
          <IsoBlock x={314} y={290} w={6} h={32} depth={3} topColor="#707070" frontColor="#5C5C5C" sideColor="#4A4A4A" />
          {/* Entrance text */}
          <text x="280" y="308" textAnchor="middle" fill="#4ADE80" fontSize="6" fontFamily="monospace">ENTRANCE</text>
          {/* Gate lanterns */}
          <circle cx="243" cy="290" r="3" fill="#FBBF24" opacity="0.5" />
          <circle cx="317" cy="290" r="3" fill="#FBBF24" opacity="0.5" />

          {/* ═══ Parking lot ═══ */}
          <IsoBlock x={40} y={298} w={180} h={42} depth={4} topColor="#4A4A4A" frontColor="#3A3A3A" sideColor="#2A2A2A" rx={3} />
          <text x="130" y="335" textAnchor="middle" fill="#8B8B8B" fontSize="5" fontFamily="monospace">PARKING</text>
          {/* Parking lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={`pl-${i}`} x={52 + i * 28} y={303} width="1" height="28" fill="#6B6B6B" opacity="0.5" />
          ))}
          {/* Cars */}
          {[
            { c: "#D32F2F" }, { c: "#1976D2" }, { c: "#F9A825" }, { c: "#388E3C" }, { c: "#7B1FA2" },
          ].map((car, i) => (
            <g key={`car-${i}`}>
              <IsoBlock x={55 + i * 28} y={306} w={18} h={10} depth={3} topColor={car.c} frontColor={car.c} sideColor="#000" rx={2} />
              <rect x={59 + i * 28} y={307} width={6} height={4} rx="1" fill="#1A1A1A" opacity="0.4" />
              <rect x={57 + i * 28} y={316} width={4} height={3} rx="1" fill="#1A1A1A" />
              <rect x={67 + i * 28} y={316} width={4} height={3} rx="1" fill="#1A1A1A" />
            </g>
          ))}

          {/* ═══ Characters (y-sorted for depth) ═══ */}
          {sortedChars.map((mc, i) => (
            <PixelCharacter key={mc.id} char={mc} index={i} />
          ))}

          {/* ═══ Guest count overlay (RCT style) ═══ */}
          {movingChars.length > 0 && (
            <g>
              <rect x="348" y="352" width="100" height="18" rx="3" fill="#1A1A1A" opacity="0.8" />
              <text x="398" y="364" textAnchor="middle" fill="#4ADE80" fontSize="5.5" fontFamily="monospace">
                Guests: {movingChars.length}
              </text>
            </g>
          )}

          {/* ═══ Title banner ═══ */}
          <IsoBlock x={105} y={378} w={350} h={32} depth={5} topColor="#1A1A1A" frontColor="#111" sideColor="#000" rx={4} />
          <text x="280" y="393" textAnchor="middle" fill="#4ADE80" fontSize="7.5" fontFamily="monospace">SIGNAL HILL NEIGHBOUR DAY</text>
          <text x="280" y="404" textAnchor="middle" fill="#FFE066" fontSize="6.5" fontFamily="monospace">JUNE 21, 2026</text>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredZone && !selectedZone && (
        <div
          className="map-tooltip"
          style={{
            left: `${((hoveredZone.x + hoveredZone.width / 2) / 560) * 100}%`,
            top: `${((hoveredZone.y - 25) / 420) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          {hoveredZone.label}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#4ADE80]" /> RSVP&apos;d
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#60A5FA]" /> Volunteers
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#F472B6]" /> Vendors
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#FFD700]" /> VIPs
        </div>
      </div>
    </div>
  );
}
