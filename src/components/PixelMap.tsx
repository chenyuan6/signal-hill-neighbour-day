"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapZone, PixelCharacterData } from "@/lib/types";
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
  { id: "bouncy", label: "Bouncy Castles", icon: "🏰", x: 60, y: 80, width: 100, height: 70, color: "#F87171", description: "Inflatable fun for kids of all ages!" },
  { id: "facepainting", label: "Face Painting", icon: "🎨", x: 180, y: 80, width: 80, height: 60, color: "#A78BFA", description: "Get your face painted by local artists" },
  { id: "petting", label: "Petting Zoo", icon: "🐑", x: 60, y: 170, width: 90, height: 70, color: "#FBBF24", description: "Meet friendly farm animals" },
  { id: "food", label: "Food Vendors", icon: "🍔", x: 170, y: 160, width: 110, height: 80, color: "#FB923C", description: "Local food trucks and BBQ" },
  { id: "games", label: "Yard Games", icon: "🎯", x: 300, y: 80, width: 90, height: 70, color: "#4ADE80", description: "Cornhole, ladder toss, and more" },
  { id: "stage", label: "Music Stage", icon: "🎵", x: 300, y: 170, width: 100, height: 70, color: "#22D3EE", description: "Live music all day long" },
  { id: "info", label: "SHCA Info", icon: "ℹ️", x: 420, y: 80, width: 80, height: 60, color: "#60A5FA", description: "Community info & membership signup" },
  { id: "sponsors", label: "Sponsors", icon: "⭐", x: 420, y: 160, width: 80, height: 70, color: "#F472B6", description: "Meet our amazing community sponsors" },
];

const TICK_MS = 33;
const POLL_MS = 8000;

// ─── SVG helper components ──────────────────────────────────────

/** Wooden fence segments along a zone border */
function Fence({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const posts: React.ReactNode[] = [];
  const spacing = 8;
  // Top & bottom horizontal rails
  for (let px = x; px < x + w; px += spacing) {
    // Top fence
    posts.push(
      <g key={`ft-${px}-${y}`}>
        <rect x={px} y={y - 3} width="2" height="6" fill="#92400E" />
        <rect x={px - 1} y={y - 1} width="4" height="1" fill="#B45309" />
      </g>
    );
    // Bottom fence
    posts.push(
      <g key={`fb-${px}-${y + h}`}>
        <rect x={px} y={y + h - 3} width="2" height="6" fill="#92400E" />
        <rect x={px - 1} y={y + h - 1} width="4" height="1" fill="#B45309" />
      </g>
    );
  }
  // Left & right vertical rails
  for (let py = y; py < y + h; py += spacing) {
    posts.push(
      <g key={`fl-${x}-${py}`}>
        <rect x={x - 2} y={py} width="2" height="6" fill="#92400E" />
      </g>
    );
    posts.push(
      <g key={`fr-${x + w}-${py}`}>
        <rect x={x + w} y={py} width="2" height="6" fill="#92400E" />
      </g>
    );
  }
  return <>{posts}</>;
}

/** A pixel-art bench */
function Bench({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="12" height="4" fill="#92400E" />
      <rect x={x} y={y + 4} width="2" height="3" fill="#78350F" />
      <rect x={x + 10} y={y + 4} width="2" height="3" fill="#78350F" />
      <rect x={x + 1} y={y - 1} width="10" height="2" fill="#B45309" />
    </g>
  );
}

/** A pixel-art lamppost */
function Lamp({ x, y, on }: { x: number; y: number; on?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width="2" height="14" fill="#475569" />
      <rect x={x - 3} y={y - 1} width="8" height="3" fill="#64748B" rx="1" />
      {on && <circle cx={x + 1} cy={y + 1} r="4" fill="#FBBF24" opacity="0.15" />}
    </g>
  );
}

/** A pixel-art trash can */
function TrashCan({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="6" height="8" fill="#475569" />
      <rect x={x - 1} y={y - 1} width="8" height="2" fill="#64748B" />
      <rect x={x + 2} y={y + 2} width="2" height="4" fill="#334155" />
    </g>
  );
}

/** Small flower cluster */
function Flowers({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x} y={y + 2} width="1" height="2" fill="#15803D" />
      <rect x={x + 3} y={y + 1} width="1" height="3" fill="#15803D" />
      <rect x={x + 5} y={y + 2} width="1" height="2" fill="#15803D" />
      <circle cx={x + 0.5} cy={y + 1} r="1.5" fill={color} />
      <circle cx={x + 3.5} cy={y} r="1.5" fill={color} />
      <circle cx={x + 5.5} cy={y + 1} r="1.5" fill={color} />
    </g>
  );
}

/** A small flag on a pole */
function Flag({ x, y, color, frame }: { x: number; y: number; color: string; frame: number }) {
  const wave = Math.sin(frame * 0.08) * 1.5;
  return (
    <g>
      <rect x={x} y={y} width="1.5" height="16" fill="#475569" />
      <polygon
        points={`${x + 1.5},${y} ${x + 12 + wave},${y + 3} ${x + 1.5},${y + 7}`}
        fill={color}
      />
    </g>
  );
}

/** Pixel art tree (improved) */
function Tree({ x, y, size }: { x: number; y: number; size?: "small" | "large" }) {
  const s = size === "large" ? 1.3 : 1;
  return (
    <g>
      <rect x={x} y={y + 8 * s} width={6 * s} height={12 * s} fill="#92400E" />
      <rect x={x - 1} y={y + 18 * s} width={8 * s} height={2} fill="#78350F" opacity="0.4" />
      <circle cx={x + 3 * s} cy={y + 3 * s} r={10 * s} fill="#15803D" />
      <circle cx={x + 3 * s} cy={y - 2 * s} r={7 * s} fill="#166534" />
      <circle cx={x + 8 * s} cy={y + 2 * s} r={5 * s} fill="#14532D" />
    </g>
  );
}

// ─── Zone interior details ──────────────────────────────────────
function ZoneInterior({ id, x, y, w, h }: { id: string; x: number; y: number; w: number; h: number }) {
  switch (id) {
    case "bouncy":
      return (
        <g>
          {/* Bouncy castle structure */}
          <rect x={x + 15} y={y + 10} width="30" height="25" fill="#EF4444" rx="2" />
          <rect x={x + 12} y={y + 8} width="36" height="5" fill="#DC2626" rx="2" />
          {/* Turrets */}
          <rect x={x + 14} y={y + 3} width="6" height="8" fill="#F87171" />
          <rect x={x + 37} y={y + 3} width="6" height="8" fill="#F87171" />
          <rect x={x + 25} y={y + 1} width="8" height="10" fill="#FCA5A5" />
          {/* Entrance */}
          <rect x={x + 26} y={y + 25} width="8" height="10" fill="#1E293B" rx="4" />
          {/* Second smaller castle */}
          <rect x={x + 60} y={y + 20} width="20" height="18" fill="#818CF8" rx="2" />
          <rect x={x + 58} y={y + 18} width="24" height="4" fill="#6366F1" rx="2" />
          <rect x={x + 59} y={y + 14} width="5" height="6" fill="#A78BFA" />
          <rect x={x + 76} y={y + 14} width="5" height="6" fill="#A78BFA" />
        </g>
      );
    case "facepainting":
      return (
        <g>
          {/* Easel */}
          <rect x={x + 10} y={y + 8} width="16" height="22" fill="#F0FDF4" stroke="#92400E" strokeWidth="1" />
          <rect x={x + 12} y={y + 10} width="12" height="16" fill="#DBEAFE" />
          {/* Paint splotches on canvas */}
          <circle cx={x + 15} cy={y + 15} r="3" fill="#F87171" />
          <circle cx={x + 21} cy={y + 18} r="2" fill="#4ADE80" />
          <circle cx={x + 18} cy={y + 22} r="2.5" fill="#FBBF24" />
          {/* Paint palette */}
          <ellipse cx={x + 50} cy={y + 30} rx="10" ry="6" fill="#92400E" />
          <circle cx={x + 46} cy={y + 28} r="2" fill="#F87171" />
          <circle cx={x + 50} cy={y + 26} r="2" fill="#60A5FA" />
          <circle cx={x + 54} cy={y + 28} r="2" fill="#4ADE80" />
          <circle cx={x + 50} cy={y + 32} r="2" fill="#FBBF24" />
          {/* Chair */}
          <rect x={x + 35} y={y + 20} width="8" height="8" fill="#78350F" />
          <rect x={x + 34} y={y + 15} width="2" height="13" fill="#92400E" />
        </g>
      );
    case "petting":
      return (
        <g>
          {/* Hay bales */}
          <rect x={x + 5} y={y + 45} width="14" height="8" fill="#EAB308" rx="2" />
          <rect x={x + 6} y={y + 46} width="12" height="2" fill="#CA8A04" />
          <rect x={x + 60} y={y + 40} width="14" height="8" fill="#EAB308" rx="2" />
          {/* Fence rail inside */}
          <rect x={x + 5} y={y + 25} width="75" height="2" fill="#92400E" />
          {/* Small sheep */}
          <ellipse cx={x + 30} cy={y + 35} rx="6" ry="4" fill="#F0FDF4" />
          <circle cx={x + 25} cy={y + 33} r="3" fill="#E2E8F0" />
          <rect x={x + 23} y={y + 31} width="2" height="2" fill="#0F172A" />
          <rect x={x + 27} y={y + 37} width="2" height="4" fill="#1E293B" />
          <rect x={x + 31} y={y + 37} width="2" height="4" fill="#1E293B" />
          {/* Small goat */}
          <ellipse cx={x + 55} cy={y + 35} rx="5" ry="3.5" fill="#D4A574" />
          <circle cx={x + 50} cy={y + 33} r="3" fill="#C4956A" />
          <rect x={x + 49} y={y + 30} width="1" height="3" fill="#92400E" />
          <rect x={x + 52} y={y + 30} width="1" height="3" fill="#92400E" />
        </g>
      );
    case "food":
      return (
        <g>
          {/* BBQ grill */}
          <rect x={x + 8} y={y + 15} width="20" height="14" fill="#1E293B" rx="2" />
          <rect x={x + 10} y={y + 12} width="16" height="4" fill="#475569" rx="1" />
          {/* Grill grate lines */}
          <rect x={x + 11} y={y + 17} width="14" height="1" fill="#F87171" />
          <rect x={x + 11} y={y + 20} width="14" height="1" fill="#F87171" />
          <rect x={x + 11} y={y + 23} width="14" height="1" fill="#F87171" />
          {/* Smoke puffs */}
          <circle cx={x + 18} cy={y + 8} r="3" fill="#94A3B8" opacity="0.3" />
          <circle cx={x + 22} cy={y + 5} r="2" fill="#94A3B8" opacity="0.2" />
          {/* Food truck */}
          <rect x={x + 45} y={y + 10} width="40" height="25" fill="#F0FDF4" rx="3" />
          <rect x={x + 45} y={y + 8} width="40" height="6" fill="#FB923C" rx="2" />
          {/* Truck window */}
          <rect x={x + 50} y={y + 18} width="30" height="12" fill="#0C4A6E" rx="1" />
          {/* Counter */}
          <rect x={x + 48} y={y + 30} width="34" height="3" fill="#92400E" />
          {/* Picnic tables */}
          <rect x={x + 15} y={y + 45} width="20" height="8" fill="#92400E" />
          <rect x={x + 13} y={y + 49} width="3" height="8" fill="#78350F" />
          <rect x={x + 33} y={y + 49} width="3" height="8" fill="#78350F" />
          <rect x={x + 55} y={y + 45} width="20" height="8" fill="#92400E" />
          <rect x={x + 53} y={y + 49} width="3" height="8" fill="#78350F" />
          <rect x={x + 73} y={y + 49} width="3" height="8" fill="#78350F" />
        </g>
      );
    case "games":
      return (
        <g>
          {/* Cornhole boards */}
          <rect x={x + 10} y={y + 20} width="16" height="24" fill="#92400E" transform={`rotate(-5, ${x + 18}, ${y + 32})`} />
          <circle cx={x + 18} cy={y + 35} r="3" fill="#0F172A" />
          <rect x={x + 50} y={y + 20} width="16" height="24" fill="#92400E" transform={`rotate(5, ${x + 58}, ${y + 32})`} />
          <circle cx={x + 58} cy={y + 35} r="3" fill="#0F172A" />
          {/* Bean bags scattered */}
          <rect x={x + 30} y={y + 38} width="5" height="5" fill="#F87171" rx="1" />
          <rect x={x + 37} y={y + 40} width="5" height="5" fill="#60A5FA" rx="1" />
          <rect x={x + 33} y={y + 44} width="5" height="5" fill="#FBBF24" rx="1" />
          {/* Ring toss pole */}
          <rect x={x + 75} y={y + 15} width="2" height="20" fill="#475569" />
          <circle cx={x + 76} cy={y + 15} r="4" fill="none" stroke="#F87171" strokeWidth="2" />
          <circle cx={x + 76} cy={y + 20} r="5" fill="none" stroke="#4ADE80" strokeWidth="2" />
        </g>
      );
    case "stage":
      return (
        <g>
          {/* Stage platform */}
          <rect x={x + 10} y={y + 25} width="70" height="30" fill="#1E293B" rx="2" />
          <rect x={x + 8} y={y + 22} width="74" height="6" fill="#334155" rx="2" />
          {/* Stage lights */}
          <rect x={x + 12} y={y + 10} width="2" height="15" fill="#475569" />
          <rect x={x + 76} y={y + 10} width="2" height="15" fill="#475569" />
          <rect x={x + 10} y={y + 8} width="70" height="4" fill="#475569" />
          <circle cx={x + 25} cy={y + 10} r="3" fill="#FBBF24" opacity="0.7" />
          <circle cx={x + 45} cy={y + 10} r="3" fill="#F87171" opacity="0.7" />
          <circle cx={x + 65} cy={y + 10} r="3" fill="#60A5FA" opacity="0.7" />
          {/* Microphone */}
          <rect x={x + 43} y={y + 28} width="2" height="18" fill="#94A3B8" />
          <circle cx={x + 44} cy={y + 27} r="3" fill="#475569" />
          {/* Speakers */}
          <rect x={x + 15} y={y + 30} width="12" height="16" fill="#0F172A" rx="1" />
          <circle cx={x + 21} cy={y + 38} r="4" fill="#334155" />
          <rect x={x + 63} y={y + 30} width="12" height="16" fill="#0F172A" rx="1" />
          <circle cx={x + 69} cy={y + 38} r="4" fill="#334155" />
        </g>
      );
    case "info":
      return (
        <g>
          {/* Info booth desk */}
          <rect x={x + 10} y={y + 20} width="50" height="20" fill="#1E40AF" rx="2" />
          <rect x={x + 10} y={y + 18} width="50" height="5" fill="#2563EB" rx="2" />
          {/* Banner */}
          <rect x={x + 15} y={y + 5} width="40" height="12" fill="#F0FDF4" rx="1" />
          <text x={x + 35} y={y + 14} textAnchor="middle" fill="#1E40AF" fontSize="5" fontFamily="monospace" fontWeight="bold">SHCA</text>
          {/* Brochure rack */}
          <rect x={x + 62} y={y + 18} width="8" height="18" fill="#92400E" />
          <rect x={x + 63} y={y + 19} width="6" height="4" fill="#F87171" />
          <rect x={x + 63} y={y + 24} width="6" height="4" fill="#60A5FA" />
          <rect x={x + 63} y={y + 29} width="6" height="4" fill="#4ADE80" />
        </g>
      );
    case "sponsors":
      return (
        <g>
          {/* Display tables */}
          <rect x={x + 8} y={y + 25} width="25" height="10" fill="#F0FDF4" />
          <rect x={x + 6} y={y + 30} width="3" height="10" fill="#94A3B8" />
          <rect x={x + 31} y={y + 30} width="3" height="10" fill="#94A3B8" />
          <rect x={x + 45} y={y + 25} width="25" height="10" fill="#F0FDF4" />
          <rect x={x + 43} y={y + 30} width="3" height="10" fill="#94A3B8" />
          <rect x={x + 68} y={y + 30} width="3" height="10" fill="#94A3B8" />
          {/* Banner stands */}
          <rect x={x + 12} y={y + 5} width="1.5" height="20" fill="#475569" />
          <rect x={x + 6} y={y + 5} width="14" height="16" fill="#F472B6" rx="1" />
          <text x={x + 13} y={y + 15} textAnchor="middle" fill="#FFFFFF" fontSize="4" fontFamily="monospace">VIP</text>
          <rect x={x + 55} y={y + 5} width="1.5" height="20" fill="#475569" />
          <rect x={x + 49} y={y + 5} width="14" height="16" fill="#FBBF24" rx="1" />
          <rect x={x + 51} y={y + 9} width="10" height="8" fill="#F59E0B" rx="1" />
        </g>
      );
    default:
      return null;
  }
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

  // Animation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setMovingChars((prev) => tickCharacters(prev));
      setFrame((f) => f + 1);
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  // Y-sort characters for depth
  const sortedChars = [...movingChars].sort((a, b) => a.y - b.y);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Zone info panel */}
      {selectedZone && (
        <div className="mb-4 bg-[#0F172A] border-4 border-[#4ADE80] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedZone.icon}</span>
              <div>
                <h3 className="text-[10px] text-[#4ADE80]">{selectedZone.label}</h3>
                <p className="text-[8px] text-[#94A3B8] mt-1">{selectedZone.description}</p>
              </div>
            </div>
            <button onClick={() => setSelectedZone(null)} className="text-[8px] text-[#94A3B8] hover:text-[#F0FDF4] px-2 py-1">[CLOSE]</button>
          </div>
        </div>
      )}

      {/* Isometric tilt wrapper */}
      <div
        className="w-full"
        style={{
          perspective: "900px",
          perspectiveOrigin: "50% 30%",
        }}
      >
        <svg
          viewBox="0 0 560 420"
          className="w-full h-auto pixel-border"
          style={{
            imageRendering: "pixelated",
            transform: "rotateX(25deg)",
            transformOrigin: "50% 50%",
          }}
        >
          {/* ═══ LAYER 1: Sky ═══ */}
          <defs>
            <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#075985" />
              <stop offset="100%" stopColor="#0C4A6E" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="560" height="60" fill="url(#skyGrad)" />

          {/* Clouds (animated drift) */}
          <g>
            <rect x={(40 + frame * 0.03) % 580 - 20} y="12" width="35" height="10" rx="5" fill="#CBD5E1" opacity="0.5" />
            <rect x={(35 + frame * 0.03) % 580 - 20} y="17" width="45" height="12" rx="5" fill="#CBD5E1" opacity="0.5" />
            <rect x={(200 + frame * 0.02) % 600 - 20} y="8" width="28" height="8" rx="4" fill="#CBD5E1" opacity="0.4" />
            <rect x={(195 + frame * 0.02) % 600 - 20} y="12" width="38" height="10" rx="4" fill="#CBD5E1" opacity="0.4" />
            <rect x={(400 + frame * 0.025) % 600 - 20} y="15" width="32" height="9" rx="4" fill="#CBD5E1" opacity="0.35" />
            <rect x={(395 + frame * 0.025) % 600 - 20} y="20" width="42" height="11" rx="4" fill="#CBD5E1" opacity="0.35" />
          </g>

          {/* Sun with glow */}
          <circle cx="500" cy="30" r="22" fill="#FBBF24" opacity="0.15" />
          <circle cx="500" cy="30" r="18" fill="#FBBF24" />
          <circle cx="495" cy="25" r="6" fill="#FDE68A" opacity="0.5" />
          {/* Sun rays */}
          <rect x="476" y="28" width="8" height="4" fill="#FBBF24" />
          <rect x="524" y="28" width="8" height="4" fill="#FBBF24" />
          <rect x="498" y="6" width="4" height="8" fill="#FBBF24" />
          <rect x="498" y="52" width="4" height="8" fill="#FBBF24" />
          <rect x="480" y="12" width="6" height="3" fill="#FBBF24" transform="rotate(45,483,13.5)" />
          <rect x="514" y="12" width="6" height="3" fill="#FBBF24" transform="rotate(-45,517,13.5)" />
          <rect x="480" y="44" width="6" height="3" fill="#FBBF24" transform="rotate(-45,483,45.5)" />
          <rect x="514" y="44" width="6" height="3" fill="#FBBF24" transform="rotate(45,517,45.5)" />

          {/* ═══ LAYER 2: Ground ═══ */}
          <rect x="0" y="55" width="560" height="365" fill="#166534" />

          {/* Grass texture — varied shades */}
          {Array.from({ length: 60 }).map((_, i) => (
            <rect
              key={`grass-${i}`}
              x={7 + (i * 97) % 545}
              y={62 + (i * 61) % 340}
              width={i % 3 === 0 ? 6 : 4}
              height={i % 3 === 0 ? 2 : 4}
              fill={i % 4 === 0 ? "#14532D" : i % 4 === 1 ? "#15803D" : i % 4 === 2 ? "#166534" : "#22863A"}
              opacity={0.4 + (i % 3) * 0.15}
            />
          ))}

          {/* Dirt patches */}
          <ellipse cx="280" cy="270" rx="30" ry="8" fill="#92400E" opacity="0.15" />
          <ellipse cx="130" cy="270" rx="20" ry="6" fill="#92400E" opacity="0.12" />
          <ellipse cx="450" cy="270" rx="15" ry="5" fill="#92400E" opacity="0.1" />

          {/* ═══ LAYER 3: Paths ═══ */}
          <g opacity="0.85">
            {/* Main vertical path: entrance → center */}
            <rect x="274" y="260" width="12" height="55" fill="#D4A574" />
            {/* Path gravel texture */}
            <rect x="276" y="265" width="2" height="2" fill="#C4956A" />
            <rect x="280" y="275" width="2" height="2" fill="#C4956A" />
            <rect x="278" y="285" width="2" height="2" fill="#C4956A" />
            <rect x="282" y="295" width="2" height="2" fill="#C4956A" />

            {/* Horizontal path across middle */}
            <rect x="50" y="155" width="460" height="10" fill="#D4A574" />
            {/* Gravel dots */}
            {Array.from({ length: 25 }).map((_, i) => (
              <rect key={`pg-${i}`} x={55 + i * 18} y={157 + (i % 3) * 2} width="2" height="2" fill="#C4956A" />
            ))}

            {/* Vertical path: top-left */}
            <rect x="108" y="70" width="8" height="90" fill="#D4A574" />
            {/* Vertical path: center */}
            <rect x="274" y="70" width="12" height="90" fill="#D4A574" />
            {/* Vertical path: right */}
            <rect x="458" y="70" width="8" height="90" fill="#D4A574" />

            {/* Path from parking to entrance */}
            <rect x="220" y="290" width="54" height="10" fill="#D4A574" />

            {/* Lower horizontal path */}
            <rect x="50" y="250" width="460" height="8" fill="#D4A574" />
          </g>

          {/* ═══ LAYER 4: Rink outline ═══ */}
          <rect x="40" y="65" width="480" height="195" rx="8" fill="#DBEAFE" stroke="#7C3AED" strokeWidth="6" />
          <line x1="280" y1="65" x2="280" y2="260" stroke="#93C5FD" strokeWidth="2" opacity="0.5" />
          <circle cx="280" cy="160" r="30" fill="none" stroke="#93C5FD" strokeWidth="2" opacity="0.5" />
          <text x="280" y="160" textAnchor="middle" fill="#3B82F6" fontSize="7" fontFamily="monospace" opacity="0.6">ICE RINK</text>
          <text x="280" y="170" textAnchor="middle" fill="#64748B" fontSize="5" fontFamily="monospace" opacity="0.6">489 Sienna Park Dr SW</text>

          {/* ═══ LAYER 5: Zones with fences ═══ */}
          {ZONES.map((zone) => (
            <g key={zone.id}>
              {/* Zone background */}
              <rect
                x={zone.x} y={zone.y} width={zone.width} height={zone.height}
                fill={zone.color}
                opacity={hoveredZone?.id === zone.id ? 0.85 : selectedZone?.id === zone.id ? 0.9 : 0.65}
                rx="4"
                stroke={selectedZone?.id === zone.id ? "#F0FDF4" : "rgba(0,0,0,0.15)"}
                strokeWidth={selectedZone?.id === zone.id ? 3 : 1}
                onClick={() => setSelectedZone(zone)}
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                className="cursor-pointer"
              />
              {/* Zone interior pixel art */}
              <g style={{ pointerEvents: "none" }}>
                <ZoneInterior id={zone.id} x={zone.x} y={zone.y} w={zone.width} h={zone.height} />
              </g>
              {/* Zone label */}
              <text
                x={zone.x + zone.width / 2} y={zone.y + zone.height - 5}
                textAnchor="middle" fill="#0F172A" fontSize="5"
                fontFamily="monospace" fontWeight="bold"
                style={{ pointerEvents: "none" }}
              >
                {zone.label}
              </text>
              {/* Fence around zone */}
              <g style={{ pointerEvents: "none" }}>
                <Fence x={zone.x} y={zone.y} w={zone.width} h={zone.height} />
              </g>
            </g>
          ))}

          {/* ═══ LAYER 6: Environment props ═══ */}
          {/* Benches */}
          <Bench x={155} y={260} />
          <Bench x={320} y={260} />
          <Bench x={440} y={260} />
          <Bench x={90} y={260} />

          {/* Lampposts */}
          <Lamp x={54} y={258} on />
          <Lamp x={270} y={258} on />
          <Lamp x={500} y={258} on />
          <Lamp x={160} y={62} />
          <Lamp x={400} y={62} />

          {/* Trash cans */}
          <TrashCan x={165} y={262} />
          <TrashCan x={338} y={262} />
          <TrashCan x={510} y={262} />

          {/* Flowers */}
          <Flowers x={48} y={270} color="#F87171" />
          <Flowers x={340} y={270} color="#FBBF24" />
          <Flowers x={515} y={270} color="#A78BFA" />
          <Flowers x={48} y={350} color="#F472B6" />
          <Flowers x={200} y={355} color="#60A5FA" />
          <Flowers x={400} y={355} color="#FBBF24" />
          <Flowers x={530} y={300} color="#4ADE80" />

          {/* Flags */}
          <Flag x={48} y={62} color="#4ADE80" frame={frame} />
          <Flag x={260} y={62} color="#FBBF24" frame={frame} />
          <Flag x={510} y={62} color="#F87171" frame={frame} />
          <Flag x={240} y={300} color="#60A5FA" frame={frame + 20} />
          <Flag x={322} y={300} color="#A78BFA" frame={frame + 40} />

          {/* Trees (improved) */}
          <Tree x={525} y={275} size="large" />
          <Tree x={535} y={310} />
          <Tree x={520} y={340} />
          <Tree x={8} y={275} size="large" />
          <Tree x={18} y={320} />
          <Tree x={5} y={355} />

          {/* ═══ LAYER 7: Entry gate ═══ */}
          <rect x="238" y="295" width="84" height="30" fill="#1E293B" rx="4" />
          <text x="280" y="314" textAnchor="middle" fill="#4ADE80" fontSize="7" fontFamily="monospace">ENTRANCE</text>
          {/* Gate arch */}
          <rect x="236" y="290" width="8" height="38" fill="#475569" />
          <rect x="316" y="290" width="8" height="38" fill="#475569" />
          <rect x="236" y="288" width="88" height="5" fill="#64748B" rx="2" />
          {/* Gate lanterns */}
          <circle cx="240" cy="290" r="3" fill="#FBBF24" opacity="0.6" />
          <circle cx="320" cy="290" r="3" fill="#FBBF24" opacity="0.6" />

          {/* ═══ LAYER 8: Parking ═══ */}
          <rect x="40" y="300" width="180" height="45" fill="#334155" rx="4" />
          <text x="130" y="340" textAnchor="middle" fill="#94A3B8" fontSize="6" fontFamily="monospace">PARKING</text>
          {/* Parking lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect key={`pline-${i}`} x={52 + i * 28} y={305} width="1" height="30" fill="#475569" opacity="0.5" />
          ))}
          {/* Cars */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={`car-${i}`}>
              <rect x={55 + i * 28} y={308} width={18} height={10} fill={["#F87171", "#60A5FA", "#FBBF24", "#4ADE80", "#A78BFA"][i]} rx="2" />
              {/* Windshield */}
              <rect x={59 + i * 28} y={309} width={6} height={4} fill="#0C4A6E" opacity="0.5" rx="1" />
              {/* Wheels */}
              <rect x={57 + i * 28} y={318} width={4} height={3} fill="#1E293B" rx="1" />
              <rect x={67 + i * 28} y={318} width={4} height={3} fill="#1E293B" rx="1" />
            </g>
          ))}

          {/* ═══ LAYER 9: Characters (y-sorted) ═══ */}
          {sortedChars.map((mc, i) => (
            <PixelCharacter key={mc.id} char={mc} index={i} />
          ))}

          {/* ═══ LAYER 10: UI overlays ═══ */}
          {movingChars.length > 0 && (
            <g>
              <rect x="340" y="350" width="110" height="20" rx="4" fill="#0F172A" opacity="0.85" />
              <text x="395" y="364" textAnchor="middle" fill="#4ADE80" fontSize="6" fontFamily="monospace">
                {movingChars.length} at the event!
              </text>
            </g>
          )}

          {/* Title banner */}
          <rect x="100" y="380" width="360" height="35" fill="#0F172A" rx="6" />
          <rect x="102" y="382" width="356" height="31" fill="none" stroke="#4ADE80" strokeWidth="1" rx="5" opacity="0.3" />
          <text x="280" y="396" textAnchor="middle" fill="#4ADE80" fontSize="8" fontFamily="monospace">SIGNAL HILL NEIGHBOUR DAY</text>
          <text x="280" y="408" textAnchor="middle" fill="#FBBF24" fontSize="7" fontFamily="monospace">JUNE 21, 2026</text>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredZone && !selectedZone && (
        <div
          className="map-tooltip"
          style={{
            left: `${(hoveredZone.x / 560) * 100}%`,
            top: `${((hoveredZone.y - 30) / 420) * 100}%`,
          }}
        >
          {hoveredZone.icon} {hoveredZone.label}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 justify-center">
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#4ADE80]" />
          RSVP&apos;d
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#60A5FA]" />
          Volunteers
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#F472B6]" />
          Vendors
        </div>
        <div className="flex items-center gap-2 text-[8px]">
          <span className="inline-block w-3 h-3 bg-[#FFD700]" />
          VIPs
        </div>
      </div>
    </div>
  );
}
