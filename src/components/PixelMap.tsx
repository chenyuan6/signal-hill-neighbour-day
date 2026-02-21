"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { getCharacters } from "@/lib/store";
import {
  MovingCharacter,
  initMovingCharacter,
  spawnAtEntrance,
  tickCharacters,
} from "@/lib/movement";
import {
  GRID_COLS, GRID_ROWS,
  gridToScreen, tileDiamond, isoBuildingPolys, worldToIso,
} from "@/lib/iso";

const TICK_MS = 33;
const POLL_MS = 8000;

// ─── Isometric zone definitions ────────────────────────────────
interface IsoZone {
  id: string;
  label: string;
  gx: number;
  gy: number;
  gw: number;
  gd: number;
  h: number;
  colors: { roof: string; leftWall: string; rightWall: string };
  description: string;
  available?: boolean;
  suggestion?: string;
  awningColor?: string; // market stall awning color
}

const ISO_ZONES: IsoZone[] = [
  // ─── Near entrance (top) — SHCA Info table ───
  {
    id: "info", label: "SHCA Info",
    gx: 3, gy: 0.5, gw: 3, gd: 2, h: 16,
    colors: { roof: "#5B8EC9", leftWall: "#4A7AB5", rightWall: "#3B6A9E" },
    description: "Signal Hill Community Association – info, membership & welcome!",
  },
  // ─── Upper area (gy 3-5) ───
  {
    id: "spot-1", label: "Available Spot",
    gx: 0.5, gy: 3, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#C85C5C", leftWall: "#A84848", rightWall: "#8E3A3A" },
    description: "Perfect for kids activities, bounce houses, or crafts!",
    available: true, suggestion: "Kids Activity", awningColor: "#D94F4F",
  },
  {
    id: "spot-2", label: "Available Spot",
    gx: 4, gy: 3, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#8B6BAE", leftWall: "#7558A0", rightWall: "#604890" },
    description: "Great for a local artisan, face painter, or henna artist!",
    available: true, suggestion: "Arts & Crafts", awningColor: "#9B6FC0",
  },
  {
    id: "spot-3", label: "Available Spot",
    gx: 7, gy: 3, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#4A8EC8", leftWall: "#3B7AB0", rightWall: "#2C6898" },
    description: "Ideal for yard games, sports demos, or fitness activities!",
    available: true, suggestion: "Games & Fun", awningColor: "#4A90CC",
  },
  // ─── Middle area (gy 7-9) ───
  {
    id: "spot-4", label: "Available Spot",
    gx: 0.5, gy: 7, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#5AAE6A", leftWall: "#489858", rightWall: "#388248" },
    description: "Perfect for pet services, animal rescue, or a petting zoo!",
    available: true, suggestion: "Pet Friendly", awningColor: "#4EAE5C",
  },
  {
    id: "spot-5", label: "Available Spot",
    gx: 3.5, gy: 7, gw: 3, gd: 2, h: 14,
    colors: { roof: "#D4884A", leftWall: "#C07838", rightWall: "#A86828" },
    description: "Ideal for food trucks, BBQ, lemonade, or bake sales!",
    available: true, suggestion: "Food & Drink", awningColor: "#E08838",
  },
  {
    id: "spot-6", label: "Available Spot",
    gx: 7, gy: 7, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#D46A8C", leftWall: "#C05878", rightWall: "#A84868" },
    description: "Great for live music, DJ, or entertainment performances!",
    available: true, suggestion: "Entertainment", awningColor: "#D86090",
  },
  // ─── Lower area (gy 11-13) ───
  {
    id: "spot-7", label: "Available Spot",
    gx: 0.5, gy: 11, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#4AB8B8", leftWall: "#38A0A0", rightWall: "#288888" },
    description: "Open for health & wellness, yoga, or fitness demos!",
    available: true, suggestion: "Wellness", awningColor: "#40B8B0",
  },
  {
    id: "spot-8", label: "Available Spot",
    gx: 3.5, gy: 11, gw: 3, gd: 2, h: 14,
    colors: { roof: "#D4A840", leftWall: "#C09830", rightWall: "#A88820" },
    description: "Perfect for sponsors, local businesses, or community groups!",
    available: true, suggestion: "Sponsor Booth", awningColor: "#D4A830",
  },
  {
    id: "spot-9", label: "Available Spot",
    gx: 7, gy: 11, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#D06848", leftWall: "#B85838", rightWall: "#A04828" },
    description: "Prime location — great for any vendor!",
    available: true, suggestion: "Local Biz", awningColor: "#D46040",
  },
  // ─── Bottom area (gy 14-15) ───
  {
    id: "spot-10", label: "Available Spot",
    gx: 3, gy: 14, gw: 3, gd: 1.5, h: 14,
    colors: { roof: "#D4C040", leftWall: "#C0B030", rightWall: "#A8A020" },
    description: "Excellent spot for community groups or sponsors!",
    available: true, suggestion: "Open", awningColor: "#E0C830",
  },
];

// ─── Path tile coordinates for 10×16 grid ─────
function isPathTile(col: number, row: number): boolean {
  if ((col === 4 || col === 5) && row >= 0 && row <= 2) return true;
  if (col === 5 && row >= 2 && row <= 15) return true;
  if (row === 2 && col >= 0 && col < 10) return true;
  if (row === 6 && col >= 0 && col < 10) return true;
  if (row === 10 && col >= 0 && col < 10) return true;
  if (row === 13 && col >= 2 && col <= 8) return true;
  return false;
}

// ─── Tree positions — around perimeter ───
const TREE_POSITIONS: { gx: number; gy: number; size: number }[] = [
  { gx: 1, gy: 16, size: 1.1 },
  { gx: 3, gy: 16.5, size: 1.3 },
  { gx: 5, gy: 16.8, size: 0.9 },
  { gx: 7, gy: 16.5, size: 1.0 },
  { gx: 9, gy: 16, size: 1.1 },
  { gx: -0.5, gy: 3, size: 1.0 },
  { gx: -0.8, gy: 6, size: 1.1 },
  { gx: -0.5, gy: 9, size: 0.9 },
  { gx: -0.8, gy: 12, size: 1.0 },
  { gx: -0.5, gy: 15, size: 0.9 },
  { gx: 10.3, gy: 4, size: 0.8 },
  { gx: 10.5, gy: 8, size: 0.9 },
  { gx: 10.3, gy: 12, size: 0.8 },
];

// ─── Flower positions (scattered along paths and fence line) ───
const FLOWER_PATCHES: { gx: number; gy: number; colors: string[] }[] = [
  { gx: 0, gy: 1.5, colors: ["#FF6B9D", "#FFB347", "#FF6B6B"] },
  { gx: 9.5, gy: 2, colors: ["#FFE66D", "#FF6B9D", "#A0D2FF"] },
  { gx: 0.5, gy: 5.5, colors: ["#C084FC", "#FF6B9D", "#FFB347"] },
  { gx: 9, gy: 5.5, colors: ["#FF6B6B", "#FFE66D", "#87CEEB"] },
  { gx: 0, gy: 9, colors: ["#FFB347", "#FF6B9D", "#C084FC"] },
  { gx: 9.5, gy: 9.5, colors: ["#87CEEB", "#FFE66D", "#FF6B9D"] },
  { gx: 1, gy: 13, colors: ["#FF6B6B", "#C084FC", "#FFB347"] },
  { gx: 9, gy: 13, colors: ["#FFE66D", "#FF6B9D", "#87CEEB"] },
  { gx: 2, gy: 15.5, colors: ["#FF6B9D", "#FFE66D", "#C084FC"] },
  { gx: 8, gy: 15.5, colors: ["#A0D2FF", "#FF6B6B", "#FFB347"] },
];

// ─── Tiny isometric guest ──────────
function TinyGuest({ x, y, color, type, walkFrame, frameCounter, facing, name }: {
  x: number; y: number; color: string; type: string;
  walkFrame: number; frameCounter: number; facing: string; name: string;
}) {
  const bob = Math.sin(frameCounter * 0.1) * 0.5;
  const flip = facing === "left" ? -1 : 1;
  const legOff = walkFrame === 0 ? 0.5 : -0.5;
  const balloonColors = ["#FFD700", "#FF6B6B", "#4FC3F7", "#81C784", "#FFB74D"];
  const balloonColor = balloonColors[Math.abs(name.charCodeAt(0)) % balloonColors.length];
  const balloonSway = Math.sin(frameCounter * 0.05 + name.charCodeAt(0)) * 1.5;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>{name} ({type})</title>
      <ellipse cx="0" cy="3" rx="3" ry="1.2" fill="#000" opacity="0.12" />
      <rect x={-1.2 + legOff * flip} y={bob + 0.5} width="1" height="2.5" rx="0.4" fill="#5A4A3A" />
      <rect x={0.2 - legOff * flip} y={bob + 0.5} width="1" height="2.5" rx="0.4" fill="#5A4A3A" />
      <rect x={-1.5 + legOff * flip} y={bob + 2.5} width="1.5" height="0.8" rx="0.3" fill="#6B4226" />
      <rect x={0 - legOff * flip} y={bob + 2.5} width="1.5" height="0.8" rx="0.3" fill="#6B4226" />
      <rect x="-1.5" y={bob - 3} width="3" height="3.5" rx="0.6" fill={color} />
      <rect x="-1" y={bob - 2.8} width="1" height="2" rx="0.4" fill="#FFF" opacity="0.1" />
      <ellipse cx="0" cy={bob - 4.2} rx="1.4" ry="1.5" fill="#FFE0BD" />
      <circle cx={flip > 0 ? -0.4 : 0} cy={bob - 4.3} r="0.35" fill="#1A202C" />
      <circle cx={flip > 0 ? 0.5 : 0.9} cy={bob - 4.3} r="0.35" fill="#1A202C" />

      {type === "rsvp" && (
        <>
          <line x1="0" y1={bob - 5.5} x2={balloonSway * 0.4} y2={bob - 13}
            stroke="#A08060" strokeWidth="0.25" />
          <ellipse cx={balloonSway * 0.6} cy={bob - 15} rx="2.2" ry="2.8"
            fill={balloonColor} opacity="0.85" />
          <ellipse cx={balloonSway * 0.6 - 0.6} cy={bob - 16.2} rx="0.7" ry="1"
            fill="#FFF" opacity="0.35" />
        </>
      )}
      {type === "vip" && (
        <>
          <rect x="-1.5" y={bob - 6.2} width="3.2" height="1" rx="0.2" fill="#FFD700" />
          <polygon points={`-1,${bob - 6.2} -0.5,${bob - 7.5} 0,${bob - 6.2}`} fill="#FFD700" />
          <polygon points={`0,${bob - 6.2} 0.5,${bob - 7.8} 1,${bob - 6.2}`} fill="#FFD700" />
          <polygon points={`1,${bob - 6.2} 1.5,${bob - 7.5} 2,${bob - 6.2}`} fill="#FFD700" />
          <circle cx="-0.5" cy={bob - 7} r="0.3" fill="#FF6B6B" />
          <circle cx="0.5" cy={bob - 7.3} r="0.3" fill="#4FC3F7" />
          <circle cx="1.5" cy={bob - 7} r="0.3" fill="#81C784" />
        </>
      )}
      {type === "volunteer" && (
        <>
          <ellipse cx="0" cy={bob - 5.8} rx="2" ry="1.2" fill="#E8D8B0" />
          <ellipse cx="0" cy={bob - 6.2} rx="1.5" ry="0.8" fill="#F0E8C8" />
          <rect x="-2.2" y={bob - 5.4} width="4.4" height="0.5" rx="0.2" fill="#D4C090" />
        </>
      )}
      {type === "vendor" && (
        <>
          <rect x="-1.2" y={bob - 6.5} width="2.6" height="1.2" rx="0.2" fill="#F0FDF4" />
          <ellipse cx="0" cy={bob - 7.5} rx="1.5" ry="1.2" fill="#F8FFFE" />
        </>
      )}
    </g>
  );
}

// ─── Stardew-style tree (warm, layered, chunky canopy) ──────
function IsoTree({ gx, gy, size }: { gx: number; gy: number; size: number }) {
  const pos = gridToScreen(gx, gy);
  const s = size;
  return (
    <g>
      <ellipse cx={pos.x + 2 * s} cy={pos.y + 3} rx={7 * s} ry={3.5 * s}
        fill="#1A4A10" opacity="0.12" />
      {/* Warm brown trunk */}
      <rect x={pos.x - 1.5 * s} y={pos.y - 5 * s} width={3 * s} height={8 * s}
        rx={0.8 * s} fill="#8B5E34" />
      <rect x={pos.x - 0.8 * s} y={pos.y - 5 * s} width={1.2 * s} height={8 * s}
        rx={0.4 * s} fill="#9B6E44" opacity="0.5" />
      {/* Warm green canopy layers */}
      <ellipse cx={pos.x + 1 * s} cy={pos.y - 6 * s} rx={7.5 * s} ry={5.5 * s}
        fill="#2D6B18" />
      <ellipse cx={pos.x - 0.5 * s} cy={pos.y - 8 * s} rx={6.5 * s} ry={5 * s}
        fill="#3A8520" />
      <ellipse cx={pos.x + 0.8 * s} cy={pos.y - 10 * s} rx={5 * s} ry={4 * s}
        fill="#4A9B2A" />
      <ellipse cx={pos.x} cy={pos.y - 12 * s} rx={3.8 * s} ry={3 * s}
        fill="#58B035" />
      {/* Warm sunlight highlights */}
      <ellipse cx={pos.x - 1 * s} cy={pos.y - 11 * s} rx={2.2 * s} ry={1.5 * s}
        fill="#78D050" opacity="0.45" />
      <ellipse cx={pos.x + 0.5 * s} cy={pos.y - 12.5 * s} rx={1.2 * s} ry={0.8 * s}
        fill="#90E068" opacity="0.35" />
      {/* Tiny fruit/berry dots */}
      <circle cx={pos.x - 2 * s} cy={pos.y - 7 * s} r={0.6 * s} fill="#FF6B6B" opacity="0.5" />
      <circle cx={pos.x + 3 * s} cy={pos.y - 9 * s} r={0.5 * s} fill="#FFE66D" opacity="0.4" />
    </g>
  );
}

// ─── Flower patch (little wildflowers) ──────
function FlowerPatch({ gx, gy, colors, frame }: { gx: number; gy: number; colors: string[]; frame: number }) {
  const pos = gridToScreen(gx, gy);
  const sway = Math.sin(frame * 0.03) * 0.5;
  return (
    <g>
      {colors.map((c, i) => {
        const ox = (i - 1) * 4 + Math.sin(frame * 0.02 + i) * 0.3;
        const oy = Math.cos(i * 2.1) * 2;
        return (
          <g key={`f-${i}`}>
            {/* Stem */}
            <line x1={pos.x + ox} y1={pos.y + oy + 1}
              x2={pos.x + ox + sway * (i % 2 === 0 ? 1 : -1)} y2={pos.y + oy - 3}
              stroke="#4A8830" strokeWidth="0.4" />
            {/* Petals */}
            <circle cx={pos.x + ox + sway * (i % 2 === 0 ? 1 : -1)}
              cy={pos.y + oy - 3.5} r="1.5" fill={c} opacity="0.85" />
            {/* Center */}
            <circle cx={pos.x + ox + sway * (i % 2 === 0 ? 1 : -1)}
              cy={pos.y + oy - 3.5} r="0.5" fill="#FFE066" opacity="0.9" />
          </g>
        );
      })}
    </g>
  );
}

// ─── Wooden bench (warm) ─────────
function IsoBench({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      <ellipse cx={pos.x} cy={pos.y + 4} rx="6" ry="1.5" fill="#2A5010" opacity="0.1" />
      <rect x={pos.x - 5} y={pos.y - 2} width="10" height="2.5" rx="0.5"
        fill="#C8945C" stroke="#8B6934" strokeWidth="0.4" />
      <rect x={pos.x - 4.5} y={pos.y - 1.8} width="9" height="0.8" rx="0.3"
        fill="#D8A46C" opacity="0.6" />
      <rect x={pos.x - 4} y={pos.y + 0.5} width="1.5" height="3" rx="0.3" fill="#8B5E34" />
      <rect x={pos.x + 2.5} y={pos.y + 0.5} width="1.5" height="3" rx="0.3" fill="#8B5E34" />
    </g>
  );
}

// ─── String light post (warm lantern on wooden pole) ───
function IsoLantern({ gx, gy, frame }: { gx: number; gy: number; frame: number }) {
  const pos = gridToScreen(gx, gy);
  const flicker = 0.35 + Math.sin(frame * 0.08) * 0.08;
  return (
    <g>
      <rect x={pos.x - 0.6} y={pos.y - 14} width="1.5" height="14" rx="0.5" fill="#8B6934" />
      <rect x={pos.x - 0.2} y={pos.y - 14} width="0.6" height="14" rx="0.2"
        fill="#9B7944" opacity="0.4" />
      {/* Lantern housing */}
      <rect x={pos.x - 2} y={pos.y - 16.5} width="5" height="3" rx="1" fill="#8B6934" />
      <rect x={pos.x - 1.5} y={pos.y - 16} width="4" height="2" rx="0.5" fill="#FFE8A0" opacity="0.7" />
      {/* Warm glow */}
      <circle cx={pos.x + 0.5} cy={pos.y - 15} r="6" fill="#FFD700" opacity={flicker * 0.12} />
      <circle cx={pos.x + 0.5} cy={pos.y - 15.5} r="2" fill="#FFE8A0" opacity={flicker} />
    </g>
  );
}

// ─── Trash barrel (wooden) ──────
function IsoTrashBin({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      <ellipse cx={pos.x} cy={pos.y + 1} rx="3" ry="1" fill="#1A4A10" opacity="0.1" />
      <rect x={pos.x - 2} y={pos.y - 5} width="4" height="5" rx="0.5"
        fill="#8B6934" stroke="#6B4920" strokeWidth="0.4" />
      <line x1={pos.x - 1.8} y1={pos.y - 3} x2={pos.x + 1.8} y2={pos.y - 3}
        stroke="#6B4920" strokeWidth="0.5" />
      <rect x={pos.x - 2.5} y={pos.y - 6} width="5" height="1.3" rx="0.6" fill="#A07840" />
    </g>
  );
}

// ─── Wooden stat panel (replaces HP bars) ──────
function WoodenStatPanel({ x, y, label, icon, current, target, color, href }: {
  x: number; y: number; label: string; icon: string;
  current: number; target: number; color: string; href: string;
}) {
  const panelW = 128;
  const panelH = 52;
  const barW = 88;
  const barH = 7;
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);

  return (
    <g>
      {/* Shadow */}
      <rect x={x + 2} y={y + 2} width={panelW} height={panelH} rx="4" fill="#000" opacity="0.12" />
      {/* Wooden frame */}
      <rect x={x} y={y} width={panelW} height={panelH} rx="4" fill="#C4985C" />
      <rect x={x + 1} y={y + 1} width={panelW - 2} height={panelH - 2} rx="3" fill="#D4A86C" />
      {/* Parchment inner */}
      <rect x={x + 3} y={y + 3} width={panelW - 6} height={panelH - 6} rx="2" fill="#FDF5E6" />
      {/* Wood grain texture lines */}
      <line x1={x + 1} y1={y + panelH * 0.3} x2={x + panelW - 1} y2={y + panelH * 0.3}
        stroke="#B8884C" strokeWidth="0.3" opacity="0.3" />
      <line x1={x + 1} y1={y + panelH * 0.7} x2={x + panelW - 1} y2={y + panelH * 0.7}
        stroke="#B8884C" strokeWidth="0.3" opacity="0.3" />

      {/* Icon + label row */}
      <text x={x + 8} y={y + 14} fill="#5A4030" fontSize="8" fontFamily="system-ui, sans-serif">
        {icon}
      </text>
      <text x={x + 20} y={y + 14.5} fill="#5A3A20" fontSize="6"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" letterSpacing="0.5">
        {label}
      </text>

      {/* Count */}
      <text x={x + panelW - 8} y={y + 14.5} textAnchor="end"
        fill="#3A2A18" fontSize="9"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900"
        style={{ fontVariantNumeric: "tabular-nums" } as React.CSSProperties}>
        {current}
        <tspan fill="#8B7A60" fontSize="5">/{target}</tspan>
      </text>

      {/* Progress bar — warm, rounded */}
      <rect x={x + 8} y={y + 20} width={barW} height={barH} rx="3.5" fill="#E8DCC8" />
      <rect x={x + 8} y={y + 20} width={barW * pct / 100} height={barH} rx="3.5"
        fill={color} opacity="0.85" />
      {/* Bar shine */}
      <rect x={x + 8} y={y + 20} width={barW * pct / 100} height={barH / 2} rx="3"
        fill="#FFF" opacity="0.2" />

      {/* Percentage */}
      <text x={x + 8 + barW + 5} y={y + 26} fill="#6B5A40" fontSize="4.5"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700"
        style={{ fontVariantNumeric: "tabular-nums" } as React.CSSProperties}>
        {pct.toFixed(0)}%
      </text>

      {/* Action button — warm rounded pill */}
      <a href={href} className="cursor-pointer">
        <rect x={x + 8} y={y + 32} width={panelW - 16} height="14" rx="7"
          fill={color} opacity="0.9" className="hover:opacity-100 transition-opacity" />
        <rect x={x + 8} y={y + 32} width={panelW - 16} height="7" rx="7"
          fill="#FFF" opacity="0.15" />
        <text x={x + panelW / 2} y={y + 41.5} textAnchor="middle"
          fill="#FFF" fontSize="5"
          fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800"
          letterSpacing="0.4" style={{ pointerEvents: "none" }}>
          {label === "GUESTS" ? "RSVP NOW" : label === "VOLUNTEERS" ? "SIGN UP" : "APPLY"}
        </text>
      </a>
    </g>
  );
}

// ─── Main component ─────────────────────────────────────────────
interface PixelMapProps {
  onZoneSelect?: (zone: { id: string; label: string; description: string; available?: boolean } | null) => void;
  stats?: { rsvps: number; volunteers: number; vendors: number };
  onStatClick?: (type: "rsvp" | "volunteer" | "vendor") => void;
}

export default function PixelMap({ onZoneSelect, stats }: PixelMapProps) {
  const [movingChars, setMovingChars] = useState<MovingCharacter[]>([]);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());

  const handleZoneClick = useCallback((zone: IsoZone) => {
    const newId = selectedZoneId === zone.id ? null : zone.id;
    setSelectedZoneId(newId);
    onZoneSelect?.(newId ? { id: zone.id, label: zone.label, description: zone.description, available: zone.available } : null);
  }, [selectedZoneId, onZoneSelect]);

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

  const projectedChars = movingChars
    .map((c) => ({ ...c, iso: worldToIso(c.x, c.y) }))
    .sort((a, b) => a.iso.y - b.iso.y);

  const sortedZones = [...ISO_ZONES].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  return (
    <svg
      viewBox="30 -80 900 580"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* ═══ WARM SKY GRADIENT (golden hour) ═══ */}
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6BB3D9" />
          <stop offset="30%" stopColor="#90CCE8" />
          <stop offset="55%" stopColor="#B8E0C8" />
          <stop offset="75%" stopColor="#C8E8B0" />
          <stop offset="100%" stopColor="#8BC870" />
        </linearGradient>

        {/* ═══ SHADOW FILTER ═══ */}
        <filter id="buildingShadow" x="-20%" y="-10%" width="150%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="2.5" floodColor="#2A4A10" floodOpacity="0.2" />
        </filter>

        {/* ═══ SOFT GLOW ═══ */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ═══ SUN GLOW (warmer) ═══ */}
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
          <stop offset="30%" stopColor="#FFE8A0" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#FFD060" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#FFD060" stopOpacity="0" />
        </radialGradient>

        {/* ═══ LUSH GRASS GRADIENTS ═══ */}
        <linearGradient id="grassLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5AAE3A" />
          <stop offset="100%" stopColor="#4A9830" />
        </linearGradient>
        <linearGradient id="grassDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4E9E30" />
          <stop offset="100%" stopColor="#429028" />
        </linearGradient>
        <linearGradient id="grassMid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#52A434" />
          <stop offset="100%" stopColor="#48962C" />
        </linearGradient>

        {/* ═══ DIRT PATH GRADIENTS (warm brown) ═══ */}
        <linearGradient id="pathLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4B888" />
          <stop offset="100%" stopColor="#C8A878" />
        </linearGradient>
        <linearGradient id="pathDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C8A070" />
          <stop offset="100%" stopColor="#BC9868" />
        </linearGradient>

        {/* ═══ HILLSIDE GRADIENT (warmer) ═══ */}
        <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8BA860" />
          <stop offset="30%" stopColor="#9B9858" />
          <stop offset="60%" stopColor="#8A8048" />
          <stop offset="100%" stopColor="#6A9A3A" />
        </linearGradient>

        {/* ═══ CLOUD FILTER ═══ */}
        <filter id="cloudSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>

        {/* ═══ AWNING STRIPE PATTERN ═══ */}
        <pattern id="stripes" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(0)">
          <rect width="4" height="4" fill="#FFF" opacity="0.3" />
          <rect width="2" height="4" fill="#FFF" opacity="0" />
        </pattern>

        {/* ═══ ROOF GRADIENTS ═══ */}
        {ISO_ZONES.map((zone) => (
          <React.Fragment key={`grad-${zone.id}`}>
            <linearGradient id={`roof-${zone.id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={zone.colors.roof} />
              <stop offset="100%" stopColor={zone.colors.leftWall} />
            </linearGradient>
            <linearGradient id={`lwall-${zone.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={zone.colors.leftWall} />
              <stop offset="80%" stopColor={zone.colors.rightWall} />
            </linearGradient>
            <linearGradient id={`rwall-${zone.id}`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={zone.colors.rightWall} stopOpacity="0.9" />
              <stop offset="100%" stopColor={zone.colors.rightWall} />
            </linearGradient>
          </React.Fragment>
        ))}
      </defs>

      {/* ═══ SKY ═══ */}
      <rect x="30" y="-80" width="900" height="580" fill="url(#skyGrad)" />

      {/* ═══ BATTALION PARK HILLSIDE ═══ */}
      <polygon points="30,-20 930,-50 930,130 30,100" fill="url(#hillGrad)" />
      {/* Hill texture */}
      <ellipse cx="200" cy="20" rx="60" ry="12" fill="#9B9860" opacity="0.12" />
      <ellipse cx="450" cy="10" rx="80" ry="15" fill="#8B8050" opacity="0.1" />
      <ellipse cx="700" cy="0" rx="55" ry="10" fill="#9B9860" opacity="0.08" />
      <ellipse cx="350" cy="50" rx="70" ry="12" fill="#7A9A4A" opacity="0.1" />
      <ellipse cx="600" cy="60" rx="65" ry="10" fill="#6A8A3A" opacity="0.08" />

      {/* Wildflower clusters on hillside */}
      {[
        { cx: 140, cy: 30, colors: ["#FFD700", "#FF6B6B", "#FF9ECD"] },
        { cx: 260, cy: 50, colors: ["#C084FC", "#FFD700", "#87CEEB"] },
        { cx: 400, cy: 25, colors: ["#FF6B6B", "#FFD700", "#C084FC"] },
        { cx: 520, cy: 45, colors: ["#87CEEB", "#FF9ECD", "#FFD700"] },
        { cx: 650, cy: 35, colors: ["#FFD700", "#C084FC", "#FF6B6B"] },
        { cx: 180, cy: 70, colors: ["#FF9ECD", "#87CEEB", "#FFD700"] },
        { cx: 340, cy: 80, colors: ["#FFD700", "#FF6B6B", "#87CEEB"] },
        { cx: 500, cy: 75, colors: ["#C084FC", "#FFD700", "#FF9ECD"] },
        { cx: 600, cy: 60, colors: ["#FF6B6B", "#FFD700", "#C084FC"] },
      ].map((cluster, ci) => (
        <g key={`hill-flower-${ci}`} opacity={0.7 + Math.random() * 0.15}>
          {cluster.colors.map((color, fi) => {
            const ox = (fi - 1) * 8;
            const oy = fi === 1 ? -4 : 0;
            return (
              <g key={fi}>
                <line x1={cluster.cx + ox} y1={cluster.cy + oy} x2={cluster.cx + ox} y2={cluster.cy + oy + 6}
                  stroke="#5A8A3A" strokeWidth="1" opacity="0.6" />
                <circle cx={cluster.cx + ox} cy={cluster.cy + oy} r="2.5" fill={color} />
                <circle cx={cluster.cx + ox} cy={cluster.cy + oy} r="1" fill="#FFF" opacity="0.5" />
              </g>
            );
          })}
        </g>
      ))}

      {/* Walking path on hillside */}
      <path d="M 340,-15 Q 350,20 380,50 Q 400,70 380,100"
        fill="none" stroke="#B0A070" strokeWidth="3" opacity="0.25" />

      {/* Hillside shrubs (warmer) */}
      {[
        { x: 140, y: -10, s: 0.5 }, { x: 250, y: -15, s: 0.6 },
        { x: 480, y: -20, s: 0.55 }, { x: 650, y: -12, s: 0.5 },
        { x: 770, y: -8, s: 0.45 }, { x: 320, y: 5, s: 0.4 },
        { x: 560, y: 0, s: 0.5 }, { x: 820, y: -5, s: 0.4 },
      ].map((t, i) => (
        <g key={`ht-${i}`}>
          <ellipse cx={t.x} cy={t.y} rx={5 * t.s} ry={7 * t.s} fill="#3A7820" opacity="0.55" />
          <ellipse cx={t.x} cy={t.y - 3 * t.s} rx={4 * t.s} ry={5 * t.s} fill="#4A9030" opacity="0.45" />
        </g>
      ))}

      {/* ─── Green ground below hill ─── */}
      <rect x="30" y="85" width="900" height="520" fill="#3A8828" />
      <rect x="30" y="85" width="900" height="520" fill="url(#grassLight)" opacity="0.5" />

      {/* Sienna Park Dr road at base of hill */}
      <polygon points="30,95 930,75 930,88 30,108" fill="#8B7A60" opacity="0.3" />
      <line x1="30" y1="95" x2="930" y2="75" stroke="#9B8A70" strokeWidth="1.5" opacity="0.2" />
      <line x1="30" y1="108" x2="930" y2="88" stroke="#9B8A70" strokeWidth="1" opacity="0.15" />

      {/* ─── Sun (warm golden) ─── */}
      <circle cx="880" cy="-75" r="55" fill="url(#sunGlow)" />
      <circle cx="880" cy="-75" r="18" fill="#FFE8A0" />
      <circle cx="877" cy="-79" r="5" fill="#FFF8DC" opacity="0.5" />
      {/* Sun rays */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <line key={`ray-${angle}`}
          x1={880 + Math.cos(angle * Math.PI / 180) * 22}
          y1={-75 + Math.sin(angle * Math.PI / 180) * 22}
          x2={880 + Math.cos(angle * Math.PI / 180) * 30}
          y2={-75 + Math.sin(angle * Math.PI / 180) * 30}
          stroke="#FFE8A0" strokeWidth="1.5" opacity="0.3" strokeLinecap="round"
        />
      ))}

      {/* ─── Clouds (fluffy, warm tint) ─── */}
      {[
        { bx: 200, by: -55, s: 1.1, spd: 0.012 },
        { bx: 450, by: -65, s: 0.9, spd: 0.015 },
        { bx: 700, by: -58, s: 0.85, spd: 0.01 },
        { bx: 150, by: -45, s: 0.6, spd: 0.008 },
      ].map((c, i) => {
        const drift = (frame * c.spd) % 40 - 20;
        return (
          <g key={`cloud-${i}`} opacity={0.5} filter="url(#cloudSoft)">
            <ellipse cx={c.bx + drift - 12} cy={c.by + 4} rx={16 * c.s} ry={5 * c.s} fill="#FFF8F0" />
            <ellipse cx={c.bx + drift} cy={c.by} rx={22 * c.s} ry={7 * c.s} fill="#FFFCF4" />
            <ellipse cx={c.bx + drift + 14} cy={c.by + 3} rx={14 * c.s} ry={5 * c.s} fill="#FFF8F0" />
          </g>
        );
      })}

      {/* ═══ GROUND TILES (lush grass + dirt paths) ═══ */}
      {Array.from({ length: GRID_ROWS }).map((_, row) =>
        Array.from({ length: GRID_COLS }).map((_, col) => {
          const path = isPathTile(col, row);
          const fill = path
            ? ((row + col) % 2 === 0 ? "url(#pathLight)" : "url(#pathDark)")
            : ((row + col) % 2 === 0 ? "url(#grassLight)" : "url(#grassDark)");
          const stroke = path ? "#B89868" : "#3D8828";
          return (
            <polygon
              key={`tile-${row}-${col}`}
              points={tileDiamond(col, row)}
              fill={fill}
              stroke={stroke}
              strokeWidth="0.3"
              strokeOpacity="0.35"
            />
          );
        })
      )}

      {/* ═══ WOODEN FENCE (warm picket fence with gate arch) ═══ */}
      {(() => {
        const tl = gridToScreen(0, 0);
        const tr = gridToScreen(GRID_COLS, 0);
        const br = gridToScreen(GRID_COLS, GRID_ROWS);
        const bl = gridToScreen(0, GRID_ROWS);

        const edges = [
          { from: tl, to: tr, skip: { min: 3, max: 7 } }, // top edge — skip for gate
          { from: tr, to: br },                             // right edge
          { from: br, to: bl },                             // bottom edge
          { from: bl, to: tl },                             // left edge
        ];

        return (
          <g>
            {/* Fence rails along edges */}
            {edges.map((edge, ei) => {
              const steps = 12;
              const posts: { x: number; y: number }[] = [];
              for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = edge.from.x + t * (edge.to.x - edge.from.x);
                const y = edge.from.y + t * (edge.to.y - edge.from.y);

                // Skip gate opening on top edge
                if (ei === 0 && edge.skip) {
                  const gateStart = gridToScreen(edge.skip.min, 0);
                  const gateEnd = gridToScreen(edge.skip.max, 0);
                  if (x > gateStart.x && x < gateEnd.x) continue;
                }

                posts.push({ x, y });
              }

              return (
                <g key={`fence-edge-${ei}`}>
                  {/* Bottom rail */}
                  {posts.map((p, pi) => {
                    if (pi === 0) return null;
                    const prev = posts[pi - 1];
                    return (
                      <g key={`fp-${ei}-${pi}`}>
                        {/* Top rail */}
                        <line x1={prev.x} y1={prev.y - 6} x2={p.x} y2={p.y - 6}
                          stroke="#C4985C" strokeWidth="1.2" />
                        {/* Bottom rail */}
                        <line x1={prev.x} y1={prev.y - 2} x2={p.x} y2={p.y - 2}
                          stroke="#B88850" strokeWidth="1.2" />
                      </g>
                    );
                  })}
                  {/* Fence pickets */}
                  {posts.map((p, pi) => (
                    <g key={`picket-${ei}-${pi}`}>
                      {/* Post shadow */}
                      <rect x={p.x - 0.8} y={p.y - 8} width="2" height="10"
                        fill="#000" opacity="0.06" transform={`translate(0.5, 0.5)`} />
                      {/* Post */}
                      <rect x={p.x - 0.8} y={p.y - 8} width="2" height="10" rx="0.3"
                        fill="#D4A86C" />
                      {/* Post highlight */}
                      <rect x={p.x - 0.5} y={p.y - 7.5} width="0.8" height="9" rx="0.2"
                        fill="#E4C08C" opacity="0.4" />
                      {/* Pointed top */}
                      <polygon points={`${p.x - 0.8},${p.y - 8} ${p.x + 0.2},${p.y - 10} ${p.x + 1.2},${p.y - 8}`}
                        fill="#D4A86C" />
                    </g>
                  ))}
                </g>
              );
            })}

            {/* ═══ GATE ARCH (wooden arch with welcome) ═══ */}
            {(() => {
              const gLeft = gridToScreen(3, 0);
              const gRight = gridToScreen(7, 0);
              const gMid = { x: (gLeft.x + gRight.x) / 2, y: (gLeft.y + gRight.y) / 2 };
              const archH = 28;

              return (
                <g>
                  {/* Gate post shadows */}
                  <rect x={gLeft.x - 2} y={gLeft.y - archH - 2} width="5" height={archH + 5}
                    fill="#000" opacity="0.08" transform="translate(1,1)" />
                  <rect x={gRight.x - 2} y={gRight.y - archH - 2} width="5" height={archH + 5}
                    fill="#000" opacity="0.08" transform="translate(1,1)" />

                  {/* Left gate post */}
                  <rect x={gLeft.x - 2} y={gLeft.y - archH} width="4.5" height={archH + 2} rx="0.5"
                    fill="#A07840" />
                  <rect x={gLeft.x - 1.5} y={gLeft.y - archH} width="2" height={archH + 2} rx="0.3"
                    fill="#B88850" opacity="0.5" />
                  {/* Post cap */}
                  <circle cx={gLeft.x} cy={gLeft.y - archH - 1} r="3" fill="#C8985C" />
                  <circle cx={gLeft.x - 0.5} cy={gLeft.y - archH - 2} r="1" fill="#D8B880" opacity="0.4" />

                  {/* Right gate post */}
                  <rect x={gRight.x - 2} y={gRight.y - archH} width="4.5" height={archH + 2} rx="0.5"
                    fill="#A07840" />
                  <rect x={gRight.x - 1.5} y={gRight.y - archH} width="2" height={archH + 2} rx="0.3"
                    fill="#B88850" opacity="0.5" />
                  <circle cx={gRight.x} cy={gRight.y - archH - 1} r="3" fill="#C8985C" />
                  <circle cx={gRight.x - 0.5} cy={gRight.y - archH - 2} r="1" fill="#D8B880" opacity="0.4" />

                  {/* Arch beam */}
                  <line x1={gLeft.x} y1={gLeft.y - archH + 2}
                    x2={gRight.x} y2={gRight.y - archH + 2}
                    stroke="#A07840" strokeWidth="4" strokeLinecap="round" />
                  <line x1={gLeft.x} y1={gLeft.y - archH + 1}
                    x2={gRight.x} y2={gRight.y - archH + 1}
                    stroke="#B88850" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />

                  {/* Hanging sign board */}
                  <rect x={gMid.x - 30} y={gMid.y - archH + 5} width="60" height="14" rx="2"
                    fill="#8B5E34" />
                  <rect x={gMid.x - 28} y={gMid.y - archH + 6.5} width="56" height="11" rx="1"
                    fill="#FDF5E6" />
                  <text x={gMid.x} y={gMid.y - archH + 14} textAnchor="middle"
                    fill="#5A3A20" fontSize="5"
                    fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800"
                    letterSpacing="1">
                    WELCOME
                  </text>
                  {/* Hanging chains */}
                  <line x1={gMid.x - 20} y1={gMid.y - archH + 2}
                    x2={gMid.x - 20} y2={gMid.y - archH + 5}
                    stroke="#8B6934" strokeWidth="0.8" />
                  <line x1={gMid.x + 20} y1={gMid.y - archH + 2}
                    x2={gMid.x + 20} y2={gMid.y - archH + 5}
                    stroke="#8B6934" strokeWidth="0.8" />

                  {/* Pennant bunting across the gate */}
                  {(() => {
                    const buntingColors = ["#D94F4F", "#4A90CC", "#E0C830", "#4EAE5C", "#D86090", "#FFB347"];
                    const numFlags = 8;
                    const flags = [];
                    for (let i = 0; i < numFlags; i++) {
                      const t = (i + 0.5) / numFlags;
                      const fx = gLeft.x + t * (gRight.x - gLeft.x);
                      const fy = gLeft.y + t * (gRight.y - gLeft.y) - archH + 2;
                      const sag = Math.sin(t * Math.PI) * 4;
                      flags.push(
                        <polygon key={`bf-${i}`}
                          points={`${fx - 2.5},${fy + sag} ${fx + 2.5},${fy + sag} ${fx},${fy + sag + 5}`}
                          fill={buntingColors[i % buntingColors.length]}
                          opacity="0.85"
                        />
                      );
                    }
                    // String
                    const stringPts = Array.from({ length: 20 }, (_, i) => {
                      const t = i / 19;
                      const sx = gLeft.x + t * (gRight.x - gLeft.x);
                      const sy = gLeft.y + t * (gRight.y - gLeft.y) - archH + 2 + Math.sin(t * Math.PI) * 4;
                      return `${sx},${sy}`;
                    }).join(" ");
                    return (
                      <>
                        <polyline points={stringPts} fill="none" stroke="#8B6934" strokeWidth="0.5" />
                        {flags}
                      </>
                    );
                  })()}
                </g>
              );
            })()}
          </g>
        );
      })()}

      {/* ═══ PENNANT BUNTING (across the festival grounds) ═══ */}
      {[
        { gy: 2.5, color1: "#D94F4F", color2: "#4A90CC", color3: "#E0C830" },
        { gy: 6.5, color1: "#4EAE5C", color2: "#D86090", color3: "#FFB347" },
        { gy: 10.5, color1: "#40B8B0", color2: "#D4A830", color3: "#9B6FC0" },
      ].map((row, ri) => {
        const left = gridToScreen(0.5, row.gy);
        const right = gridToScreen(9.5, row.gy);
        const colors = [row.color1, row.color2, row.color3];
        const numFlags = 14;
        return (
          <g key={`bunting-${ri}`}>
            {/* String */}
            <polyline
              points={Array.from({ length: 25 }, (_, i) => {
                const t = i / 24;
                const x = left.x + t * (right.x - left.x);
                const y = left.y + t * (right.y - left.y) - 18 + Math.sin(t * Math.PI) * 3;
                return `${x},${y}`;
              }).join(" ")}
              fill="none" stroke="#A08060" strokeWidth="0.4" opacity="0.5"
            />
            {/* Flags */}
            {Array.from({ length: numFlags }, (_, i) => {
              const t = (i + 0.5) / numFlags;
              const x = left.x + t * (right.x - left.x);
              const y = left.y + t * (right.y - left.y) - 18 + Math.sin(t * Math.PI) * 3;
              const sway = Math.sin(frame * 0.02 + i * 0.5) * 0.5;
              return (
                <polygon key={`flag-${ri}-${i}`}
                  points={`${x - 2 + sway},${y} ${x + 2 + sway},${y} ${x + sway},${y + 4.5}`}
                  fill={colors[i % colors.length]}
                  opacity="0.7"
                />
              );
            })}
          </g>
        );
      })}

      {/* ═══ Cozy community hall (warm wood + brick) ═══ */}
      {(() => {
        const bPos = gridToScreen(9, -1.5);
        const bw = 55;
        const bh = 40;
        const roofH = 18;
        return (
          <g>
            <ellipse cx={bPos.x + 5} cy={bPos.y + 15} rx="30" ry="12" fill="#2A5010" opacity="0.1" />
            {/* Left wall (warm brick) */}
            <polygon
              points={`${bPos.x - bw / 2},${bPos.y} ${bPos.x},${bPos.y + bh / 3} ${bPos.x},${bPos.y + bh / 3 - roofH} ${bPos.x - bw / 2},${bPos.y - roofH}`}
              fill="#C8885C" />
            {/* Right wall */}
            <polygon
              points={`${bPos.x},${bPos.y + bh / 3} ${bPos.x + bw / 2},${bPos.y} ${bPos.x + bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y + bh / 3 - roofH}`}
              fill="#B87850" />
            {/* Warm roof */}
            <polygon
              points={`${bPos.x - bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y - roofH - 8} ${bPos.x + bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y + bh / 3 - roofH}`}
              fill="#8B5E34" />
            {/* Roof ridge */}
            <line x1={bPos.x} y1={bPos.y - roofH - 8}
              x2={bPos.x} y2={bPos.y + bh / 3 - roofH}
              stroke="#9B6E44" strokeWidth="0.8" />
            {/* Roof highlight */}
            <polygon
              points={`${bPos.x - bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y - roofH - 8} ${bPos.x},${bPos.y + bh / 3 - roofH}`}
              fill="#FFF" opacity="0.08" />
            {/* Door (warm wood) */}
            <rect x={bPos.x - 4} y={bPos.y + bh / 3 - 14} width="8" height="10" rx="1" fill="#6B4226" />
            <circle cx={bPos.x + 2} cy={bPos.y + bh / 3 - 8} r="0.6" fill="#D4B068" />
            {/* Windows (warm glow) */}
            <rect x={bPos.x - bw / 2 + 6} y={bPos.y - 10} width="6" height="5" rx="0.5" fill="#FFE8A0" opacity="0.7" />
            <rect x={bPos.x + bw / 2 - 14} y={bPos.y - 10} width="6" height="5" rx="0.5" fill="#FFE8A0" opacity="0.7" />
            {/* Window frames */}
            <rect x={bPos.x - bw / 2 + 6} y={bPos.y - 10} width="6" height="5" rx="0.5"
              fill="none" stroke="#8B5E34" strokeWidth="0.5" />
            <rect x={bPos.x + bw / 2 - 14} y={bPos.y - 10} width="6" height="5" rx="0.5"
              fill="none" stroke="#8B5E34" strokeWidth="0.5" />
            {/* Chimney */}
            <rect x={bPos.x + 8} y={bPos.y - roofH - 12} width="5" height="8" fill="#A06838" />
            <rect x={bPos.x + 7.5} y={bPos.y - roofH - 13} width="6" height="2" rx="0.5" fill="#B87848" />
            {/* Label */}
            <text x={bPos.x} y={bPos.y + bh / 3 + 8} textAnchor="middle"
              fill="#6B5A40" fontSize="3" fontFamily="system-ui, sans-serif" fontWeight="600"
              letterSpacing="0.8" opacity="0.8">SIGNAL HILL COMMUNITY CENTRE</text>
          </g>
        );
      })()}

      {/* ═══ ZONES (market stalls + SHCA table) ═══ */}
      {sortedZones.map((zone) => {
        const polys = isoBuildingPolys(zone.gx, zone.gy, zone.gw, zone.gd, zone.h);
        const isHovered = hoveredZone === zone.id;
        const isAvailable = zone.available === true;

        const bl = polys.leftCorner;
        const br = polys.bottomCorner;
        const bRight = polys.rightCorner;
        const bTop = polys.topCorner;
        const groundPts = `${bTop.x},${bTop.y} ${bRight.x},${bRight.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
        const cx = (bTop.x + br.x) / 2;
        const cy = (bTop.y + br.y) / 2;

        if (isAvailable) {
          // ─── Market stall with striped awning ───
          const awningColor = zone.awningColor || "#94A3B8";
          const postH = 18;
          const awningDrop = 6;

          return (
            <g key={zone.id}>
              {/* Ground shadow */}
              <polygon points={groundPts}
                fill="#2A4A10" opacity={isHovered ? "0.12" : "0.06"}
                style={{ transition: "opacity 0.2s" }}
              />

              {/* Wooden table/counter */}
              <polygon
                points={`${cx},${cy - 3} ${cx + 14},${cy + 1} ${cx},${cy + 5} ${cx - 14},${cy + 1}`}
                fill="#D4A86C" stroke="#A07840" strokeWidth="0.5"
              />
              {/* Table surface highlight */}
              <polygon
                points={`${cx},${cy - 3} ${cx + 14},${cy + 1} ${cx},${cy + 5} ${cx - 14},${cy + 1}`}
                fill="#FFF" opacity="0.1"
              />
              {/* Table legs */}
              <line x1={cx - 10} y1={cy + 2} x2={cx - 10} y2={cy + 7} stroke="#8B5E34" strokeWidth="1" />
              <line x1={cx + 10} y1={cy + 2} x2={cx + 10} y2={cy + 7} stroke="#8B5E34" strokeWidth="1" />

              {/* Wooden awning posts */}
              {[bTop, bRight, bl, br].map((p, pi) => (
                <g key={`post-${zone.id}-${pi}`}>
                  <line x1={p.x} y1={p.y} x2={p.x} y2={p.y - postH}
                    stroke="#7A4E28" strokeWidth="2.2" strokeLinecap="round" />
                  <line x1={p.x - 0.3} y1={p.y} x2={p.x - 0.3} y2={p.y - postH}
                    stroke="#9B6E44" strokeWidth="0.6" opacity="0.4" />
                </g>
              ))}

              {/* Awning (sloped diamond roof) */}
              <polygon
                points={`${bTop.x},${bTop.y - postH} ${bRight.x},${bRight.y - postH + awningDrop} ${br.x},${br.y - postH + awningDrop * 1.5} ${bl.x},${bl.y - postH + awningDrop}`}
                fill={awningColor} opacity="0.85"
              />
              {/* Awning stripes */}
              <polygon
                points={`${bTop.x},${bTop.y - postH} ${bRight.x},${bRight.y - postH + awningDrop} ${br.x},${br.y - postH + awningDrop * 1.5} ${bl.x},${bl.y - postH + awningDrop}`}
                fill="url(#stripes)" opacity="0.3"
              />
              {/* Awning scalloped edge (front) */}
              {Array.from({ length: 5 }, (_, i) => {
                const t = (i + 0.5) / 5;
                const ex = bl.x + t * (br.x - bl.x);
                const ey = bl.y + t * (br.y - bl.y) - postH + awningDrop + (awningDrop * 0.5 * t);
                return (
                  <ellipse key={`scallop-${zone.id}-${i}`}
                    cx={ex} cy={ey + 1} rx="3" ry="1.5"
                    fill={awningColor} opacity="0.75"
                  />
                );
              })}
              {/* Awning front face (depth strip) */}
              <polygon
                points={`${bl.x},${bl.y - postH + awningDrop} ${br.x},${br.y - postH + awningDrop * 1.5} ${br.x},${br.y - postH + awningDrop * 1.5 + 3} ${bl.x},${bl.y - postH + awningDrop + 3}`}
                fill={awningColor} opacity="0.65"
              />
              {/* Awning left face (depth strip) */}
              <polygon
                points={`${bTop.x},${bTop.y - postH} ${bl.x},${bl.y - postH + awningDrop} ${bl.x},${bl.y - postH + awningDrop + 3} ${bTop.x},${bTop.y - postH + 3}`}
                fill={awningColor} opacity="0.5"
              />
              {/* Awning shadow on ground */}
              <polygon
                points={`${bTop.x},${bTop.y - 1} ${bRight.x},${bRight.y - 1} ${br.x},${br.y - 1} ${bl.x},${bl.y - 1}`}
                fill="#1A4A10" opacity="0.06"
              />

              {/* Suggestion label on a little wooden sign */}
              <rect x={cx - 14} y={cy - 11} width="28" height="8" rx="1.5"
                fill="#FDF5E6" stroke="#A07840" strokeWidth="0.5" />
              <text
                x={cx}
                y={cy - 5}
                textAnchor="middle"
                fill="#6B4A28"
                fontSize="3.5"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="700"
                style={{ pointerEvents: "none" }}
              >
                {zone.suggestion || "Available"}
              </text>

              {/* Hover CTA */}
              {isHovered && (
                <g>
                  <rect x={cx - 22} y={cy + 10}
                    width="44" height="9" rx="4.5" fill={awningColor} opacity="0.9" />
                  <rect x={cx - 22} y={cx + 10}
                    width="44" height="4.5" rx="4.5" fill="#FFF" opacity="0.15" />
                  <text x={cx} y={cy + 16.5}
                    textAnchor="middle" fill="#FFF" fontSize="3.2"
                    fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700"
                    style={{ pointerEvents: "none" }}>
                    APPLY AS VENDOR
                  </text>
                </g>
              )}

              {/* Click target */}
              <polygon points={groundPts}
                fill="transparent" className="cursor-pointer"
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                onClick={() => handleZoneClick(zone)}
              />
            </g>
          );
        }

        // ─── SHCA Info: cozy market table with warm banner ───
        return (
          <g key={zone.id}>
            <polygon points={groundPts}
              fill="#4A8830" opacity={isHovered ? "0.12" : "0.06"}
              style={{ transition: "opacity 0.2s" }}
            />

            {/* Table */}
            <polygon
              points={`${cx},${cy - 6} ${cx + 18},${cy - 0} ${cx},${cy + 6} ${cx - 18},${cy}`}
              fill="#D4B880" stroke="#A08050" strokeWidth="0.5"
            />
            <polygon
              points={`${cx},${cy - 6} ${cx + 18},${cy - 0} ${cx},${cy + 6} ${cx - 18},${cy}`}
              fill="#FFF" opacity="0.1"
            />
            <line x1={cx - 14} y1={cy + 1} x2={cx - 14} y2={cy + 7} stroke="#8B5E34" strokeWidth="1" />
            <line x1={cx + 14} y1={cy + 1} x2={cx + 14} y2={cy + 7} stroke="#8B5E34" strokeWidth="1" />
            <line x1={cx - 5} y1={cy + 5} x2={cx - 5} y2={cy + 11} stroke="#8B5E34" strokeWidth="1" />
            <line x1={cx + 5} y1={cy + 5} x2={cx + 5} y2={cy + 11} stroke="#8B5E34" strokeWidth="1" />
            <ellipse cx={cx} cy={cy + 12} rx="16" ry="4" fill="#2A4A10" opacity="0.06" />

            {/* SHCA banner (warm parchment) */}
            <rect x={cx - 14} y={cy - 13} width="28" height="10" rx="2"
              fill="#FDF5E6" stroke="#5B8EC9" strokeWidth="0.5" />
            <text x={cx} y={cy - 5.5} textAnchor="middle"
              fill="#2A5090" fontSize="6" fontFamily="system-ui, sans-serif" fontWeight="800">
              SHCA
            </text>

            {/* Brochures */}
            <rect x={cx - 8} y={cy - 2} width="4" height="3" rx="0.3"
              fill="#A8D0F0" transform={`rotate(-10, ${cx - 6}, ${cy})`} />
            <rect x={cx + 2} y={cy - 1} width="4" height="3" rx="0.3"
              fill="#80B8E8" transform={`rotate(5, ${cx + 4}, ${cy})`} />
            <rect x={cx + 8} y={cy - 2} width="3.5" height="2.5" rx="0.3"
              fill="#C0E0F8" transform={`rotate(-3, ${cx + 10}, ${cy})`} />

            {/* Flag pole */}
            <line x1={cx + 20} y1={cy - 2} x2={cx + 20} y2={cy - 22}
              stroke="#8B5E34" strokeWidth="0.8" />
            <polygon
              points={`${cx + 21},${cy - 22} ${cx + 30},${cy - 19} ${cx + 21},${cy - 16}`}
              fill="#3B7AC9" />

            {/* Label */}
            <text x={cx} y={cy + 18} textAnchor="middle"
              fill={isHovered ? "#5B8EC9" : "#6B5A40"} fontSize="4"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600"
              style={{ pointerEvents: "none", transition: "fill 0.2s" }}>
              SHCA INFO TABLE
            </text>

            <polygon points={groundPts} fill="transparent" className="cursor-pointer"
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(zone)}
            />
          </g>
        );
      })}

      {/* ═══ PROPS ═══ */}
      <IsoTrashBin gx={6} gy={0.5} />
      <IsoTrashBin gx={10} gy={0.5} />
      <IsoBench gx={2} gy={2.3} />
      <IsoBench gx={8} gy={2.3} />
      <IsoLantern gx={0.2} gy={2} frame={frame} />
      <IsoLantern gx={9.8} gy={2} frame={frame} />
      <IsoLantern gx={0.2} gy={6} frame={frame} />
      <IsoLantern gx={9.8} gy={6} frame={frame} />
      <IsoLantern gx={0.2} gy={10} frame={frame} />
      <IsoLantern gx={9.8} gy={10} frame={frame} />
      <IsoLantern gx={0.2} gy={14} frame={frame} />
      <IsoLantern gx={9.8} gy={14} frame={frame} />

      {/* ═══ FLOWERS ═══ */}
      {FLOWER_PATCHES.map((f, i) => (
        <FlowerPatch key={`flower-${i}`} gx={f.gx} gy={f.gy} colors={f.colors} frame={frame} />
      ))}

      {/* ═══ TREES ═══ */}
      {TREE_POSITIONS.map((t, i) => (
        <IsoTree key={`tree-${i}`} gx={t.gx} gy={t.gy} size={t.size} />
      ))}

      {/* ═══ CHARACTERS ═══ */}
      {projectedChars.map((mc) => (
        <TinyGuest
          key={mc.id}
          x={mc.iso.x}
          y={mc.iso.y}
          color={mc.color}
          type={mc.type}
          walkFrame={mc.walkFrame}
          frameCounter={mc.frameCounter}
          facing={mc.facing}
          name={mc.name}
        />
      ))}

      {/* ═══ GUEST COUNT BADGE (warm wooden) ═══ */}
      {movingChars.length > 0 && (() => {
        const badgePos = gridToScreen(GRID_COLS - 1, GRID_ROWS - 0.5);
        return (
          <g>
            <rect x={badgePos.x - 30} y={badgePos.y + 8}
              width="60" height="13" rx="3" fill="#8B5E34" opacity="0.9" />
            <rect x={badgePos.x - 28} y={badgePos.y + 9.5}
              width="56" height="10" rx="2" fill="#FDF5E6" />
            <text x={badgePos.x} y={badgePos.y + 17}
              textAnchor="middle" fill="#5A3A20" fontSize="4.5"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700">
              {movingChars.length} Guests
            </text>
          </g>
        );
      })()}

      {/* ═══ WOODEN STAT PANELS (right side) ═══ */}
      {stats && (() => {
        const TARGETS_DISPLAY = { rsvps: 200, volunteers: 30, vendors: 10 };
        const baseX = 795;
        const baseY = 195;
        const gap = 58;
        return (
          <g>
            <WoodenStatPanel
              x={baseX} y={baseY}
              label="GUESTS" icon="🌻"
              current={stats.rsvps} target={TARGETS_DISPLAY.rsvps}
              color="#4EAE5C"
              href="/rsvp"
            />
            <WoodenStatPanel
              x={baseX} y={baseY + gap}
              label="VOLUNTEERS" icon="🌾"
              current={stats.volunteers} target={TARGETS_DISPLAY.volunteers}
              color="#5B8EC9"
              href="/volunteer"
            />
            <WoodenStatPanel
              x={baseX} y={baseY + gap * 2}
              label="VENDORS" icon="🏕️"
              current={stats.vendors} target={TARGETS_DISPLAY.vendors}
              color="#D86090"
              href="/vendor"
            />
          </g>
        );
      })()}

      {/* ═══ HAND-PAINTED WOODEN SIGN (on hillside) ═══ */}
      {(() => {
        const sx = 620;
        const sy = -72;
        const boardW = 180;
        const boardH = 105;

        return (
          <g>
            {/* Wooden posts */}
            <rect x={sx + 22} y={sy + boardH - 2} width="5" height="42" rx="1" fill="#8B5E34" />
            <rect x={sx + 23.5} y={sy + boardH - 2} width="1.8" height="42" rx="0.5"
              fill="#9B6E44" opacity="0.4" />
            <rect x={sx + boardW - 27} y={sy + boardH - 2} width="5" height="42" rx="1" fill="#8B5E34" />
            <rect x={sx + boardW - 25.5} y={sy + boardH - 2} width="1.8" height="42" rx="0.5"
              fill="#9B6E44" opacity="0.4" />
            {/* Ground shadow */}
            <ellipse cx={sx + boardW / 2} cy={sy + boardH + 40} rx="42" ry="5" fill="#2A4A10" opacity="0.1" />

            {/* Main board (warm wood) */}
            <rect x={sx} y={sy} width={boardW} height={boardH} rx="4" fill="#A07840" />
            <rect x={sx + 2} y={sy + 2} width={boardW - 4} height={boardH - 4} rx="3" fill="#C4985C" />
            {/* Wood grain */}
            <line x1={sx + 5} y1={sy + boardH * 0.25} x2={sx + boardW - 5} y2={sy + boardH * 0.25}
              stroke="#B08848" strokeWidth="0.5" opacity="0.3" />
            <line x1={sx + 5} y1={sy + boardH * 0.5} x2={sx + boardW - 5} y2={sy + boardH * 0.5}
              stroke="#B08848" strokeWidth="0.5" opacity="0.3" />
            <line x1={sx + 5} y1={sy + boardH * 0.75} x2={sx + boardW - 5} y2={sy + boardH * 0.75}
              stroke="#B08848" strokeWidth="0.5" opacity="0.3" />
            {/* Inner parchment area */}
            <rect x={sx + 8} y={sy + 8} width={boardW - 16} height={boardH - 16} rx="3"
              fill="#FDF5E6" />
            {/* Corner bolts */}
            <circle cx={sx + 12} cy={sy + 12} r="2.5" fill="#D4B068" />
            <circle cx={sx + boardW - 12} cy={sy + 12} r="2.5" fill="#D4B068" />
            <circle cx={sx + 12} cy={sy + boardH - 12} r="2.5" fill="#D4B068" />
            <circle cx={sx + boardW - 12} cy={sy + boardH - 12} r="2.5" fill="#D4B068" />
            <circle cx={sx + 12} cy={sy + 12} r="1" fill="#E4C880" opacity="0.5" />
            <circle cx={sx + boardW - 12} cy={sy + 12} r="1" fill="#E4C880" opacity="0.5" />

            {/* Hand-painted text */}
            <text x={sx + boardW / 2} y={sy + 26} textAnchor="middle"
              fill="#5A3A20" fontSize="12"
              fontFamily="Georgia, 'Times New Roman', serif" fontWeight="900"
              letterSpacing="2">
              SIGNAL HILL
            </text>
            <text x={sx + boardW / 2} y={sy + 42} textAnchor="middle"
              fill="#5A3A20" fontSize="12"
              fontFamily="Georgia, 'Times New Roman', serif" fontWeight="900"
              letterSpacing="2">
              NEIGHBOUR
            </text>
            <text x={sx + boardW / 2} y={sy + 56} textAnchor="middle"
              fill="#5A3A20" fontSize="12"
              fontFamily="Georgia, 'Times New Roman', serif" fontWeight="900"
              letterSpacing="2">
              DAY
            </text>

            {/* Decorative divider (hand-drawn feel) */}
            <line x1={sx + 25} y1={sy + 62} x2={sx + boardW - 25} y2={sy + 62}
              stroke="#C4985C" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
            {/* Little flower ornament */}
            <circle cx={sx + boardW / 2} cy={sy + 62} r="2.5" fill="#FDF5E6" />
            <circle cx={sx + boardW / 2} cy={sy + 62} r="1.5" fill="#D86090" opacity="0.7" />

            {/* Date + time */}
            <text x={sx + boardW / 2} y={sy + 76} textAnchor="middle"
              fill="#8B6A40" fontSize="9"
              fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700"
              letterSpacing="1.5">
              JUNE 20, 2026
            </text>
            <text x={sx + boardW / 2} y={sy + 89} textAnchor="middle"
              fill="#8B6A40" fontSize="8"
              fontFamily="Georgia, 'Times New Roman', serif" fontWeight="600"
              letterSpacing="1">
              11 AM - 4 PM
            </text>

            {/* Tiny leaf decorations in corners */}
            <text x={sx + 18} y={sy + boardH - 16} fontSize="6" fill="#4A8830" opacity="0.5">🌿</text>
            <text x={sx + boardW - 24} y={sy + boardH - 16} fontSize="6" fill="#4A8830" opacity="0.5">🌿</text>
          </g>
        );
      })()}

      {/* ═══ BUTTERFLIES (ambient life) ═══ */}
      {[
        { bx: 200, by: 180, spd: 0.03, amp: 30 },
        { bx: 500, by: 250, spd: 0.025, amp: 25 },
        { bx: 700, by: 300, spd: 0.035, amp: 20 },
      ].map((b, i) => {
        const bx = b.bx + Math.sin(frame * b.spd + i * 2) * b.amp;
        const by = b.by + Math.cos(frame * b.spd * 0.7 + i * 3) * 15;
        const wingFlap = Math.sin(frame * 0.15 + i) * 2;
        const bColors = ["#FFB347", "#FF6B9D", "#A0D2FF"];
        return (
          <g key={`butterfly-${i}`} opacity="0.6">
            {/* Left wing */}
            <ellipse cx={bx - wingFlap} cy={by - 0.5} rx="2" ry="1.2"
              fill={bColors[i]} transform={`rotate(-15, ${bx - wingFlap}, ${by})`} />
            {/* Right wing */}
            <ellipse cx={bx + wingFlap} cy={by - 0.5} rx="2" ry="1.2"
              fill={bColors[i]} transform={`rotate(15, ${bx + wingFlap}, ${by})`} />
            {/* Body */}
            <ellipse cx={bx} cy={by} rx="0.5" ry="1" fill="#3A2A18" />
          </g>
        );
      })}
    </svg>
  );
}
