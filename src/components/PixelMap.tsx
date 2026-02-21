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
  TILE_W, TILE_H, HALF_W, HALF_H,
  GRID_COLS, GRID_ROWS,
  gridToScreen, tileDiamond, isoBuildingPolys, worldToIso,
  leftWallPoint, rightWallPoint,
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
  available?: boolean; // true = open vendor spot, no one signed up yet
  suggestion?: string; // suggested booth theme for available spots
}

const ISO_ZONES: IsoZone[] = [
  // ─── Near entrance (top of rink) — SHCA Info table ───
  {
    id: "info", label: "SHCA Info",
    gx: 3, gy: 0.5, gw: 3, gd: 2, h: 16,
    colors: { roof: "#60A5FA", leftWall: "#3B82F6", rightWall: "#2563EB" },
    description: "Signal Hill Community Association – info, membership & welcome!",
  },
  // ─── Upper area (gy 3-5) ───
  {
    id: "spot-1", label: "Available Spot",
    gx: 0.5, gy: 3, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Perfect for kids activities, bounce houses, or crafts!",
    available: true, suggestion: "Kids Activity",
  },
  {
    id: "spot-2", label: "Available Spot",
    gx: 4, gy: 3, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Great for a local artisan, face painter, or henna artist!",
    available: true, suggestion: "Arts & Crafts",
  },
  {
    id: "spot-3", label: "Available Spot",
    gx: 7, gy: 3, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Ideal for yard games, sports demos, or fitness activities!",
    available: true, suggestion: "Games & Fun",
  },
  // ─── Middle area (gy 7-9) ───
  {
    id: "spot-4", label: "Available Spot",
    gx: 0.5, gy: 7, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Perfect for pet services, animal rescue, or a petting zoo!",
    available: true, suggestion: "Pet Friendly",
  },
  {
    id: "spot-5", label: "Available Spot",
    gx: 3.5, gy: 7, gw: 3, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Ideal for food trucks, BBQ, lemonade, or bake sales!",
    available: true, suggestion: "Food & Drink",
  },
  {
    id: "spot-6", label: "Available Spot",
    gx: 7, gy: 7, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Great for live music, DJ, or entertainment performances!",
    available: true, suggestion: "Entertainment",
  },
  // ─── Lower area (gy 11-13) ───
  {
    id: "spot-7", label: "Available Spot",
    gx: 0.5, gy: 11, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Open for health & wellness, yoga, or fitness demos!",
    available: true, suggestion: "Wellness",
  },
  {
    id: "spot-8", label: "Available Spot",
    gx: 3.5, gy: 11, gw: 3, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Perfect for sponsors, local businesses, or community groups!",
    available: true, suggestion: "Sponsor Booth",
  },
  {
    id: "spot-9", label: "Available Spot",
    gx: 7, gy: 11, gw: 2.5, gd: 2, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Prime location in the rink — great for any vendor!",
    available: true, suggestion: "Local Biz",
  },
  // ─── Bottom area (gy 14-15) ───
  {
    id: "spot-10", label: "Available Spot",
    gx: 3, gy: 14, gw: 3, gd: 1.5, h: 14,
    colors: { roof: "#94A3B8", leftWall: "#64748B", rightWall: "#475569" },
    description: "Excellent spot for community groups or sponsors!",
    available: true, suggestion: "Open",
  },
];

// ─── Path tile coordinates for 10×16 grid ─────
function isPathTile(col: number, row: number): boolean {
  // Entrance path from top (col 4-5, row 0-2)
  if ((col === 4 || col === 5) && row >= 0 && row <= 2) return true;
  // Main vertical path down center (col 5, row 2-15)
  if (col === 5 && row >= 2 && row <= 15) return true;
  // Horizontal connectors at various rows
  if (row === 2 && col >= 0 && col < 10) return true;  // top cross path
  if (row === 6 && col >= 0 && col < 10) return true;  // middle cross path
  if (row === 10 && col >= 0 && col < 10) return true; // lower cross path
  if (row === 13 && col >= 2 && col <= 8) return true;  // bottom connector
  return false;
}

// ─── Tree positions — around perimeter of the rink ───
const TREE_POSITIONS: { gx: number; gy: number; size: number }[] = [
  // South/bottom edge (high gy)
  { gx: 1, gy: 16, size: 1.1 },
  { gx: 3, gy: 16.5, size: 1.3 },
  { gx: 5, gy: 16.8, size: 0.9 },
  { gx: 7, gy: 16.5, size: 1.0 },
  { gx: 9, gy: 16, size: 1.1 },
  // West/left edge (low gx)
  { gx: -0.5, gy: 3, size: 1.0 },
  { gx: -0.8, gy: 6, size: 1.1 },
  { gx: -0.5, gy: 9, size: 0.9 },
  { gx: -0.8, gy: 12, size: 1.0 },
  { gx: -0.5, gy: 15, size: 0.9 },
  // East/right edge (high gx)
  { gx: 10.3, gy: 4, size: 0.8 },
  { gx: 10.5, gy: 8, size: 0.9 },
  { gx: 10.3, gy: 12, size: 0.8 },
];

// ─── Tiny isometric guest (smooth, rounded ~8px tall) ──────────
function TinyGuest({ x, y, color, type, walkFrame, frameCounter, facing, name }: {
  x: number; y: number; color: string; type: string;
  walkFrame: number; frameCounter: number; facing: string; name: string;
}) {
  const bob = Math.sin(frameCounter * 0.1) * 0.5;
  const flip = facing === "left" ? -1 : 1;
  const legOff = walkFrame === 0 ? 0.5 : -0.5;

  // Balloon colors for RSVPs
  const balloonColors = ["#FFD700", "#FF6B6B", "#4FC3F7", "#81C784", "#FFB74D"];
  const balloonColor = balloonColors[Math.abs(name.charCodeAt(0)) % balloonColors.length];
  const balloonSway = Math.sin(frameCounter * 0.05 + name.charCodeAt(0)) * 1.5;

  return (
    <g transform={`translate(${x}, ${y})`}>
      <title>{name} ({type})</title>
      {/* Shadow */}
      <ellipse cx="0" cy="3" rx="3" ry="1.2" fill="#000" opacity="0.15" />
      {/* Legs */}
      <rect x={-1.2 + legOff * flip} y={bob + 0.5} width="1" height="2.5" rx="0.4" fill="#2D3748" />
      <rect x={0.2 - legOff * flip} y={bob + 0.5} width="1" height="2.5" rx="0.4" fill="#2D3748" />
      {/* Shoes */}
      <rect x={-1.5 + legOff * flip} y={bob + 2.5} width="1.5" height="0.8" rx="0.3" fill="#5A3A1A" />
      <rect x={0 - legOff * flip} y={bob + 2.5} width="1.5" height="0.8" rx="0.3" fill="#5A3A1A" />
      {/* Body */}
      <rect x="-1.5" y={bob - 3} width="3" height="3.5" rx="0.6" fill={color} />
      {/* Body shine */}
      <rect x="-1" y={bob - 2.8} width="1" height="2" rx="0.4" fill="#FFF" opacity="0.1" />
      {/* Head */}
      <ellipse cx="0" cy={bob - 4.2} rx="1.4" ry="1.5" fill="#FFE0BD" />
      {/* Eyes */}
      <circle cx={flip > 0 ? -0.4 : 0} cy={bob - 4.3} r="0.35" fill="#1A202C" />
      <circle cx={flip > 0 ? 0.5 : 0.9} cy={bob - 4.3} r="0.35" fill="#1A202C" />

      {/* RSVP: balloon */}
      {type === "rsvp" && (
        <>
          <line x1="0" y1={bob - 5.5} x2={balloonSway * 0.4} y2={bob - 13}
            stroke="#94A3B8" strokeWidth="0.25" />
          <ellipse cx={balloonSway * 0.6} cy={bob - 15} rx="2.2" ry="2.8"
            fill={balloonColor} opacity="0.8" />
          <ellipse cx={balloonSway * 0.6 - 0.6} cy={bob - 16.2} rx="0.7" ry="1"
            fill="#FFF" opacity="0.35" />
        </>
      )}
      {/* VIP: crown */}
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
      {/* Volunteer: hard hat */}
      {type === "volunteer" && (
        <>
          <rect x="-1.8" y={bob - 6.2} width="3.8" height="1.2" rx="0.6" fill="#FBBF24" />
          <rect x="-1.2" y={bob - 6.5} width="2.6" height="0.5" rx="0.2" fill="#FCD34D" />
        </>
      )}
      {/* Vendor: chef hat */}
      {type === "vendor" && (
        <>
          <rect x="-1.2" y={bob - 6.5} width="2.6" height="1.2" rx="0.2" fill="#F0FDF4" />
          <ellipse cx="0" cy={bob - 7.5} rx="1.5" ry="1.2" fill="#F8FFFE" />
        </>
      )}
    </g>
  );
}

// ─── Isometric tree (smooth, layered canopy) ──────────────────
function IsoTree({ gx, gy, size }: { gx: number; gy: number; size: number }) {
  const pos = gridToScreen(gx, gy);
  const s = size;
  return (
    <g>
      {/* Ground shadow */}
      <ellipse cx={pos.x + 2 * s} cy={pos.y + 3} rx={7 * s} ry={3.5 * s}
        fill="#000" opacity="0.1" />
      {/* Trunk */}
      <rect x={pos.x - 1.5 * s} y={pos.y - 5 * s} width={3 * s} height={8 * s}
        rx={0.8 * s} fill="#6B4226" />
      <rect x={pos.x - 0.8 * s} y={pos.y - 5 * s} width={1.2 * s} height={8 * s}
        rx={0.4 * s} fill="#7C5030" opacity="0.5" />
      {/* Canopy layers – soft, organic shapes */}
      <ellipse cx={pos.x + 1 * s} cy={pos.y - 6 * s} rx={7.5 * s} ry={5.5 * s}
        fill="#2A5A14" />
      <ellipse cx={pos.x - 0.5 * s} cy={pos.y - 8 * s} rx={6.5 * s} ry={5 * s}
        fill="#337A1C" />
      <ellipse cx={pos.x + 0.8 * s} cy={pos.y - 10 * s} rx={5 * s} ry={4 * s}
        fill="#3D8B24" />
      <ellipse cx={pos.x} cy={pos.y - 12 * s} rx={3.8 * s} ry={3 * s}
        fill="#4A9C2E" />
      {/* Highlight – sunlight catching the top */}
      <ellipse cx={pos.x - 1 * s} cy={pos.y - 11 * s} rx={2.2 * s} ry={1.5 * s}
        fill="#5CB838" opacity="0.45" />
      <ellipse cx={pos.x + 0.5 * s} cy={pos.y - 12.5 * s} rx={1.2 * s} ry={0.8 * s}
        fill="#72D050" opacity="0.3" />
    </g>
  );
}

// ─── Zone ground decorations (SHCA table only — all other spots are available) ──
function BuildingDecor({ zone }: { zone: IsoZone }) {
  if (zone.id !== "info") return null;
  const polys = isoBuildingPolys(zone.gx, zone.gy, zone.gw, zone.gd, zone.h);
  const tableAt = (u: number, v: number, color: string) => {
    const cx = polys.topCorner.x + u * (polys.rightCorner.x - polys.topCorner.x) + v * (polys.leftCorner.x - polys.topCorner.x);
    const cy = polys.topCorner.y + u * (polys.rightCorner.y - polys.topCorner.y) + v * (polys.leftCorner.y - polys.topCorner.y);
    return (
      <g>
        <ellipse cx={cx} cy={cy + 2} rx="5" ry="2" fill="#000" opacity="0.06" />
        <polygon
          points={`${cx},${cy - 3} ${cx + 5},${cy - 1} ${cx},${cy + 1} ${cx - 5},${cy - 1}`}
          fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="0.3"
        />
        <line x1={cx - 3} y1={cy - 1} x2={cx - 3} y2={cy + 2} stroke="#6B4226" strokeWidth="0.6" />
        <line x1={cx + 3} y1={cy - 1} x2={cx + 3} y2={cy + 2} stroke="#6B4226" strokeWidth="0.6" />
      </g>
    );
  };
  return (
    <g>
      {tableAt(0.45, 0.45, "#BFDBFE")}
      {tableAt(0.7, 0.6, "#DBEAFE")}
      <rect x={polys.roofCenter.x - 12} y={polys.roofCenter.y - 6} width="24" height="8" rx="1.5"
        fill="#F8FAFC" opacity="0.9" />
      <text x={polys.roofCenter.x} y={polys.roofCenter.y + 0.5} textAnchor="middle"
        fill="#1D4ED8" fontSize="5" fontFamily="system-ui, sans-serif" fontWeight="800">SHCA</text>
      <line x1={polys.rTopCorner.x + 8} y1={polys.rTopCorner.y}
        x2={polys.rTopCorner.x + 8} y2={polys.rTopCorner.y - 16}
        stroke="#475569" strokeWidth="0.8" />
      <polygon
        points={`${polys.rTopCorner.x + 9},${polys.rTopCorner.y - 16} ${polys.rTopCorner.x + 16},${polys.rTopCorner.y - 13.5} ${polys.rTopCorner.x + 9},${polys.rTopCorner.y - 11}`}
        fill="#2563EB" />
    </g>
  );
}

// ─── Bench along paths ─────────────────────────────────────────
function IsoBench({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={pos.x} cy={pos.y + 4} rx="6" ry="1.5" fill="#000" opacity="0.08" />
      {/* Seat */}
      <rect x={pos.x - 5} y={pos.y - 2} width="10" height="2.5" rx="0.5"
        fill="#B8845C" stroke="rgba(0,0,0,0.15)" strokeWidth="0.4" />
      {/* Seat highlight */}
      <rect x={pos.x - 4.5} y={pos.y - 1.8} width="9" height="0.8" rx="0.3"
        fill="#C8946C" opacity="0.6" />
      {/* Legs */}
      <rect x={pos.x - 4} y={pos.y + 0.5} width="1.5" height="3" rx="0.3" fill="#6B4226" />
      <rect x={pos.x + 2.5} y={pos.y + 0.5} width="1.5" height="3" rx="0.3" fill="#6B4226" />
    </g>
  );
}

// ─── Lamp post ──────────────────────────────────────────────────
function IsoLamp({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      {/* Glow on ground */}
      <ellipse cx={pos.x + 0.5} cy={pos.y + 1} rx="5" ry="2" fill="#FBBF24" opacity="0.04" />
      {/* Post */}
      <rect x={pos.x - 0.4} y={pos.y - 14} width="1.2" height="14" rx="0.4" fill="#6B6B6B" />
      <rect x={pos.x - 0.1} y={pos.y - 14} width="0.5" height="14" rx="0.2"
        fill="#808080" opacity="0.4" />
      {/* Lamp housing */}
      <rect x={pos.x - 2.5} y={pos.y - 16} width="6" height="2.2" rx="1" fill="#808080" />
      {/* Light glow */}
      <circle cx={pos.x + 0.5} cy={pos.y - 14.8} r="5" fill="#FBBF24" opacity="0.06" />
      <circle cx={pos.x + 0.5} cy={pos.y - 15} r="1.8" fill="#FDE68A" opacity="0.45" />
    </g>
  );
}

// ─── Trash bin ──────────────────────────────────────────────────
function IsoTrashBin({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={pos.x} cy={pos.y + 1} rx="3" ry="1" fill="#000" opacity="0.08" />
      {/* Body */}
      <rect x={pos.x - 2} y={pos.y - 5} width="4" height="5" rx="0.5"
        fill="#5B6573" stroke="rgba(0,0,0,0.12)" strokeWidth="0.4" />
      {/* Lid */}
      <rect x={pos.x - 2.5} y={pos.y - 6} width="5" height="1.3" rx="0.6" fill="#7B8290" />
    </g>
  );
}

// ─── Game-style stat bar ──────────────────────────────────────────
function GameStatBar({ x, y, label, icon, current, target, color, accentColor, href }: {
  x: number; y: number; label: string; icon: string;
  current: number; target: number; color: string; accentColor: string; href: string;
}) {
  const panelW = 128;
  const panelH = 54;
  const barW = 90;
  const barH = 8;
  const pct = Math.min(100, target > 0 ? (current / target) * 100 : 0);

  return (
    <g>
      {/* Panel background */}
      <rect x={x} y={y} width={panelW} height={panelH} rx="5" fill="#0A0F1E" opacity="0.9" />
      <rect x={x} y={y} width={panelW} height={panelH} rx="5" fill="none"
        stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />
      {/* Top accent bar */}
      <rect x={x} y={y} width={panelW} height="2" rx="5" fill={color} opacity="0.5" />

      {/* Icon + label row */}
      <text x={x + 8} y={y + 14} fill="#FFF" fontSize="9" fontFamily="system-ui, sans-serif">
        {icon}
      </text>
      <text x={x + 22} y={y + 14.5} fill={color} fontSize="6.5"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" letterSpacing="0.8">
        {label}
      </text>

      {/* Count display — big number */}
      <text x={x + panelW - 8} y={y + 15} textAnchor="end"
        fill="#FFF" fontSize="9"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900"
        style={{ fontVariantNumeric: "tabular-nums" } as React.CSSProperties}>
        {current}
        <tspan fill="#64748B" fontSize="5">/{target}</tspan>
      </text>

      {/* HP-style segmented bar */}
      <rect x={x + 8} y={y + 20} width={barW} height={barH} rx="4" fill="#1E293B" />
      {Array.from({ length: 10 }).map((_, i) => {
        const segX = x + 9 + i * (barW - 2) / 10;
        const segW = (barW - 2) / 10 - 1;
        const filled = pct >= (i + 1) * 10;
        const partial = !filled && pct > i * 10;
        return (
          <rect key={i}
            x={segX} y={y + 21.5}
            width={segW} height={barH - 3} rx="1.5"
            fill={filled ? color : partial ? color : "#0F172A"}
            opacity={filled ? 0.9 : partial ? 0.4 : 0.3}
          />
        );
      })}
      {/* Bar glow */}
      <rect x={x + 8} y={y + 20} width={barW * pct / 100} height={barH / 2} rx="3"
        fill="#FFF" opacity="0.1" />

      {/* Percentage */}
      <text x={x + 8 + barW + 6} y={y + 27} fill={color} fontSize="5"
        fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800"
        style={{ fontVariantNumeric: "tabular-nums" } as React.CSSProperties}>
        {pct.toFixed(0)}%
      </text>

      {/* Action button — bigger */}
      <a href={href} className="cursor-pointer">
        <rect x={x + 8} y={y + 34} width={panelW - 16} height="14" rx="7"
          fill={color} opacity="0.9" className="hover:opacity-100 transition-opacity" />
        <rect x={x + 8} y={y + 34} width={panelW - 16} height="7" rx="7"
          fill="#FFF" opacity="0.1" />
        <text x={x + panelW / 2} y={y + 43.5} textAnchor="middle"
          fill="#052E16" fontSize="5.5"
          fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900"
          letterSpacing="0.5" style={{ pointerEvents: "none" }}>
          {label === "GUESTS" ? "RSVP NOW →" : label === "VOLUNTEERS" ? "SIGN UP →" : "APPLY →"}
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

export default function PixelMap({ onZoneSelect, stats, onStatClick }: PixelMapProps) {
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

  // Project characters to isometric and sort by depth
  const projectedChars = movingChars
    .map((c) => ({ ...c, iso: worldToIso(c.x, c.y) }))
    .sort((a, b) => a.iso.y - b.iso.y);

  // Sort buildings back-to-front for painter's algorithm
  const sortedZones = [...ISO_ZONES].sort((a, b) => (a.gx + a.gy) - (b.gx + b.gy));

  return (
    <svg
      viewBox="30 -80 900 580"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* ═══ SKY GRADIENT ═══ */}
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#87CEEB" />
          <stop offset="40%" stopColor="#B0E0F0" />
          <stop offset="70%" stopColor="#C8ECD0" />
          <stop offset="100%" stopColor="#A8D5A0" />
        </linearGradient>

        {/* ═══ BUILDING SHADOW FILTER ═══ */}
        <filter id="buildingShadow" x="-20%" y="-10%" width="150%" height="140%">
          <feDropShadow dx="3" dy="4" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>

        {/* ═══ SOFT GLOW for lights ═══ */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ═══ SUN GLOW ═══ */}
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF8DC" stopOpacity="1" />
          <stop offset="40%" stopColor="#FFE066" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FFE066" stopOpacity="0" />
        </radialGradient>

        {/* ═══ RINK/CONCRETE SURFACE GRADIENTS ═══ */}
        <linearGradient id="rinkLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4CDB8" />
          <stop offset="100%" stopColor="#C8C0A8" />
        </linearGradient>
        <linearGradient id="rinkDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CCC4AE" />
          <stop offset="100%" stopColor="#C0B89E" />
        </linearGradient>

        {/* ═══ GRASS TEXTURE (perimeter areas) ═══ */}
        <linearGradient id="grassLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3D8B2A" />
          <stop offset="100%" stopColor="#2E6B1C" />
        </linearGradient>
        <linearGradient id="grassDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#357826" />
          <stop offset="100%" stopColor="#2A6118" />
        </linearGradient>

        {/* ═══ PATH GRADIENTS (walkways on concrete) ═══ */}
        <linearGradient id="pathLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B8B0A0" />
          <stop offset="100%" stopColor="#A8A090" />
        </linearGradient>
        <linearGradient id="pathDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B0A898" />
          <stop offset="100%" stopColor="#A09888" />
        </linearGradient>

        {/* ═══ ROOF GRADIENTS (per zone) ═══ */}
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

        {/* ═══ HILLSIDE GRADIENT (Battalion Park) ═══ */}
        <linearGradient id="hillGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B9B60" />
          <stop offset="30%" stopColor="#9B8B58" />
          <stop offset="60%" stopColor="#8A7A48" />
          <stop offset="100%" stopColor="#6A8A3A" />
        </linearGradient>

        {/* ═══ CLOUD FILTER ═══ */}
        <filter id="cloudSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* ═══ SKY ═══ */}
      <rect x="30" y="-80" width="900" height="580" fill="url(#skyGrad)" />

      {/* ═══ BATTALION PARK HILLSIDE (Signal Hill landmark) ═══ */}
      {/* Hill slope – brown/green grassy terrain */}
      <polygon
        points="30,-20 930,-50 930,130 30,100"
        fill="url(#hillGrad)"
      />
      {/* Hill texture patches */}
      <ellipse cx="200" cy="20" rx="60" ry="12" fill="#9B8B60" opacity="0.15" />
      <ellipse cx="450" cy="10" rx="80" ry="15" fill="#8B7B50" opacity="0.12" />
      <ellipse cx="700" cy="0" rx="55" ry="10" fill="#9B8B60" opacity="0.1" />
      <ellipse cx="350" cy="50" rx="70" ry="12" fill="#7A8A4A" opacity="0.1" />
      <ellipse cx="600" cy="60" rx="65" ry="10" fill="#6A7A3A" opacity="0.08" />

      {/* ─── White rock numbers on the hillside ─── */}
      {/* "113" – upper left */}
      <text x="180" y="35" fontSize="48" fontFamily="Georgia, serif" fontWeight="900"
        fill="#E8E0D0" opacity="0.7" letterSpacing="4"
        transform="rotate(-6, 180, 35)" style={{ paintOrder: "stroke" }}
        stroke="#D0C8B8" strokeWidth="1.5">113</text>
      {/* "51" – middle area */}
      <text x="370" y="45" fontSize="44" fontFamily="Georgia, serif" fontWeight="900"
        fill="#E8E0D0" opacity="0.65" letterSpacing="3"
        transform="rotate(-4, 370, 45)" style={{ paintOrder: "stroke" }}
        stroke="#D0C8B8" strokeWidth="1.2">51</text>
      {/* "137" – right side */}
      <text x="520" y="38" fontSize="48" fontFamily="Georgia, serif" fontWeight="900"
        fill="#E8E0D0" opacity="0.68" letterSpacing="3"
        transform="rotate(-5, 520, 38)" style={{ paintOrder: "stroke" }}
        stroke="#D0C8B8" strokeWidth="1.4">137</text>
      {/* "151" – lower middle */}
      <text x="380" y="85" fontSize="42" fontFamily="Georgia, serif" fontWeight="900"
        fill="#E8E0D0" opacity="0.6" letterSpacing="3"
        transform="rotate(-3, 380, 85)" style={{ paintOrder: "stroke" }}
        stroke="#D0C8B8" strokeWidth="1.2">151</text>

      {/* ─── Walking path on hillside (like the real one) ─── */}
      <path d="M 340,-15 Q 350,20 380,50 Q 400,70 380,100"
        fill="none" stroke="#A09878" strokeWidth="3" opacity="0.3" />

      {/* ─── Trees scattered on hillside ─── */}
      {[
        { x: 140, y: -10, s: 0.5 }, { x: 250, y: -15, s: 0.6 },
        { x: 480, y: -20, s: 0.55 }, { x: 650, y: -12, s: 0.5 },
        { x: 770, y: -8, s: 0.45 }, { x: 320, y: 5, s: 0.4 },
        { x: 560, y: 0, s: 0.5 }, { x: 820, y: -5, s: 0.4 },
      ].map((t, i) => (
        <g key={`ht-${i}`}>
          <ellipse cx={t.x} cy={t.y} rx={5 * t.s} ry={7 * t.s} fill="#3A6820" opacity="0.6" />
          <ellipse cx={t.x} cy={t.y - 3 * t.s} rx={4 * t.s} ry={5 * t.s} fill="#4A8030" opacity="0.5" />
        </g>
      ))}

      {/* ─── Green ground below hill — flush with hillside, no gap ─── */}
      <rect x="30" y="85" width="900" height="520" fill="#1A5C10" />

      {/* Sienna Park Dr road at base of hill */}
      <polygon points="30,95 930,75 930,88 30,108" fill="#606060" opacity="0.35" />
      <line x1="30" y1="95" x2="930" y2="75" stroke="#7A7060" strokeWidth="1.5" opacity="0.3" />
      <line x1="30" y1="108" x2="930" y2="88" stroke="#7A7060" strokeWidth="1" opacity="0.2" />

      {/* Sun glow */}
      <circle cx="880" cy="-75" r="50" fill="url(#sunGlow)" />
      <circle cx="880" cy="-75" r="16" fill="#FFF8DC" />
      <circle cx="877" cy="-79" r="4" fill="#FFFEF0" opacity="0.5" />

      {/* Clouds – drifting over the hill */}
      {[
        { bx: 200, by: -55, s: 1.1, spd: 0.012 },
        { bx: 450, by: -65, s: 0.9, spd: 0.015 },
        { bx: 700, by: -58, s: 0.85, spd: 0.01 },
        { bx: 150, by: -45, s: 0.6, spd: 0.008 },
      ].map((c, i) => {
        const drift = (frame * c.spd) % 40 - 20;
        return (
          <g key={`cloud-${i}`} opacity={0.55} filter="url(#cloudSoft)">
            <ellipse cx={c.bx + drift - 12} cy={c.by + 4} rx={16 * c.s} ry={5 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift} cy={c.by} rx={22 * c.s} ry={7 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift + 14} cy={c.by + 3} rx={14 * c.s} ry={5 * c.s} fill="#FFF" />
          </g>
        );
      })}

      {/* ═══ GROUND TILES (Ice rink concrete surface) ═══ */}
      {Array.from({ length: GRID_ROWS }).map((_, row) =>
        Array.from({ length: GRID_COLS }).map((_, col) => {
          const path = isPathTile(col, row);
          // Rink surface: concrete tan. Paths slightly darker. Outer edges: grass.
          const isOuterEdge = col === 0 || col === GRID_COLS - 1 || row === 0 || row === GRID_ROWS - 1;
          const fill = isOuterEdge
            ? ((row + col) % 2 === 0 ? "url(#grassLight)" : "url(#grassDark)")
            : path
              ? ((row + col) % 2 === 0 ? "url(#pathLight)" : "url(#pathDark)")
              : ((row + col) % 2 === 0 ? "url(#rinkLight)" : "url(#rinkDark)");
          const stroke = isOuterEdge ? "#2A6118" : path ? "#A09888" : "#BEB8A8";
          return (
            <polygon
              key={`tile-${row}-${col}`}
              points={tileDiamond(col, row)}
              fill={fill}
              stroke={stroke}
              strokeWidth="0.3"
              strokeOpacity="0.4"
            />
          );
        })
      )}

      {/* ═══ Rink boards (concrete/metal border — ice rink style) ═══ */}
      {(() => {
        const tl = gridToScreen(0, 0);
        const tr = gridToScreen(GRID_COLS, 0);
        const br = gridToScreen(GRID_COLS, GRID_ROWS);
        const bl = gridToScreen(0, GRID_ROWS);
        // Inner rink border (1 tile inset)
        const iTL = gridToScreen(1, 1);
        const iTR = gridToScreen(GRID_COLS - 1, 1);
        const iBR = gridToScreen(GRID_COLS - 1, GRID_ROWS - 1);
        const iBL = gridToScreen(1, GRID_ROWS - 1);
        const outerPts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
        const innerPts = `${iTL.x},${iTL.y} ${iTR.x},${iTR.y} ${iBR.x},${iBR.y} ${iBL.x},${iBL.y}`;
        return (
          <g>
            {/* Outer board shadow */}
            <polygon points={outerPts} fill="none"
              stroke="#000" strokeWidth="4" strokeOpacity="0.1"
              transform="translate(2,3)" strokeLinejoin="round" />
            {/* Outer concrete board — the rink wall */}
            <polygon points={outerPts} fill="none"
              stroke="#808888" strokeWidth="3.5" strokeLinejoin="round" />
            {/* Inner board highlight */}
            <polygon points={innerPts} fill="none"
              stroke="#A0A8B0" strokeWidth="1.2" strokeLinejoin="round"
              strokeOpacity="0.5" />
            {/* Entrance gap at top — break the top edge for the gate */}
            <line x1={gridToScreen(3, 0).x} y1={gridToScreen(3, 0).y}
              x2={gridToScreen(7, 0).x} y2={gridToScreen(7, 0).y}
              stroke="#1A5C10" strokeWidth="5" />
            {/* Gate posts */}
            <circle cx={gridToScreen(3, 0).x} cy={gridToScreen(3, 0).y}
              r="3" fill="#606868" stroke="#808888" strokeWidth="1" />
            <circle cx={gridToScreen(7, 0).x} cy={gridToScreen(7, 0).y}
              r="3" fill="#606868" stroke="#808888" strokeWidth="1" />
            {/* "ENTRANCE" text above gate */}
            <text
              x={(gridToScreen(3, 0).x + gridToScreen(7, 0).x) / 2}
              y={gridToScreen(5, 0).y - 12}
              textAnchor="middle" fill="#E2E8F0" fontSize="4"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="700"
              letterSpacing="1.5" opacity="0.7">
              ENTRANCE
            </text>
          </g>
        );
      })()}

      {/* ═══ Community building (West Hills Shack — top right) ═══ */}
      {(() => {
        const bPos = gridToScreen(9, -1.5);
        const bw = 55;
        const bh = 40;
        const roofH = 18;
        return (
          <g>
            {/* Building shadow */}
            <ellipse cx={bPos.x + 5} cy={bPos.y + 15} rx="30" ry="12" fill="#000" opacity="0.1" />
            {/* Building left wall */}
            <polygon
              points={`${bPos.x - bw / 2},${bPos.y} ${bPos.x},${bPos.y + bh / 3} ${bPos.x},${bPos.y + bh / 3 - roofH} ${bPos.x - bw / 2},${bPos.y - roofH}`}
              fill="#8B8580" />
            {/* Building right wall */}
            <polygon
              points={`${bPos.x},${bPos.y + bh / 3} ${bPos.x + bw / 2},${bPos.y} ${bPos.x + bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y + bh / 3 - roofH}`}
              fill="#7A7570" />
            {/* Roof */}
            <polygon
              points={`${bPos.x - bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y - roofH - 8} ${bPos.x + bw / 2},${bPos.y - roofH} ${bPos.x},${bPos.y + bh / 3 - roofH}`}
              fill="#9B9590" />
            {/* Roof ridge line */}
            <line x1={bPos.x} y1={bPos.y - roofH - 8}
              x2={bPos.x} y2={bPos.y + bh / 3 - roofH}
              stroke="#AAA5A0" strokeWidth="0.8" />
            {/* Door */}
            <rect x={bPos.x - 4} y={bPos.y + bh / 3 - 14} width="8" height="10" rx="1" fill="#5A4A3A" />
            {/* Windows */}
            <rect x={bPos.x - bw / 2 + 6} y={bPos.y - 10} width="6" height="5" rx="0.5" fill="#87CEEB" opacity="0.6" />
            <rect x={bPos.x + bw / 2 - 14} y={bPos.y - 10} width="6" height="5" rx="0.5" fill="#87CEEB" opacity="0.6" />
            {/* "COMMUNITY CENTRE" label */}
            <text x={bPos.x} y={bPos.y + bh / 3 + 8} textAnchor="middle"
              fill="#94A3B8" fontSize="3" fontFamily="system-ui, sans-serif" fontWeight="600"
              letterSpacing="0.8" opacity="0.7">SIGNAL HILL COMMUNITY CENTRE</text>
          </g>
        );
      })()}

      {/* ═══ ZONES (sorted back-to-front) ═══ */}
      {sortedZones.map((zone) => {
        const polys = isoBuildingPolys(zone.gx, zone.gy, zone.gw, zone.gd, zone.h);
        const isHovered = hoveredZone === zone.id;
        const isSelected = selectedZoneId === zone.id;
        const isAvailable = zone.available === true;

        // Corner positions
        const bl = polys.leftCorner;
        const br = polys.bottomCorner;
        const bRight = polys.rightCorner;
        const bTop = polys.topCorner;
        const groundPts = `${bTop.x},${bTop.y} ${bRight.x},${bRight.y} ${br.x},${br.y} ${bl.x},${bl.y}`;

        if (isAvailable) {
          // ─── Available vendor spot: dashed outline, muted, with CTA ───
          return (
            <g key={zone.id}>
              {/* Ground pad – very subtle */}
              <polygon points={groundPts}
                fill="#94A3B8" opacity={isHovered ? "0.12" : "0.06"}
                style={{ transition: "opacity 0.2s" }}
              />

              {/* Dashed diamond outline – "empty lot" feel */}
              <polygon points={groundPts}
                fill="none"
                stroke={isHovered ? "#4ADE80" : "#94A3B8"}
                strokeWidth={isHovered ? "1.5" : "1"}
                strokeDasharray="6 4"
                strokeOpacity={isHovered ? "0.7" : "0.4"}
                strokeLinejoin="round"
                style={{ transition: "all 0.2s" }}
              />

              {/* "+" icon in center */}
              <text
                x={polys.roofCenter.x}
                y={polys.roofCenter.y - (isHovered ? 4 : 2)}
                textAnchor="middle"
                fill={isHovered ? "#4ADE80" : "#94A3B8"}
                fontSize={isHovered ? "14" : "12"}
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="300"
                opacity={isHovered ? "0.8" : "0.4"}
                style={{ pointerEvents: "none", transition: "all 0.2s" }}
              >
                +
              </text>

              {/* Suggestion label */}
              <text
                x={polys.roofCenter.x}
                y={polys.roofCenter.y + (isHovered ? 8 : 6)}
                textAnchor="middle"
                fill={isHovered ? "#E2E8F0" : "#94A3B8"}
                fontSize="3.5"
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight="500"
                opacity={isHovered ? "0.9" : "0.45"}
                style={{ pointerEvents: "none", transition: "all 0.2s" }}
              >
                {zone.suggestion || "Available"}
              </text>

              {/* Hover: "Apply as Vendor" prompt */}
              {isHovered && (
                <g>
                  <rect x={polys.roofCenter.x - 22} y={polys.roofCenter.y + 12}
                    width="44" height="8" rx="4" fill="#4ADE80" opacity="0.85" />
                  <text x={polys.roofCenter.x} y={polys.roofCenter.y + 17.5}
                    textAnchor="middle" fill="#052E16" fontSize="3"
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

        // ─── Confirmed zone (SHCA Info): open table with banner ───
        const cx = (bTop.x + br.x) / 2;
        const cy = (bTop.y + br.y) / 2;
        return (
          <g key={zone.id}>
            {/* Ground pad */}
            <polygon points={groundPts}
              fill={zone.colors.roof} opacity={isHovered ? "0.15" : "0.08"}
              style={{ transition: "opacity 0.2s" }}
            />

            {/* Table (isometric diamond) */}
            <polygon
              points={`${cx},${cy - 6} ${cx + 18},${cy - 0} ${cx},${cy + 6} ${cx - 18},${cy}`}
              fill="#DBEAFE" stroke={isHovered ? "#3B82F6" : "rgba(0,0,0,0.12)"} strokeWidth="0.5"
            />
            {/* Table surface highlight */}
            <polygon
              points={`${cx},${cy - 6} ${cx + 18},${cy - 0} ${cx},${cy + 6} ${cx - 18},${cy}`}
              fill="#FFF" opacity="0.15"
            />
            {/* Table legs */}
            <line x1={cx - 14} y1={cy + 1} x2={cx - 14} y2={cy + 7} stroke="#6B4226" strokeWidth="1" />
            <line x1={cx + 14} y1={cy + 1} x2={cx + 14} y2={cy + 7} stroke="#6B4226" strokeWidth="1" />
            <line x1={cx - 5} y1={cy + 5} x2={cx - 5} y2={cy + 11} stroke="#6B4226" strokeWidth="1" />
            <line x1={cx + 5} y1={cy + 5} x2={cx + 5} y2={cy + 11} stroke="#6B4226" strokeWidth="1" />
            {/* Table shadow */}
            <ellipse cx={cx} cy={cy + 12} rx="16" ry="4" fill="#000" opacity="0.06" />

            {/* SHCA banner on table */}
            <rect x={cx - 14} y={cy - 12} width="28" height="10" rx="2"
              fill="#F8FAFC" opacity="0.92" stroke="#3B82F6" strokeWidth="0.5" />
            <text x={cx} y={cy - 4.5} textAnchor="middle"
              fill="#1D4ED8" fontSize="6" fontFamily="system-ui, sans-serif" fontWeight="800">
              SHCA
            </text>

            {/* Small brochures / flyers on table */}
            <rect x={cx - 8} y={cy - 2} width="4" height="3" rx="0.3"
              fill="#BFDBFE" transform={`rotate(-10, ${cx - 6}, ${cy})`} />
            <rect x={cx + 2} y={cy - 1} width="4" height="3" rx="0.3"
              fill="#93C5FD" transform={`rotate(5, ${cx + 4}, ${cy})`} />
            <rect x={cx + 8} y={cy - 2} width="3.5" height="2.5" rx="0.3"
              fill="#DBEAFE" transform={`rotate(-3, ${cx + 10}, ${cy})`} />

            {/* Flag pole */}
            <line x1={cx + 20} y1={cy - 2} x2={cx + 20} y2={cy - 22}
              stroke="#475569" strokeWidth="0.8" />
            <polygon
              points={`${cx + 21},${cy - 22} ${cx + 30},${cy - 19} ${cx + 21},${cy - 16}`}
              fill="#2563EB" />

            {/* Label */}
            <text x={cx} y={cy + 18} textAnchor="middle"
              fill={isHovered ? "#60A5FA" : "#94A3B8"} fontSize="4"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600"
              style={{ pointerEvents: "none", transition: "fill 0.2s" }}>
              SHCA INFO TABLE
            </text>

            {/* Click target */}
            <polygon points={groundPts} fill="transparent" className="cursor-pointer"
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(zone)}
            />
          </g>
        );
      })}

      {/* ═══ PROPS (minimal — rink surface is mostly open) ═══ */}
      {/* A few trash bins near the entrance */}
      <IsoTrashBin gx={6} gy={0.5} />
      <IsoTrashBin gx={10} gy={0.5} />

      {/* ═══ TREES ═══ */}
      {TREE_POSITIONS.map((t, i) => (
        <IsoTree key={`tree-${i}`} gx={t.gx} gy={t.gy} size={t.size} />
      ))}

      {/* ═══ CHARACTERS (projected from world space, depth-sorted) ═══ */}
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

      {/* ═══ GUEST COUNT BADGE ═══ */}
      {movingChars.length > 0 && (() => {
        const badgePos = gridToScreen(GRID_COLS - 1, GRID_ROWS - 0.5);
        return (
          <g>
            <rect x={badgePos.x - 28} y={badgePos.y + 9}
              width="56" height="12" rx="6" fill="#000" opacity="0.15" />
            <rect x={badgePos.x - 30} y={badgePos.y + 8}
              width="60" height="12" rx="6" fill="#0A0F1E" opacity="0.85" />
            <rect x={badgePos.x - 30} y={badgePos.y + 8}
              width="60" height="12" rx="6" fill="none"
              stroke="#4ADE80" strokeWidth="0.4" strokeOpacity="0.3" />
            <text x={badgePos.x} y={badgePos.y + 16.5}
              textAnchor="middle" fill="#4ADE80" fontSize="4.5"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600">
              {movingChars.length} Guests
            </text>
          </g>
        );
      })()}

      {/* ═══ GAME-STYLE STAT BARS (right side) ═══ */}
      {stats && (() => {
        const TARGETS_DISPLAY = { rsvps: 200, volunteers: 30, vendors: 10 };
        const baseX = 795;
        const baseY = 195;
        const gap = 60;
        return (
          <g>
            <GameStatBar
              x={baseX} y={baseY}
              label="GUESTS" icon="🎈"
              current={stats.rsvps} target={TARGETS_DISPLAY.rsvps}
              color="#4ADE80" accentColor="#22C55E"
              href="/rsvp"
            />
            <GameStatBar
              x={baseX} y={baseY + gap}
              label="VOLUNTEERS" icon="🙋"
              current={stats.volunteers} target={TARGETS_DISPLAY.volunteers}
              color="#60A5FA" accentColor="#3B82F6"
              href="/volunteer"
            />
            <GameStatBar
              x={baseX} y={baseY + gap * 2}
              label="VENDORS" icon="🏪"
              current={stats.vendors} target={TARGETS_DISPLAY.vendors}
              color="#F472B6" accentColor="#EC4899"
              href="/vendor"
            />
          </g>
        );
      })()}

      {/* ═══ CHANGEABLE-LETTER SIGN BOARD (roadside marquee style) ═══ */}
      {(() => {
        // Position on top of the hill, above the rock numbers
        const sx = 620;
        const sy = -72;
        const boardW = 180;
        const boardH = 110;
        const line1 = "SIGNAL HILL";
        const line2 = "NEIGHBOUR";
        const line3 = "DAY";
        const line4 = "JUNE 20 2026";
        const line5 = "11AM - 4PM";
        const letterW = 10;
        const letterH = 11;
        const lineGap = 1.5;

        const renderLetterRow = (text: string, rowY: number, color: string) => {
          const chars = text.split("");
          const totalW = chars.length * letterW;
          const startX = sx + (boardW - totalW) / 2;
          return chars.map((ch, i) => {
            if (ch === " ") return null;
            return (
              <g key={`letter-${rowY}-${i}`}>
                {/* Letter tile background */}
                <rect
                  x={startX + i * letterW + 0.3}
                  y={rowY + 0.3}
                  width={letterW - 0.6}
                  height={letterH - 0.6}
                  rx="0.5"
                  fill="#1A1A1A"
                  opacity="0.5"
                />
                {/* The letter itself */}
                <text
                  x={startX + i * letterW + letterW / 2}
                  y={rowY + letterH - 2.5}
                  textAnchor="middle"
                  fill={color}
                  fontSize="9"
                  fontFamily="'Courier New', Courier, monospace"
                  fontWeight="700"
                  letterSpacing="0"
                >
                  {ch}
                </text>
              </g>
            );
          });
        };

        const row1Y = sy + 8;
        const row2Y = row1Y + letterH + lineGap;
        const row3Y = row2Y + letterH + lineGap;
        const row4Y = row3Y + letterH + lineGap + 3;
        const row5Y = row4Y + letterH + lineGap;

        return (
          <g>
            {/* Post legs */}
            <rect x={sx + 20} y={sy + boardH - 2} width="4" height="40" fill="#5A4020" />
            <rect x={sx + boardW - 24} y={sy + boardH - 2} width="4" height="40" fill="#5A4020" />
            {/* Post leg shadows */}
            <rect x={sx + 21.5} y={sy + boardH - 2} width="1.5" height="40" fill="#4A3018" opacity="0.4" />
            <rect x={sx + boardW - 22.5} y={sy + boardH - 2} width="1.5" height="40" fill="#4A3018" opacity="0.4" />
            {/* Ground shadow */}
            <ellipse cx={sx + boardW / 2} cy={sy + boardH + 38} rx="40" ry="5" fill="#000" opacity="0.1" />

            {/* Main board backing — felt-board black background */}
            <rect x={sx} y={sy} width={boardW} height={boardH} rx="3" fill="#0D0D0D" />
            {/* Inner border — classic marquee frame */}
            <rect x={sx + 3} y={sy + 3} width={boardW - 6} height={boardH - 6}
              rx="3" fill="none" stroke="#C0A060" strokeWidth="2" />
            {/* Outer frame */}
            <rect x={sx} y={sy} width={boardW} height={boardH}
              rx="3" fill="none" stroke="#8B7040" strokeWidth="2" />
            {/* Frame corner accents */}
            <circle cx={sx + 6} cy={sy + 6} r="2.5" fill="#D4B068" />
            <circle cx={sx + boardW - 6} cy={sy + 6} r="2.5" fill="#D4B068" />
            <circle cx={sx + 6} cy={sy + boardH - 6} r="2.5" fill="#D4B068" />
            <circle cx={sx + boardW - 6} cy={sy + boardH - 6} r="2.5" fill="#D4B068" />

            {/* Groove lines for letter rails (horizontal tracks) */}
            {[row1Y, row2Y, row3Y, row4Y, row5Y].map((ry, i) => (
              <line key={`rail-${i}`}
                x1={sx + 5} y1={ry + letterH + 0.5}
                x2={sx + boardW - 5} y2={ry + letterH + 0.5}
                stroke="#333" strokeWidth="0.4" />
            ))}

            {/* Letter rows */}
            {renderLetterRow(line1, row1Y, "#FFFFFF")}
            {renderLetterRow(line2, row2Y, "#FFFFFF")}
            {renderLetterRow(line3, row3Y, "#FFFFFF")}
            {renderLetterRow(line4, row4Y, "#FFE066")}
            {renderLetterRow(line5, row5Y, "#FFE066")}

            {/* Divider line between title and date */}
            <line x1={sx + 15} y1={row4Y - 2} x2={sx + boardW - 15} y2={row4Y - 2}
              stroke="#C0A060" strokeWidth="0.5" opacity="0.5" />

            {/* Top header accent — "COMMUNITY EVENT" small text */}
            <text x={sx + boardW / 2} y={sy + 9} textAnchor="middle"
              fill="#C0A060" fontSize="4" fontFamily="system-ui, sans-serif" fontWeight="600"
              letterSpacing="3">COMMUNITY EVENT</text>
          </g>
        );
      })()}
    </svg>
  );
}
