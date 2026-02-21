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
}

const ISO_ZONES: IsoZone[] = [
  {
    id: "bouncy", label: "Bouncy Castles",
    gx: 0.5, gy: 0.5, gw: 3, gd: 2, h: 34,
    colors: { roof: "#EF4444", leftWall: "#DC2626", rightWall: "#B91C1C" },
    description: "Inflatable fun for kids of all ages!",
  },
  {
    id: "facepainting", label: "Face Painting",
    gx: 4, gy: 0.5, gw: 2.5, gd: 2, h: 20,
    colors: { roof: "#A855F7", leftWall: "#9333EA", rightWall: "#7C3AED" },
    description: "Get your face painted by local artists",
  },
  {
    id: "games", label: "Yard Games",
    gx: 7, gy: 0.5, gw: 3, gd: 2, h: 22,
    colors: { roof: "#22C55E", leftWall: "#16A34A", rightWall: "#15803D" },
    description: "Cornhole, ladder toss, and more",
  },
  {
    id: "info", label: "SHCA Info",
    gx: 11, gy: 0.5, gw: 3.5, gd: 2.5, h: 52,
    colors: { roof: "#3B82F6", leftWall: "#2563EB", rightWall: "#1D4ED8" },
    description: "Community info & membership signup",
  },
  {
    id: "petting", label: "Petting Zoo",
    gx: 0.5, gy: 4, gw: 3, gd: 2, h: 14,
    colors: { roof: "#EAB308", leftWall: "#CA8A04", rightWall: "#A16207" },
    description: "Meet friendly farm animals",
  },
  {
    id: "food", label: "Food Vendors",
    gx: 4, gy: 3.5, gw: 3, gd: 2.5, h: 26,
    colors: { roof: "#F97316", leftWall: "#EA580C", rightWall: "#C2410C" },
    description: "Local food trucks and BBQ",
  },
  {
    id: "stage", label: "Music Stage",
    gx: 7.5, gy: 4, gw: 3, gd: 2.5, h: 30,
    colors: { roof: "#0EA5E9", leftWall: "#0284C7", rightWall: "#0369A1" },
    description: "Live music all day long",
  },
  {
    id: "sponsors", label: "Sponsors",
    gx: 11, gy: 4, gw: 3, gd: 2, h: 22,
    colors: { roof: "#EC4899", leftWall: "#DB2777", rightWall: "#BE185D" },
    description: "Meet our amazing community sponsors",
  },
];

// ─── Path tile coordinates (grid positions that are paths) ─────
function isPathTile(col: number, row: number): boolean {
  // Main horizontal path at row 3
  if (row === 3 && col >= 0 && col < 16) return true;
  // Vertical center path from row 3 to row 8
  if (col === 8 && row >= 3 && row <= 8) return true;
  // Cross connectors to zones (top row)
  if (row === 2 && (col === 2 || col === 5 || col === 8 || col === 12)) return true;
  // Cross connectors to zones (bottom row)
  if (row === 5 && (col === 2 || col === 5 || col === 9 || col === 12)) return true;
  // Left and right vertical connectors
  if (col === 2 && row >= 2 && row <= 5) return true;
  if (col === 12 && row >= 2 && row <= 5) return true;
  // Entrance path
  if (col === 8 && row >= 8 && row <= 9) return true;
  if (col === 7 && row >= 8 && row <= 9) return true;
  return false;
}

// ─── Tree positions (grid coords) ──────────────────────────────
const TREE_POSITIONS: { gx: number; gy: number; size: number }[] = [
  // South tree line
  { gx: 0.5, gy: 8, size: 1.1 },
  { gx: 2, gy: 8.5, size: 1.3 },
  { gx: 3.5, gy: 9, size: 0.9 },
  { gx: 5, gy: 8.5, size: 1.1 },
  { gx: 10, gy: 8, size: 1.0 },
  { gx: 12, gy: 8.5, size: 1.2 },
  { gx: 14, gy: 9, size: 0.9 },
  { gx: 15.5, gy: 8.5, size: 1.0 },
  // East edge
  { gx: 15.5, gy: 1.5, size: 0.9 },
  { gx: 16, gy: 3, size: 1.0 },
  { gx: 15.5, gy: 5.5, size: 1.1 },
  { gx: 16, gy: 7, size: 0.8 },
  // West edge
  { gx: -0.5, gy: 2, size: 1.0 },
  { gx: -0.5, gy: 5, size: 0.9 },
  { gx: -0.5, gy: 7, size: 1.1 },
];

// ─── Tiny isometric guest (RCT-style ~8px tall) ────────────────
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
      <ellipse cx="0" cy="3" rx="2.5" ry="1" fill="#000" opacity="0.2" />
      {/* Legs */}
      <rect x={-1.2 + legOff * flip} y={bob + 0.5} width="1" height="2.5" fill="#1E293B" />
      <rect x={0.2 - legOff * flip} y={bob + 0.5} width="1" height="2.5" fill="#1E293B" />
      {/* Shoes */}
      <rect x={-1.5 + legOff * flip} y={bob + 2.5} width="1.5" height="0.8" fill="#4A2500" />
      <rect x={0 - legOff * flip} y={bob + 2.5} width="1.5" height="0.8" fill="#4A2500" />
      {/* Body */}
      <rect x="-1.5" y={bob - 3} width="3" height="3.5" fill={color} />
      {/* Head */}
      <rect x="-1.2" y={bob - 5.5} width="2.5" height="2.5" fill="#FFE0BD" />
      {/* Eyes */}
      <rect x={flip > 0 ? -0.5 : -0.2} y={bob - 4.5} width="0.5" height="0.5" fill="#0F172A" />
      <rect x={flip > 0 ? 0.5 : 0.8} y={bob - 4.5} width="0.5" height="0.5" fill="#0F172A" />

      {/* RSVP: balloon */}
      {type === "rsvp" && (
        <>
          <line x1="0" y1={bob - 5.5} x2={balloonSway * 0.4} y2={bob - 13}
            stroke="#94A3B8" strokeWidth="0.3" />
          <ellipse cx={balloonSway * 0.6} cy={bob - 15} rx="2.2" ry="2.8"
            fill={balloonColor} opacity="0.85" />
          <ellipse cx={balloonSway * 0.6 - 0.5} cy={bob - 16} rx="0.8" ry="1"
            fill="#FFF" opacity="0.3" />
        </>
      )}
      {/* VIP: crown */}
      {type === "vip" && (
        <>
          <rect x="-1.5" y={bob - 6.5} width="3.5" height="1.2" fill="#FFD700" />
          <rect x="-1" y={bob - 7.5} width="0.8" height="1" fill="#FFD700" />
          <rect x="0.2" y={bob - 7.5} width="0.8" height="1" fill="#FFD700" />
          <rect x="1.3" y={bob - 7.5} width="0.8" height="1" fill="#FFD700" />
        </>
      )}
      {/* Volunteer: hard hat */}
      {type === "volunteer" && (
        <rect x="-1.8" y={bob - 6.5} width="4" height="1.5" rx="0.5" fill="#FBBF24" />
      )}
      {/* Vendor: chef hat */}
      {type === "vendor" && (
        <>
          <rect x="-1" y={bob - 7.5} width="2.5" height="2.5" fill="#F0FDF4" />
          <rect x="-0.5" y={bob - 8} width="1.5" height="1" fill="#F0FDF4" />
        </>
      )}
    </g>
  );
}

// ─── Isometric tree ────────────────────────────────────────────
function IsoTree({ gx, gy, size }: { gx: number; gy: number; size: number }) {
  const pos = gridToScreen(gx, gy);
  const s = size;
  return (
    <g>
      {/* Shadow */}
      <ellipse cx={pos.x + 2 * s} cy={pos.y + 3} rx={6 * s} ry={3 * s}
        fill="#000" opacity="0.12" />
      {/* Trunk */}
      <rect x={pos.x - 1.5 * s} y={pos.y - 5 * s} width={3 * s} height={8 * s}
        fill="#5C3A1E" />
      {/* Canopy layers (bottom to top, larger to smaller) */}
      <ellipse cx={pos.x} cy={pos.y - 7 * s} rx={7 * s} ry={5 * s}
        fill="#2D5016" />
      <ellipse cx={pos.x} cy={pos.y - 10 * s} rx={5.5 * s} ry={4 * s}
        fill="#3A6B1E" />
      <ellipse cx={pos.x} cy={pos.y - 12 * s} rx={4 * s} ry={3 * s}
        fill="#4A7C28" />
      {/* Highlight */}
      <ellipse cx={pos.x - 1 * s} cy={pos.y - 11 * s} rx={2 * s} ry={1.5 * s}
        fill="#5A8C32" opacity="0.5" />
    </g>
  );
}

// ─── Building wall decorations by zone ─────────────────────────
function BuildingDecor({ zone }: { zone: IsoZone }) {
  const { gx, gy, gw, gd, h } = zone;

  switch (zone.id) {
    case "info": {
      // Windows on left wall
      const w1 = leftWallPoint(gx, gy, gw, gd, h, 0.25, 0.55);
      const w2 = leftWallPoint(gx, gy, gw, gd, h, 0.55, 0.55);
      const w3 = leftWallPoint(gx, gy, gw, gd, h, 0.85, 0.55);
      // Door on right wall
      const d1 = rightWallPoint(gx, gy, gw, gd, h, 0.45, 0.35);
      // Flag
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Windows */}
          {[w1, w2, w3].map((w, i) => (
            <g key={`w-${i}`}>
              <rect x={w.x - 4} y={w.y - 5} width="8" height="8" fill="#BFDBFE" stroke="#1E40AF" strokeWidth="0.5" />
              <line x1={w.x} y1={w.y - 5} x2={w.x} y2={w.y + 3} stroke="#1E40AF" strokeWidth="0.5" />
              <line x1={w.x - 4} y1={w.y - 1} x2={w.x + 4} y2={w.y - 1} stroke="#1E40AF" strokeWidth="0.5" />
            </g>
          ))}
          {/* Door */}
          <rect x={d1.x - 4} y={d1.y - 8} width="8" height="12" rx="1" fill="#1E3A8A" />
          <circle cx={d1.x + 2} cy={d1.y - 2} r="0.8" fill="#FBBF24" />
          {/* SHCA Banner on roof */}
          <rect x={polys.roofCenter.x - 14} y={polys.roofCenter.y - 8} width="28" height="10" rx="1" fill="#F8FAFC" opacity="0.9" />
          <text x={polys.roofCenter.x} y={polys.roofCenter.y - 1} textAnchor="middle"
            fill="#1D4ED8" fontSize="5.5" fontFamily="monospace" fontWeight="bold">SHCA</text>
          {/* Flag pole */}
          <line x1={polys.roofCenter.x + 10} y1={polys.roofCenter.y - h * 0.1}
            x2={polys.roofCenter.x + 10} y2={polys.roofCenter.y - h * 0.1 - 18}
            stroke="#475569" strokeWidth="1" />
          <polygon
            points={`${polys.roofCenter.x + 11},${polys.roofCenter.y - h * 0.1 - 18} ${polys.roofCenter.x + 20},${polys.roofCenter.y - h * 0.1 - 15} ${polys.roofCenter.x + 11},${polys.roofCenter.y - h * 0.1 - 12}`}
            fill="#2563EB" />
        </g>
      );
    }
    case "bouncy": {
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Turrets on roof */}
          <rect x={polys.roofCenter.x - 18} y={polys.roofCenter.y - 10} width="6" height="10" fill="#F87171" />
          <rect x={polys.roofCenter.x + 12} y={polys.roofCenter.y - 10} width="6" height="10" fill="#F87171" />
          <rect x={polys.roofCenter.x - 3} y={polys.roofCenter.y - 14} width="6" height="14" fill="#FCA5A5" />
          {/* Flag */}
          <line x1={polys.roofCenter.x} y1={polys.roofCenter.y - 14}
            x2={polys.roofCenter.x} y2={polys.roofCenter.y - 24}
            stroke="#475569" strokeWidth="0.8" />
          <polygon
            points={`${polys.roofCenter.x + 1},${polys.roofCenter.y - 24} ${polys.roofCenter.x + 8},${polys.roofCenter.y - 22} ${polys.roofCenter.x + 1},${polys.roofCenter.y - 20}`}
            fill="#FBBF24" />
          {/* Entrance on left wall */}
          {(() => {
            const ep = leftWallPoint(gx, gy, gw, gd, h, 0.5, 0.35);
            return <ellipse cx={ep.x} cy={ep.y} rx="5" ry="7" fill="#7F1D1D" />;
          })()}
        </g>
      );
    }
    case "food": {
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      // Serving window on right wall
      const sw = rightWallPoint(gx, gy, gw, gd, h, 0.4, 0.6);
      return (
        <g>
          {/* Awning stripes on roof */}
          <line x1={polys.rTopCorner.x + 5} y1={polys.rTopCorner.y + 3}
            x2={polys.rBottomCorner.x + 5} y2={polys.rBottomCorner.y + 3}
            stroke="#FFF" strokeWidth="2" opacity="0.3" />
          <line x1={polys.rTopCorner.x + 15} y1={polys.rTopCorner.y + 3}
            x2={polys.rBottomCorner.x + 15} y2={polys.rBottomCorner.y + 3}
            stroke="#FFF" strokeWidth="2" opacity="0.3" />
          {/* Serving window */}
          <rect x={sw.x - 6} y={sw.y - 5} width="12" height="8" fill="#1E3A5F" stroke="#F97316" strokeWidth="0.5" />
          {/* Smoke puffs */}
          <circle cx={polys.roofCenter.x - 8} cy={polys.roofCenter.y - 12}
            r="3" fill="#94A3B8" opacity="0.15" />
          <circle cx={polys.roofCenter.x - 5} cy={polys.roofCenter.y - 18}
            r="2.5" fill="#94A3B8" opacity="0.1" />
          <circle cx={polys.roofCenter.x - 3} cy={polys.roofCenter.y - 23}
            r="2" fill="#94A3B8" opacity="0.07" />
        </g>
      );
    }
    case "stage": {
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Stage lights on roof */}
          <circle cx={polys.roofCenter.x - 10} cy={polys.roofCenter.y - 2}
            r="3" fill="#FBBF24" opacity="0.7" />
          <circle cx={polys.roofCenter.x - 10} cy={polys.roofCenter.y - 2}
            r="5" fill="#FBBF24" opacity="0.15" />
          <circle cx={polys.roofCenter.x + 5} cy={polys.roofCenter.y - 2}
            r="3" fill="#EF4444" opacity="0.7" />
          <circle cx={polys.roofCenter.x + 5} cy={polys.roofCenter.y - 2}
            r="5" fill="#EF4444" opacity="0.15" />
          <circle cx={polys.roofCenter.x + 20} cy={polys.roofCenter.y - 2}
            r="3" fill="#3B82F6" opacity="0.7" />
          <circle cx={polys.roofCenter.x + 20} cy={polys.roofCenter.y - 2}
            r="5" fill="#3B82F6" opacity="0.15" />
          {/* Speaker boxes on left wall */}
          {(() => {
            const sp1 = leftWallPoint(gx, gy, gw, gd, h, 0.2, 0.4);
            const sp2 = leftWallPoint(gx, gy, gw, gd, h, 0.8, 0.4);
            return (
              <>
                <rect x={sp1.x - 3} y={sp1.y - 4} width="6" height="8" fill="#111" stroke="#333" strokeWidth="0.5" />
                <circle cx={sp1.x} cy={sp1.y} r="2" fill="#1E293B" />
                <rect x={sp2.x - 3} y={sp2.y - 4} width="6" height="8" fill="#111" stroke="#333" strokeWidth="0.5" />
                <circle cx={sp2.x} cy={sp2.y} r="2" fill="#1E293B" />
              </>
            );
          })()}
        </g>
      );
    }
    case "games": {
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Tent stripes on roof */}
          <line x1={polys.rTopCorner.x + 8} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 8} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="3" opacity="0.25" />
          <line x1={polys.rTopCorner.x + 22} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 22} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="3" opacity="0.25" />
          {/* Pennant flags */}
          {[0, 1, 2, 3].map((i) => {
            const fx = polys.roofCenter.x - 15 + i * 10;
            const fy = polys.roofCenter.y - 8;
            const colors = ["#EF4444", "#FBBF24", "#3B82F6", "#22C55E"];
            return (
              <polygon key={`pf-${i}`}
                points={`${fx},${fy} ${fx + 4},${fy} ${fx + 2},${fy + 5}`}
                fill={colors[i]} />
            );
          })}
        </g>
      );
    }
    case "petting": {
      // Fence posts on walls
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Fence rail along roof */}
          <polygon points={polys.roof} fill="none" stroke="#8B6914" strokeWidth="1.5" strokeDasharray="4 2" />
          {/* Small animals on roof */}
          <ellipse cx={polys.roofCenter.x - 8} cy={polys.roofCenter.y + 2} rx="3" ry="2" fill="#F0F0F0" />
          <circle cx={polys.roofCenter.x - 10} cy={polys.roofCenter.y} r="1.5" fill="#E5E5E5" />
          <ellipse cx={polys.roofCenter.x + 8} cy={polys.roofCenter.y + 1} rx="2.5" ry="1.8" fill="#C4956A" />
          <circle cx={polys.roofCenter.x + 6} cy={polys.roofCenter.y - 0.5} r="1.3" fill="#B8856A" />
        </g>
      );
    }
    case "facepainting": {
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Tent stripes */}
          <line x1={polys.rTopCorner.x + 6} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 6} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="2" opacity="0.3" />
          {/* Paint splotches on roof */}
          <circle cx={polys.roofCenter.x - 5} cy={polys.roofCenter.y} r="2.5" fill="#EF4444" opacity="0.6" />
          <circle cx={polys.roofCenter.x + 3} cy={polys.roofCenter.y + 2} r="2" fill="#3B82F6" opacity="0.6" />
          <circle cx={polys.roofCenter.x + 8} cy={polys.roofCenter.y - 1} r="1.8" fill="#FBBF24" opacity="0.6" />
        </g>
      );
    }
    case "sponsors": {
      const polys = isoBuildingPolys(gx, gy, gw, gd, h);
      return (
        <g>
          {/* Tent stripes on roof */}
          <line x1={polys.rTopCorner.x + 8} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 8} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="2" opacity="0.25" />
          {/* Banner stands */}
          <rect x={polys.roofCenter.x - 12} y={polys.roofCenter.y - 6}
            width="10" height="8" fill="#F472B6" stroke="#DB2777" strokeWidth="0.5" />
          <rect x={polys.roofCenter.x + 4} y={polys.roofCenter.y - 5}
            width="10" height="8" fill="#FDE68A" stroke="#D97706" strokeWidth="0.5" />
        </g>
      );
    }
    default:
      return null;
  }
}

// ─── Bench along paths ─────────────────────────────────────────
function IsoBench({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      <rect x={pos.x - 5} y={pos.y - 2} width="10" height="3" fill="#A0714D" stroke="#6B4226" strokeWidth="0.5" />
      <rect x={pos.x - 4} y={pos.y + 1} width="2" height="3" fill="#5C2D0E" />
      <rect x={pos.x + 2} y={pos.y + 1} width="2" height="3" fill="#5C2D0E" />
    </g>
  );
}

// ─── Lamp post ──────────────────────────────────────────────────
function IsoLamp({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      <rect x={pos.x - 0.5} y={pos.y - 14} width="1.5" height="14" fill="#5C5C5C" />
      <rect x={pos.x - 3} y={pos.y - 16} width="7" height="2.5" fill="#707070" rx="1" />
      <circle cx={pos.x + 0.5} cy={pos.y - 15} r="4" fill="#FBBF24" opacity="0.1" />
      <circle cx={pos.x + 0.5} cy={pos.y - 15.5} r="1.5" fill="#FDE68A" opacity="0.5" />
    </g>
  );
}

// ─── Trash bin ──────────────────────────────────────────────────
function IsoTrashBin({ gx, gy }: { gx: number; gy: number }) {
  const pos = gridToScreen(gx, gy);
  return (
    <g>
      <rect x={pos.x - 2} y={pos.y - 5} width="4" height="5" fill="#4B5563" stroke="#374151" strokeWidth="0.5" />
      <rect x={pos.x - 2.5} y={pos.y - 6} width="5" height="1.5" fill="#6B7280" />
    </g>
  );
}

// ─── Main component ─────────────────────────────────────────────
interface PixelMapProps {
  onZoneSelect?: (zone: { id: string; label: string; description: string } | null) => void;
}

export default function PixelMap({ onZoneSelect }: PixelMapProps) {
  const [movingChars, setMovingChars] = useState<MovingCharacter[]>([]);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const knownIds = useRef<Set<string>>(new Set());

  const handleZoneClick = useCallback((zone: IsoZone) => {
    const newId = selectedZoneId === zone.id ? null : zone.id;
    setSelectedZoneId(newId);
    onZoneSelect?.(newId ? { id: zone.id, label: zone.label, description: zone.description } : null);
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
      viewBox="80 -120 800 700"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ imageRendering: "pixelated" }}
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7EC8E3" />
          <stop offset="55%" stopColor="#B5E3F5" />
          <stop offset="100%" stopColor="#D4F0D4" />
        </linearGradient>
      </defs>

      {/* ═══ SKY ═══ */}
      <rect x="80" y="-120" width="800" height="700" fill="url(#skyGrad)" />

      {/* Dark green ground (outside the park) */}
      <rect x="80" y="130" width="800" height="500" fill="#1A5C10" />

      {/* Clouds */}
      {[
        { bx: 200, by: 22, s: 1, spd: 0.02 },
        { bx: 420, by: 12, s: 0.85, spd: 0.015 },
        { bx: 650, by: 28, s: 0.9, spd: 0.025 },
        { bx: 130, by: 45, s: 0.7, spd: 0.018 },
      ].map((c, i) => {
        const drift = (frame * c.spd) % 30 - 15;
        return (
          <g key={`cloud-${i}`} opacity={0.75}>
            <ellipse cx={c.bx + drift - 10} cy={c.by + 4} rx={16 * c.s} ry={5 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift} cy={c.by} rx={20 * c.s} ry={7 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift + 12} cy={c.by + 3} rx={14 * c.s} ry={5 * c.s} fill="#FFF" />
          </g>
        );
      })}

      {/* Sun */}
      <circle cx="780" cy="38" r="18" fill="#FFE066" />
      <circle cx="780" cy="38" r="26" fill="#FFE066" opacity="0.1" />
      <circle cx="776" cy="33" r="6" fill="#FFF8C4" opacity="0.4" />

      {/* ═══ GROUND TILES (Diamond checkered pattern) ═══ */}
      {Array.from({ length: GRID_ROWS }).map((_, row) =>
        Array.from({ length: GRID_COLS }).map((_, col) => {
          const path = isPathTile(col, row);
          const fill = path
            ? ((row + col) % 2 === 0 ? "#C4A46C" : "#B89858")
            : ((row + col) % 2 === 0 ? "#3A7D22" : "#347020");
          const stroke = path ? "#A88A50" : "#2D6B1A";
          return (
            <polygon
              key={`tile-${row}-${col}`}
              points={tileDiamond(col, row)}
              fill={fill}
              stroke={stroke}
              strokeWidth="0.4"
            />
          );
        })
      )}

      {/* ═══ Park border fence (diamond perimeter) ═══ */}
      {(() => {
        const tl = gridToScreen(0, 0);
        const tr = gridToScreen(GRID_COLS, 0);
        const br = gridToScreen(GRID_COLS, GRID_ROWS);
        const bl = gridToScreen(0, GRID_ROWS);
        return (
          <polygon
            points={`${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
            fill="none"
            stroke="#5C3A1E"
            strokeWidth="2"
            strokeDasharray="6 3"
          />
        );
      })()}

      {/* ═══ BUILDINGS (sorted back-to-front) ═══ */}
      {sortedZones.map((zone) => {
        const polys = isoBuildingPolys(zone.gx, zone.gy, zone.gw, zone.gd, zone.h);
        const isHovered = hoveredZone === zone.id;
        const isSelected = selectedZoneId === zone.id;

        return (
          <g key={zone.id}>
            {/* Building shadow on ground */}
            <polygon
              points={polys.leftWall}
              fill="#000" opacity="0.06"
              transform="translate(5, 5)"
            />
            <polygon
              points={polys.rightWall}
              fill="#000" opacity="0.06"
              transform="translate(5, 5)"
            />

            {/* Left wall */}
            <polygon
              points={polys.leftWall}
              fill={zone.colors.leftWall}
              stroke="#000" strokeWidth="0.5"
            />

            {/* Right wall */}
            <polygon
              points={polys.rightWall}
              fill={zone.colors.rightWall}
              stroke="#000" strokeWidth="0.5"
            />

            {/* Roof */}
            <polygon
              points={polys.roof}
              fill={zone.colors.roof}
              stroke={isSelected ? "#FFE066" : isHovered ? "#FFF" : "#000"}
              strokeWidth={isSelected ? "2.5" : isHovered ? "1.5" : "0.5"}
            />

            {/* Zone decorations */}
            <BuildingDecor zone={zone} />

            {/* Label on roof */}
            <text
              x={polys.roofCenter.x}
              y={polys.roofCenter.y + (zone.id === "info" ? 8 : 3)}
              textAnchor="middle"
              fill="#FFF"
              fontSize="4.5"
              fontFamily="monospace"
              fontWeight="bold"
              style={{ pointerEvents: "none" }}
            >
              {zone.id !== "info" ? zone.label.toUpperCase() : ""}
            </text>

            {/* Click targets (invisible overlays for interaction) */}
            <polygon
              points={polys.roof}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(zone)}
            />
            <polygon
              points={polys.leftWall}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(zone)}
            />
            <polygon
              points={polys.rightWall}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(zone)}
            />
          </g>
        );
      })}

      {/* ═══ PROPS ═══ */}
      {/* Benches along paths */}
      <IsoBench gx={4} gy={3.3} />
      <IsoBench gx={6} gy={3.3} />
      <IsoBench gx={10} gy={3.3} />
      <IsoBench gx={13} gy={3.3} />

      {/* Lamp posts */}
      <IsoLamp gx={1} gy={3} />
      <IsoLamp gx={8} gy={6} />
      <IsoLamp gx={14} gy={3} />
      <IsoLamp gx={5} gy={6.5} />

      {/* Trash bins */}
      <IsoTrashBin gx={3} gy={3.5} />
      <IsoTrashBin gx={9} gy={3.5} />
      <IsoTrashBin gx={7} gy={6} />

      {/* ═══ ENTRANCE GATE ═══ */}
      {(() => {
        const gatePolys = isoBuildingPolys(7, 8, 2.5, 0.5, 20);
        return (
          <g>
            {/* Gate pillars */}
            {(() => {
              const lp = isoBuildingPolys(7, 8, 0.3, 0.3, 24);
              const rp = isoBuildingPolys(9.2, 8, 0.3, 0.3, 24);
              return (
                <>
                  <polygon points={lp.leftWall} fill="#5C5C5C" />
                  <polygon points={lp.rightWall} fill="#4A4A4A" />
                  <polygon points={lp.roof} fill="#707070" />
                  <polygon points={rp.leftWall} fill="#5C5C5C" />
                  <polygon points={rp.rightWall} fill="#4A4A4A" />
                  <polygon points={rp.roof} fill="#707070" />
                </>
              );
            })()}
            {/* Gate arch */}
            <polygon points={gatePolys.leftWall} fill="#4A4A4A" stroke="#333" strokeWidth="0.5" />
            <polygon points={gatePolys.rightWall} fill="#3A3A3A" stroke="#333" strokeWidth="0.5" />
            <polygon points={gatePolys.roof} fill="#5C5C5C" stroke="#333" strokeWidth="0.5" />
            {/* Entrance text */}
            <text
              x={gatePolys.roofCenter.x}
              y={gatePolys.roofCenter.y + 2}
              textAnchor="middle"
              fill="#4ADE80"
              fontSize="4"
              fontFamily="monospace"
              fontWeight="bold"
            >
              ENTRANCE
            </text>
            {/* Gate lanterns */}
            <circle cx={gatePolys.roofCenter.x - 15} cy={gatePolys.roofCenter.y - 5}
              r="2.5" fill="#FBBF24" opacity="0.5" />
            <circle cx={gatePolys.roofCenter.x - 15} cy={gatePolys.roofCenter.y - 5}
              r="5" fill="#FBBF24" opacity="0.08" />
            <circle cx={gatePolys.roofCenter.x + 15} cy={gatePolys.roofCenter.y - 5}
              r="2.5" fill="#FBBF24" opacity="0.5" />
            <circle cx={gatePolys.roofCenter.x + 15} cy={gatePolys.roofCenter.y - 5}
              r="5" fill="#FBBF24" opacity="0.08" />
          </g>
        );
      })()}

      {/* ═══ PARKING LOT ═══ */}
      {(() => {
        const parkPolys = isoBuildingPolys(0, 8, 5, 2, 2);
        return (
          <g>
            <polygon points={parkPolys.roof} fill="#4A4A4A" stroke="#333" strokeWidth="0.5" />
            {/* Parking lines */}
            {[1, 2, 3, 4].map((i) => {
              const p1 = gridToScreen(i, 8);
              const p2 = gridToScreen(i, 10);
              return (
                <line key={`pline-${i}`}
                  x1={p1.x} y1={p1.y - 2} x2={p2.x} y2={p2.y - 2}
                  stroke="#6B6B6B" strokeWidth="0.5" opacity="0.6" />
              );
            })}
            {/* Cars */}
            {[
              { col: 0.5, row: 8.5, color: "#D32F2F" },
              { col: 1.5, row: 9, color: "#1976D2" },
              { col: 2.5, row: 8.5, color: "#F9A825" },
              { col: 3.5, row: 9, color: "#388E3C" },
              { col: 4, row: 8.8, color: "#7B1FA2" },
            ].map((car, i) => {
              const cp = gridToScreen(car.col, car.row);
              return (
                <g key={`car-${i}`}>
                  <rect x={cp.x - 5} y={cp.y - 5} width="10" height="6"
                    rx="1.5" fill={car.color} />
                  <rect x={cp.x - 3} y={cp.y - 7} width="6" height="3"
                    rx="1" fill={car.color} opacity="0.7" />
                  <rect x={cp.x - 4} y={cp.y + 1} width="3" height="1.5"
                    rx="0.5" fill="#111" />
                  <rect x={cp.x + 1} y={cp.y + 1} width="3" height="1.5"
                    rx="0.5" fill="#111" />
                </g>
              );
            })}
            <text
              x={parkPolys.roofCenter.x}
              y={parkPolys.roofCenter.y + 1}
              textAnchor="middle"
              fill="#888"
              fontSize="3.5"
              fontFamily="monospace"
            >
              PARKING
            </text>
          </g>
        );
      })()}

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
            <rect x={badgePos.x - 30} y={badgePos.y + 8}
              width="60" height="14" rx="3" fill="#0F172A" opacity="0.85" />
            <text x={badgePos.x} y={badgePos.y + 18}
              textAnchor="middle" fill="#4ADE80" fontSize="5" fontFamily="monospace">
              Guests: {movingChars.length}
            </text>
          </g>
        );
      })()}

      {/* ═══ SIENNA PARK DR SW (road below the park) ═══ */}
      {(() => {
        const roadY = 390;
        return (
          <g>
            {/* Road surface */}
            <rect x="100" y={roadY} width="760" height="18" fill="#4A4A4A" />
            {/* Road edge lines */}
            <rect x="100" y={roadY} width="760" height="1" fill="#FFE066" opacity="0.5" />
            <rect x="100" y={roadY + 17} width="760" height="1" fill="#FFE066" opacity="0.5" />
            {/* Center dashes */}
            {Array.from({ length: 20 }).map((_, i) => (
              <rect key={`dash-${i}`} x={110 + i * 38} y={roadY + 8} width="20" height="1.5"
                fill="#FFE066" opacity="0.6" />
            ))}
            {/* Road label */}
            <text x="480" y={roadY + 12} textAnchor="middle" fill="#888" fontSize="4" fontFamily="monospace">
              SIENNA PARK DR SW
            </text>
            {/* Sidewalk */}
            <rect x="100" y={roadY + 18} width="760" height="6" fill="#B0A090" />
          </g>
        );
      })()}

      {/* ═══ Additional trees south of road ═══ */}
      {[
        { gx: 2, gy: 12, size: 1.0 },
        { gx: 5, gy: 11.5, size: 1.3 },
        { gx: 8, gy: 12, size: 0.9 },
        { gx: 11, gy: 11.5, size: 1.1 },
        { gx: 14, gy: 12, size: 1.0 },
      ].map((t, i) => {
        const pos = gridToScreen(t.gx, t.gy);
        const s = t.size;
        return (
          <g key={`stree-${i}`}>
            <rect x={pos.x - 1.5 * s} y={pos.y - 5 * s} width={3 * s} height={8 * s} fill="#5C3A1E" />
            <ellipse cx={pos.x} cy={pos.y - 7 * s} rx={7 * s} ry={5 * s} fill="#2D5016" />
            <ellipse cx={pos.x} cy={pos.y - 10 * s} rx={5.5 * s} ry={4 * s} fill="#3A6B1E" />
            <ellipse cx={pos.x} cy={pos.y - 12 * s} rx={4 * s} ry={3 * s} fill="#4A7C28" />
          </g>
        );
      })}

      {/* ═══ TITLE BANNER ═══ */}
      {(() => {
        const bannerPos = gridToScreen(GRID_COLS / 2, GRID_ROWS + 1);
        return (
          <g>
            <rect x={bannerPos.x - 130} y={bannerPos.y - 2}
              width="260" height="30" rx="4" fill="#0F172A" opacity="0.92" />
            <text x={bannerPos.x} y={bannerPos.y + 13}
              textAnchor="middle" fill="#4ADE80" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
              SIGNAL HILL NEIGHBOUR DAY
            </text>
            <text x={bannerPos.x} y={bannerPos.y + 23}
              textAnchor="middle" fill="#FFE066" fontSize="5.5" fontFamily="monospace">
              JUNE 21, 2026
            </text>
          </g>
        );
      })()}

      {/* ═══ Houses/buildings south of road (neighborhood) ═══ */}
      {[
        { x: 180, y: 430, w: 30, h: 20, color: "#C4956A" },
        { x: 300, y: 435, w: 25, h: 18, color: "#A0C4E8" },
        { x: 420, y: 430, w: 28, h: 20, color: "#E8D0A0" },
        { x: 540, y: 435, w: 24, h: 18, color: "#C8A0A0" },
        { x: 660, y: 430, w: 30, h: 20, color: "#A0D0A0" },
      ].map((h, i) => (
        <g key={`house-${i}`}>
          {/* House body */}
          <rect x={h.x} y={h.y} width={h.w} height={h.h} fill={h.color} stroke="#666" strokeWidth="0.5" />
          {/* Roof */}
          <polygon
            points={`${h.x - 2},${h.y} ${h.x + h.w / 2},${h.y - 8} ${h.x + h.w + 2},${h.y}`}
            fill="#8B4513" stroke="#666" strokeWidth="0.3" />
          {/* Window */}
          <rect x={h.x + 4} y={h.y + 4} width="6" height="6" fill="#87CEEB" stroke="#555" strokeWidth="0.3" />
          {/* Door */}
          <rect x={h.x + h.w - 10} y={h.y + 8} width="6" height={h.h - 8} fill="#654321" />
        </g>
      ))}
    </svg>
  );
}
