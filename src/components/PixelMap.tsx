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
    gx: 0.5, gy: 0.5, gw: 3, gd: 2, h: 28,
    colors: { roof: "#EF4444", leftWall: "#DC2626", rightWall: "#B91C1C" },
    description: "Inflatable fun for kids of all ages!",
  },
  {
    id: "facepainting", label: "Face Painting",
    gx: 4, gy: 0.5, gw: 2.5, gd: 2, h: 16,
    colors: { roof: "#C084FC", leftWall: "#A855F7", rightWall: "#9333EA" },
    description: "Get your face painted by local artists",
  },
  {
    id: "games", label: "Yard Games",
    gx: 7, gy: 0.5, gw: 3, gd: 2, h: 14,
    colors: { roof: "#4ADE80", leftWall: "#22C55E", rightWall: "#16A34A" },
    description: "Cornhole, ladder toss, and more",
  },
  {
    id: "info", label: "SHCA Info",
    gx: 11, gy: 0.5, gw: 3.5, gd: 2.5, h: 20,
    colors: { roof: "#60A5FA", leftWall: "#3B82F6", rightWall: "#2563EB" },
    description: "Community info & membership signup",
  },
  {
    id: "petting", label: "Petting Zoo",
    gx: 0.5, gy: 4, gw: 3, gd: 2, h: 10,
    colors: { roof: "#FDE047", leftWall: "#FACC15", rightWall: "#EAB308" },
    description: "Meet friendly farm animals",
  },
  {
    id: "food", label: "Food Vendors",
    gx: 4, gy: 3.5, gw: 3, gd: 2.5, h: 18,
    colors: { roof: "#FB923C", leftWall: "#F97316", rightWall: "#EA580C" },
    description: "Local food trucks and BBQ",
  },
  {
    id: "stage", label: "Music Stage",
    gx: 7.5, gy: 4, gw: 3, gd: 2.5, h: 24,
    colors: { roof: "#38BDF8", leftWall: "#0EA5E9", rightWall: "#0284C7" },
    description: "Live music all day long",
  },
  {
    id: "sponsors", label: "Sponsors",
    gx: 11, gy: 4, gw: 3, gd: 2, h: 16,
    colors: { roof: "#F472B6", leftWall: "#EC4899", rightWall: "#DB2777" },
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

// ─── Zone ground decorations (tables, equipment under tents) ──
function BuildingDecor({ zone }: { zone: IsoZone }) {
  const { gx, gy, gw, gd, h } = zone;
  const polys = isoBuildingPolys(gx, gy, gw, gd, h);

  // Helper: place a table at normalized position within the zone footprint
  const tableAt = (u: number, v: number, color: string) => {
    const cx = polys.topCorner.x + u * (polys.rightCorner.x - polys.topCorner.x) + v * (polys.leftCorner.x - polys.topCorner.x);
    const cy = polys.topCorner.y + u * (polys.rightCorner.y - polys.topCorner.y) + v * (polys.leftCorner.y - polys.topCorner.y);
    return (
      <g>
        {/* Table shadow */}
        <ellipse cx={cx} cy={cy + 2} rx="5" ry="2" fill="#000" opacity="0.06" />
        {/* Table top (iso diamond) */}
        <polygon
          points={`${cx},${cy - 3} ${cx + 5},${cy - 1} ${cx},${cy + 1} ${cx - 5},${cy - 1}`}
          fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="0.3"
        />
        {/* Table legs */}
        <line x1={cx - 3} y1={cy - 1} x2={cx - 3} y2={cy + 2} stroke="#6B4226" strokeWidth="0.6" />
        <line x1={cx + 3} y1={cy - 1} x2={cx + 3} y2={cy + 2} stroke="#6B4226" strokeWidth="0.6" />
      </g>
    );
  };

  switch (zone.id) {
    case "info":
      return (
        <g>
          {/* Info table with banner */}
          {tableAt(0.45, 0.45, "#BFDBFE")}
          {tableAt(0.7, 0.6, "#DBEAFE")}
          {/* SHCA Banner hanging from canopy */}
          <rect x={polys.roofCenter.x - 12} y={polys.roofCenter.y - 6} width="24" height="8" rx="1.5"
            fill="#F8FAFC" opacity="0.9" />
          <text x={polys.roofCenter.x} y={polys.roofCenter.y + 0.5} textAnchor="middle"
            fill="#1D4ED8" fontSize="5" fontFamily="system-ui, sans-serif" fontWeight="800">SHCA</text>
          {/* Flag pole */}
          <line x1={polys.rTopCorner.x + 8} y1={polys.rTopCorner.y}
            x2={polys.rTopCorner.x + 8} y2={polys.rTopCorner.y - 16}
            stroke="#475569" strokeWidth="0.8" />
          <polygon
            points={`${polys.rTopCorner.x + 9},${polys.rTopCorner.y - 16} ${polys.rTopCorner.x + 16},${polys.rTopCorner.y - 13.5} ${polys.rTopCorner.x + 9},${polys.rTopCorner.y - 11}`}
            fill="#2563EB" />
        </g>
      );
    case "bouncy":
      return (
        <g>
          {/* Inflatable bounce pad on ground */}
          <polygon
            points={`${polys.topCorner.x},${polys.topCorner.y + 2} ${polys.rightCorner.x - 8},${polys.rightCorner.y + 2} ${polys.bottomCorner.x},${polys.bottomCorner.y} ${polys.leftCorner.x + 8},${polys.leftCorner.y}`}
            fill="#EF4444" opacity="0.35" rx="4"
          />
          {/* Puffy sides */}
          <ellipse cx={polys.roofCenter.x - 10} cy={polys.bottomCorner.y - 2} rx="8" ry="4"
            fill="#F87171" opacity="0.5" />
          <ellipse cx={polys.roofCenter.x + 10} cy={polys.bottomCorner.y - 4} rx="8" ry="4"
            fill="#FCA5A5" opacity="0.4" />
          {/* Turrets/castle detail on ground */}
          <rect x={polys.roofCenter.x - 12} y={polys.bottomCorner.y - 12} width="5" height="8" rx="1"
            fill="#F87171" opacity="0.6" />
          <rect x={polys.roofCenter.x + 7} y={polys.bottomCorner.y - 10} width="5" height="7" rx="1"
            fill="#FCA5A5" opacity="0.5" />
          {/* Flag */}
          <line x1={polys.roofCenter.x} y1={polys.rTopCorner.y}
            x2={polys.roofCenter.x} y2={polys.rTopCorner.y - 12}
            stroke="#475569" strokeWidth="0.7" />
          <polygon
            points={`${polys.roofCenter.x + 1},${polys.rTopCorner.y - 12} ${polys.roofCenter.x + 7},${polys.rTopCorner.y - 10} ${polys.roofCenter.x + 1},${polys.rTopCorner.y - 8}`}
            fill="#FBBF24" />
        </g>
      );
    case "food":
      return (
        <g>
          {/* Food tables */}
          {tableAt(0.3, 0.35, "#FED7AA")}
          {tableAt(0.6, 0.5, "#FFEDD5")}
          {tableAt(0.4, 0.7, "#FEE2E2")}
          {/* Canopy stripes */}
          <line x1={polys.rTopCorner.x + 6} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 6} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="1.5" opacity="0.25" />
          <line x1={polys.rTopCorner.x + 16} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 16} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="1.5" opacity="0.25" />
          {/* Smoke puffs rising above canopy */}
          <circle cx={polys.roofCenter.x - 6} cy={polys.roofCenter.y - 10}
            r="2.5" fill="#94A3B8" opacity="0.12" />
          <circle cx={polys.roofCenter.x - 4} cy={polys.roofCenter.y - 16}
            r="2" fill="#94A3B8" opacity="0.08" />
          <circle cx={polys.roofCenter.x - 2} cy={polys.roofCenter.y - 21}
            r="1.5" fill="#94A3B8" opacity="0.05" />
        </g>
      );
    case "stage":
      return (
        <g>
          {/* Stage platform on ground */}
          <polygon
            points={`${polys.topCorner.x + 5},${polys.topCorner.y + 3} ${polys.rightCorner.x - 5},${polys.rightCorner.y + 2} ${polys.bottomCorner.x - 2},${polys.bottomCorner.y - 1} ${polys.leftCorner.x + 5},${polys.leftCorner.y - 1}`}
            fill="#4A3728" opacity="0.5"
          />
          {/* Speaker stacks on ground */}
          <rect x={polys.leftCorner.x + 10} y={polys.leftCorner.y - 8} width="5" height="6" rx="0.5"
            fill="#1A1A1A" stroke="#333" strokeWidth="0.3" />
          <circle cx={polys.leftCorner.x + 12.5} cy={polys.leftCorner.y - 5.5} r="1.5" fill="#2D2D2D" />
          <rect x={polys.rightCorner.x - 15} y={polys.rightCorner.y - 6} width="5" height="6" rx="0.5"
            fill="#1A1A1A" stroke="#333" strokeWidth="0.3" />
          <circle cx={polys.rightCorner.x - 12.5} cy={polys.rightCorner.y - 3.5} r="1.5" fill="#2D2D2D" />
          {/* Stage lights hanging from canopy */}
          <circle cx={polys.roofCenter.x - 10} cy={polys.roofCenter.y + 5}
            r="2" fill="#FBBF24" opacity="0.7" filter="url(#glow)" />
          <circle cx={polys.roofCenter.x + 3} cy={polys.roofCenter.y + 5}
            r="2" fill="#EF4444" opacity="0.7" filter="url(#glow)" />
          <circle cx={polys.roofCenter.x + 16} cy={polys.roofCenter.y + 5}
            r="2" fill="#3B82F6" opacity="0.7" filter="url(#glow)" />
        </g>
      );
    case "games":
      return (
        <g>
          {/* Cornhole boards on ground */}
          <polygon
            points={`${polys.bottomCorner.x - 12},${polys.bottomCorner.y - 8} ${polys.bottomCorner.x - 6},${polys.bottomCorner.y - 10} ${polys.bottomCorner.x - 3},${polys.bottomCorner.y - 7} ${polys.bottomCorner.x - 9},${polys.bottomCorner.y - 5}`}
            fill="#C4956A" stroke="#8B6914" strokeWidth="0.3"
          />
          <circle cx={polys.bottomCorner.x - 8} cy={polys.bottomCorner.y - 7.5} r="1" fill="#1A1A1A" />
          {/* Pennant flags between canopy poles */}
          {[0, 1, 2, 3, 4].map((i) => {
            const t = (i + 0.5) / 5;
            const fx = polys.rLeftCorner.x + t * (polys.rBottomCorner.x - polys.rLeftCorner.x);
            const fy = polys.rLeftCorner.y + t * (polys.rBottomCorner.y - polys.rLeftCorner.y) + 3;
            const colors = ["#EF4444", "#FBBF24", "#3B82F6", "#22C55E", "#A855F7"];
            return (
              <polygon key={`pf-${i}`}
                points={`${fx - 1.5},${fy} ${fx + 1.5},${fy} ${fx},${fy + 3.5}`}
                fill={colors[i]} opacity="0.8" />
            );
          })}
          {/* Ladder toss frame */}
          <rect x={polys.roofCenter.x + 5} y={polys.bottomCorner.y - 10} width="1" height="8" fill="#6B6B6B" />
          <rect x={polys.roofCenter.x + 12} y={polys.bottomCorner.y - 10} width="1" height="8" fill="#6B6B6B" />
          <rect x={polys.roofCenter.x + 5} y={polys.bottomCorner.y - 10} width="8" height="1" fill="#6B6B6B" />
          <rect x={polys.roofCenter.x + 5} y={polys.bottomCorner.y - 7} width="8" height="1" fill="#6B6B6B" />
          <rect x={polys.roofCenter.x + 5} y={polys.bottomCorner.y - 4} width="8" height="1" fill="#6B6B6B" />
        </g>
      );
    case "petting":
      return (
        <g>
          {/* Wooden fence enclosure on ground */}
          <polygon
            points={`${polys.topCorner.x},${polys.topCorner.y + 3} ${polys.rightCorner.x},${polys.rightCorner.y + 2} ${polys.bottomCorner.x},${polys.bottomCorner.y} ${polys.leftCorner.x},${polys.leftCorner.y + 1}`}
            fill="none" stroke="#A08040" strokeWidth="1.2" strokeDasharray="3 2"
          />
          {/* Hay on ground */}
          <ellipse cx={polys.bottomCorner.x - 5} cy={polys.bottomCorner.y - 3} rx="4" ry="2"
            fill="#D4A854" opacity="0.4" />
          <ellipse cx={polys.bottomCorner.x + 8} cy={polys.bottomCorner.y - 5} rx="3" ry="1.5"
            fill="#C8A048" opacity="0.3" />
          {/* Small animals */}
          <ellipse cx={polys.roofCenter.x - 6} cy={polys.bottomCorner.y - 4} rx="3" ry="2"
            fill="#F0F0F0" />
          <circle cx={polys.roofCenter.x - 8} cy={polys.bottomCorner.y - 5.5} r="1.5" fill="#E8E8E8" />
          <ellipse cx={polys.roofCenter.x + 8} cy={polys.bottomCorner.y - 3} rx="2.5" ry="1.8"
            fill="#C4956A" />
          <circle cx={polys.roofCenter.x + 6.5} cy={polys.bottomCorner.y - 4.5} r="1.2" fill="#B8856A" />
          {/* Tiny chick */}
          <circle cx={polys.roofCenter.x + 2} cy={polys.bottomCorner.y - 1.5} r="1" fill="#FDE047" />
          <circle cx={polys.roofCenter.x + 2.5} cy={polys.bottomCorner.y - 2.5} r="0.7" fill="#FDE047" />
        </g>
      );
    case "facepainting":
      return (
        <g>
          {/* Tables with paint supplies */}
          {tableAt(0.4, 0.4, "#E9D5FF")}
          {tableAt(0.65, 0.6, "#FCE7F3")}
          {/* Paint splotch decorations on canopy */}
          <circle cx={polys.roofCenter.x - 6} cy={polys.roofCenter.y + 1} r="2.2" fill="#EF4444" opacity="0.45" />
          <circle cx={polys.roofCenter.x + 3} cy={polys.roofCenter.y + 3} r="1.8" fill="#3B82F6" opacity="0.45" />
          <circle cx={polys.roofCenter.x + 8} cy={polys.roofCenter.y} r="1.5" fill="#FBBF24" opacity="0.45" />
          {/* Canvas on canopy stripe */}
          <line x1={polys.rTopCorner.x + 5} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 5} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="1.5" opacity="0.2" />
        </g>
      );
    case "sponsors":
      return (
        <g>
          {/* Display tables */}
          {tableAt(0.35, 0.4, "#FBCFE8")}
          {tableAt(0.6, 0.55, "#FEF3C7")}
          {/* Banner stands next to tables */}
          <rect x={polys.roofCenter.x - 14} y={polys.bottomCorner.y - 12}
            width="1" height="10" fill="#6B6B6B" />
          <rect x={polys.roofCenter.x - 18} y={polys.bottomCorner.y - 12}
            width="9" height="6" rx="0.5" fill="#F472B6" opacity="0.7" stroke="#DB2777" strokeWidth="0.3" />
          <rect x={polys.roofCenter.x + 8} y={polys.bottomCorner.y - 10}
            width="1" height="10" fill="#6B6B6B" />
          <rect x={polys.roofCenter.x + 5} y={polys.bottomCorner.y - 10}
            width="9" height="6" rx="0.5" fill="#FDE68A" opacity="0.7" stroke="#D97706" strokeWidth="0.3" />
          {/* Canopy stripe */}
          <line x1={polys.rTopCorner.x + 8} y1={polys.rTopCorner.y + 2}
            x2={polys.rBottomCorner.x + 8} y2={polys.rBottomCorner.y + 2}
            stroke="#FFF" strokeWidth="1.5" opacity="0.2" />
        </g>
      );
    default:
      return null;
  }
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
      viewBox="80 -80 800 520"
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

        {/* ═══ GRASS TEXTURE GRADIENT ═══ */}
        <linearGradient id="grassLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3D8B2A" />
          <stop offset="100%" stopColor="#2E6B1C" />
        </linearGradient>
        <linearGradient id="grassDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#357826" />
          <stop offset="100%" stopColor="#2A6118" />
        </linearGradient>

        {/* ═══ PATH GRADIENTS ═══ */}
        <linearGradient id="pathLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4BA82" />
          <stop offset="100%" stopColor="#C4A66C" />
        </linearGradient>
        <linearGradient id="pathDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C8AE72" />
          <stop offset="100%" stopColor="#B89858" />
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

        {/* ═══ CLOUD FILTER ═══ */}
        <filter id="cloudSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
      </defs>

      {/* ═══ SKY ═══ */}
      <rect x="80" y="-120" width="800" height="700" fill="url(#skyGrad)" />

      {/* Dark green ground (outside the park) */}
      <rect x="80" y="130" width="800" height="500" fill="#1A5C10" />

      {/* Sun glow (behind clouds) */}
      <circle cx="780" cy="28" r="50" fill="url(#sunGlow)" />
      <circle cx="780" cy="28" r="18" fill="#FFF8DC" />
      <circle cx="776" cy="24" r="5" fill="#FFFEF0" opacity="0.6" />

      {/* Clouds – soft, multi-layered */}
      {[
        { bx: 180, by: 18, s: 1.2, spd: 0.015 },
        { bx: 350, by: 8, s: 1.0, spd: 0.012 },
        { bx: 520, by: 22, s: 0.85, spd: 0.02 },
        { bx: 680, by: 14, s: 0.95, spd: 0.018 },
        { bx: 130, by: 42, s: 0.65, spd: 0.01 },
        { bx: 450, by: 46, s: 0.55, spd: 0.008 },
      ].map((c, i) => {
        const drift = (frame * c.spd) % 40 - 20;
        return (
          <g key={`cloud-${i}`} opacity={0.65} filter="url(#cloudSoft)">
            <ellipse cx={c.bx + drift - 14} cy={c.by + 5} rx={18 * c.s} ry={6 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift} cy={c.by} rx={24 * c.s} ry={8 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift + 16} cy={c.by + 4} rx={16 * c.s} ry={6 * c.s} fill="#FFF" />
            <ellipse cx={c.bx + drift + 6} cy={c.by - 3} rx={12 * c.s} ry={5 * c.s} fill="#FFF" opacity="0.7" />
          </g>
        );
      })}

      {/* ═══ GROUND TILES (Diamond checkered pattern with gradients) ═══ */}
      {Array.from({ length: GRID_ROWS }).map((_, row) =>
        Array.from({ length: GRID_COLS }).map((_, col) => {
          const path = isPathTile(col, row);
          const fill = path
            ? ((row + col) % 2 === 0 ? "url(#pathLight)" : "url(#pathDark)")
            : ((row + col) % 2 === 0 ? "url(#grassLight)" : "url(#grassDark)");
          const stroke = path ? "#B89858" : "#2A6118";
          return (
            <polygon
              key={`tile-${row}-${col}`}
              points={tileDiamond(col, row)}
              fill={fill}
              stroke={stroke}
              strokeWidth="0.3"
              strokeOpacity="0.5"
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
        const pts = `${tl.x},${tl.y} ${tr.x},${tr.y} ${br.x},${br.y} ${bl.x},${bl.y}`;
        return (
          <g>
            {/* Fence shadow */}
            <polygon
              points={pts}
              fill="none"
              stroke="#000"
              strokeWidth="3"
              strokeOpacity="0.08"
              transform="translate(1,2)"
            />
            {/* Fence */}
            <polygon
              points={pts}
              fill="none"
              stroke="#7C5A2E"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Fence highlight */}
            <polygon
              points={pts}
              fill="none"
              stroke="#A08050"
              strokeWidth="0.6"
              strokeDasharray="8 4"
              strokeOpacity="0.5"
            />
          </g>
        );
      })()}

      {/* ═══ ZONES (open tents, canopies & tables – sorted back-to-front) ═══ */}
      {sortedZones.map((zone) => {
        const polys = isoBuildingPolys(zone.gx, zone.gy, zone.gw, zone.gd, zone.h);
        const isHovered = hoveredZone === zone.id;
        const isSelected = selectedZoneId === zone.id;

        // Corner positions for tent poles
        const bl = polys.leftCorner;   // base left
        const br = polys.bottomCorner; // base bottom
        const bRight = polys.rightCorner; // base right
        const bTop = polys.topCorner;  // base top

        return (
          <g key={zone.id} filter="url(#buildingShadow)">
            {/* Ground pad – subtle colored area under the tent */}
            <polygon
              points={`${bTop.x},${bTop.y} ${bRight.x},${bRight.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
              fill={zone.colors.roof}
              opacity="0.08"
            />

            {/* Tent poles at corners */}
            {[
              { base: bl, roof: polys.rLeftCorner },
              { base: br, roof: polys.rBottomCorner },
              { base: bRight, roof: polys.rRightCorner },
              { base: bTop, roof: polys.rTopCorner },
            ].map((pole, i) => (
              <line key={`pole-${zone.id}-${i}`}
                x1={pole.base.x} y1={pole.base.y}
                x2={pole.roof.x} y2={pole.roof.y}
                stroke="#8B7355" strokeWidth="1.2" strokeLinecap="round"
              />
            ))}

            {/* Tent canopy (translucent roof) */}
            <polygon
              points={polys.roof}
              fill={`url(#roof-${zone.id})`}
              opacity={isHovered ? "0.75" : "0.6"}
              stroke={isSelected ? "#FFE066" : isHovered ? "#FFF" : zone.colors.roof}
              strokeWidth={isSelected ? "2" : isHovered ? "1.5" : "0.6"}
              strokeLinejoin="round"
              style={{ transition: "opacity 0.2s" }}
            />
            {/* Canopy highlight stripe */}
            <polygon
              points={polys.roof}
              fill="#FFF"
              opacity={isHovered ? "0.15" : "0.08"}
              style={{ pointerEvents: "none" }}
            />

            {/* Scalloped edge – left valance */}
            {(() => {
              const edgePoints: string[] = [];
              const steps = 6;
              for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = polys.rLeftCorner.x + t * (polys.rBottomCorner.x - polys.rLeftCorner.x);
                const y = polys.rLeftCorner.y + t * (polys.rBottomCorner.y - polys.rLeftCorner.y);
                const scallop = Math.sin(t * Math.PI * steps) * 2;
                edgePoints.push(`${x},${y + scallop + 2}`);
              }
              const topEdge = `${polys.rBottomCorner.x},${polys.rBottomCorner.y} ${polys.rLeftCorner.x},${polys.rLeftCorner.y}`;
              return (
                <polygon
                  points={`${polys.rLeftCorner.x},${polys.rLeftCorner.y} ${edgePoints.join(" ")} ${polys.rBottomCorner.x},${polys.rBottomCorner.y}`}
                  fill={zone.colors.leftWall}
                  opacity="0.4"
                />
              );
            })()}

            {/* Scalloped edge – right valance */}
            {(() => {
              const edgePoints: string[] = [];
              const steps = 6;
              for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const x = polys.rBottomCorner.x + t * (polys.rRightCorner.x - polys.rBottomCorner.x);
                const y = polys.rBottomCorner.y + t * (polys.rRightCorner.y - polys.rBottomCorner.y);
                const scallop = Math.sin(t * Math.PI * steps) * 2;
                edgePoints.push(`${x},${y + scallop + 2}`);
              }
              return (
                <polygon
                  points={`${polys.rBottomCorner.x},${polys.rBottomCorner.y} ${edgePoints.join(" ")} ${polys.rRightCorner.x},${polys.rRightCorner.y}`}
                  fill={zone.colors.rightWall}
                  opacity="0.35"
                />
              );
            })()}

            {/* Zone-specific ground items (tables, equipment, etc.) */}
            <BuildingDecor zone={zone} />

            {/* Label on canopy */}
            <text
              x={polys.roofCenter.x}
              y={polys.roofCenter.y + 2}
              textAnchor="middle"
              fill="#FFF"
              fontSize="4.2"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="700"
              letterSpacing="0.5"
              stroke="rgba(0,0,0,0.4)" strokeWidth="0.4" paintOrder="stroke"
              style={{ pointerEvents: "none" }}
            >
              {zone.label.toUpperCase()}
            </text>

            {/* Click targets (generous hit area) */}
            <polygon
              points={polys.roof}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredZone(zone.id)}
              onMouseLeave={() => setHoveredZone(null)}
              onClick={() => handleZoneClick(zone)}
            />
            <polygon
              points={`${bTop.x},${bTop.y} ${bRight.x},${bRight.y} ${br.x},${br.y} ${bl.x},${bl.y}`}
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
              fontSize="3.8"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="700"
              letterSpacing="1.5"
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

      {/* ═══ TITLE BANNER ═══ */}
      {(() => {
        const bannerPos = gridToScreen(GRID_COLS / 2, GRID_ROWS + 0.5);
        return (
          <g>
            {/* Banner shadow */}
            <rect x={bannerPos.x - 128} y={bannerPos.y + 1}
              width="256" height="28" rx="8" fill="#000" opacity="0.2" />
            {/* Banner background */}
            <rect x={bannerPos.x - 130} y={bannerPos.y - 2}
              width="260" height="30" rx="8" fill="#0A0F1E" opacity="0.88" />
            {/* Banner border glow */}
            <rect x={bannerPos.x - 130} y={bannerPos.y - 2}
              width="260" height="30" rx="8" fill="none"
              stroke="#4ADE80" strokeWidth="0.5" strokeOpacity="0.3" />
            <text x={bannerPos.x} y={bannerPos.y + 12}
              textAnchor="middle" fill="#4ADE80" fontSize="7"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" letterSpacing="1.5">
              SIGNAL HILL NEIGHBOUR DAY
            </text>
            <text x={bannerPos.x} y={bannerPos.y + 22}
              textAnchor="middle" fill="#FFE066" fontSize="5"
              fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" letterSpacing="2">
              JUNE 21, 2026
            </text>
          </g>
        );
      })()}
    </svg>
  );
}
