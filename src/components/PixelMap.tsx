"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapZone, PixelCharacterData } from "@/lib/types";
import { getCharacters } from "@/lib/store";
import {
  MovingCharacter,
  initMovingCharacter,
  spawnAtEntrance,
  tickCharacters,
} from "@/lib/movement";
import PixelCharacter from "./PixelCharacter";

const ZONES: MapZone[] = [
  {
    id: "bouncy",
    label: "Bouncy Castles",
    icon: "🏰",
    x: 60,
    y: 80,
    width: 100,
    height: 70,
    color: "#F87171",
    description: "Inflatable fun for kids of all ages!",
  },
  {
    id: "facepainting",
    label: "Face Painting",
    icon: "🎨",
    x: 180,
    y: 80,
    width: 80,
    height: 60,
    color: "#A78BFA",
    description: "Get your face painted by local artists",
  },
  {
    id: "petting",
    label: "Petting Zoo",
    icon: "🐑",
    x: 60,
    y: 170,
    width: 90,
    height: 70,
    color: "#FBBF24",
    description: "Meet friendly farm animals",
  },
  {
    id: "food",
    label: "Food Vendors",
    icon: "🍔",
    x: 170,
    y: 160,
    width: 110,
    height: 80,
    color: "#FB923C",
    description: "Local food trucks and BBQ",
  },
  {
    id: "games",
    label: "Yard Games",
    icon: "🎯",
    x: 300,
    y: 80,
    width: 90,
    height: 70,
    color: "#4ADE80",
    description: "Cornhole, ladder toss, and more",
  },
  {
    id: "stage",
    label: "Music Stage",
    icon: "🎵",
    x: 300,
    y: 170,
    width: 100,
    height: 70,
    color: "#22D3EE",
    description: "Live music all day long",
  },
  {
    id: "info",
    label: "SHCA Info",
    icon: "ℹ️",
    x: 420,
    y: 80,
    width: 80,
    height: 60,
    color: "#60A5FA",
    description: "Community info & membership signup",
  },
  {
    id: "sponsors",
    label: "Sponsors",
    icon: "⭐",
    x: 420,
    y: 160,
    width: 80,
    height: 70,
    color: "#F472B6",
    description: "Meet our amazing community sponsors",
  },
];

/** Tick rate: ~30 fps */
const TICK_MS = 33;

/** How often to poll Supabase for new signups (ms) */
const POLL_MS = 8000;

export default function PixelMap() {
  const [movingChars, setMovingChars] = useState<MovingCharacter[]>([]);
  const [hoveredZone, setHoveredZone] = useState<MapZone | null>(null);
  const [selectedZone, setSelectedZone] = useState<MapZone | null>(null);

  // Keep track of known IDs so we can detect new signups
  const knownIds = useRef<Set<string>>(new Set());

  // Load initial characters → initialize movement state
  const loadCharacters = useCallback(async (isInitial: boolean) => {
    const rawChars = await getCharacters();

    if (isInitial) {
      // First load: place them all at their generated positions and start wandering
      const moving = rawChars.map((c) => initMovingCharacter(c));
      knownIds.current = new Set(rawChars.map((c) => c.id));
      setMovingChars(moving);
    } else {
      // Subsequent loads: find new characters and spawn them at the entrance
      const newChars = rawChars.filter((c) => !knownIds.current.has(c.id));
      if (newChars.length > 0) {
        const spawned = newChars.map((c) => spawnAtEntrance(c));
        newChars.forEach((c) => knownIds.current.add(c.id));
        setMovingChars((prev) => [...prev, ...spawned]);
      }
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCharacters(true);
  }, [loadCharacters]);

  // Poll for new signups
  useEffect(() => {
    const interval = setInterval(() => loadCharacters(false), POLL_MS);
    return () => clearInterval(interval);
  }, [loadCharacters]);

  // Animation tick loop
  useEffect(() => {
    const interval = setInterval(() => {
      setMovingChars((prev) => tickCharacters(prev));
    }, TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      {/* Zone info panel */}
      {selectedZone && (
        <div className="mb-4 bg-[#0F172A] border-4 border-[#4ADE80] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedZone.icon}</span>
              <div>
                <h3 className="text-[10px] text-[#4ADE80]">
                  {selectedZone.label}
                </h3>
                <p className="text-[8px] text-[#94A3B8] mt-1">
                  {selectedZone.description}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-[8px] text-[#94A3B8] hover:text-[#F0FDF4] px-2 py-1"
            >
              [CLOSE]
            </button>
          </div>
        </div>
      )}

      <svg
        viewBox="0 0 560 420"
        className="w-full h-auto pixel-border bg-[#166534]"
        style={{ imageRendering: "pixelated" }}
      >
        {/* Sky background */}
        <rect x="0" y="0" width="560" height="60" fill="#0C4A6E" />
        {/* Clouds */}
        <rect x="40" y="15" width="30" height="10" rx="2" fill="#CBD5E1" opacity="0.6" />
        <rect x="35" y="20" width="40" height="12" rx="2" fill="#CBD5E1" opacity="0.6" />
        <rect x="200" y="10" width="25" height="8" rx="2" fill="#CBD5E1" opacity="0.5" />
        <rect x="195" y="14" width="35" height="10" rx="2" fill="#CBD5E1" opacity="0.5" />
        <rect x="400" y="18" width="28" height="8" rx="2" fill="#CBD5E1" opacity="0.4" />
        <rect x="395" y="22" width="38" height="10" rx="2" fill="#CBD5E1" opacity="0.4" />

        {/* Sun */}
        <circle cx="500" cy="30" r="18" fill="#FBBF24" />
        <rect x="476" y="28" width="8" height="4" fill="#FBBF24" />
        <rect x="524" y="28" width="8" height="4" fill="#FBBF24" />
        <rect x="498" y="6" width="4" height="8" fill="#FBBF24" />
        <rect x="498" y="52" width="4" height="8" fill="#FBBF24" />

        {/* Ground / Grass */}
        <rect x="0" y="55" width="560" height="365" fill="#166534" />
        {/* Grass texture dots */}
        {Array.from({ length: 40 }).map((_, i) => (
          <rect
            key={`grass-${i}`}
            x={14 + (i * 137) % 540}
            y={65 + (i * 73) % 280}
            width="4"
            height="4"
            fill="#15803D"
            opacity="0.6"
          />
        ))}

        {/* Rink outline (the main ice surface) */}
        <rect
          x="40"
          y="65"
          width="480"
          height="190"
          rx="8"
          fill="#DBEAFE"
          stroke="#7C3AED"
          strokeWidth="6"
        />
        {/* Rink ice lines */}
        <line x1="280" y1="65" x2="280" y2="255" stroke="#93C5FD" strokeWidth="2" />
        <circle cx="280" cy="160" r="30" fill="none" stroke="#93C5FD" strokeWidth="2" />

        {/* Rink label */}
        <text
          x="280"
          y="160"
          textAnchor="middle"
          fill="#3B82F6"
          fontSize="8"
          fontFamily="monospace"
        >
          ICE RINK
        </text>
        <text
          x="280"
          y="172"
          textAnchor="middle"
          fill="#64748B"
          fontSize="6"
          fontFamily="monospace"
        >
          489 Sienna Park Dr SW
        </text>

        {/* Clickable zones */}
        {ZONES.map((zone) => (
          <g
            key={zone.id}
            onClick={() => setSelectedZone(zone)}
            onMouseEnter={() => setHoveredZone(zone)}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer"
          >
            {/* Zone background */}
            <rect
              x={zone.x}
              y={zone.y}
              width={zone.width}
              height={zone.height}
              fill={zone.color}
              opacity={
                hoveredZone?.id === zone.id
                  ? 0.9
                  : selectedZone?.id === zone.id
                    ? 0.95
                    : 0.7
              }
              rx="4"
              stroke={
                selectedZone?.id === zone.id ? "#F0FDF4" : "transparent"
              }
              strokeWidth="3"
            />
            {/* Zone icon */}
            <text
              x={zone.x + zone.width / 2}
              y={zone.y + zone.height / 2 - 6}
              textAnchor="middle"
              fontSize="16"
            >
              {zone.icon}
            </text>
            {/* Zone label */}
            <text
              x={zone.x + zone.width / 2}
              y={zone.y + zone.height / 2 + 10}
              textAnchor="middle"
              fill="#0F172A"
              fontSize="6"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {zone.label}
            </text>
          </g>
        ))}

        {/* Entry gate */}
        <rect x="240" y="270" width="80" height="30" fill="#1E293B" rx="4" />
        <text
          x="280"
          y="290"
          textAnchor="middle"
          fill="#4ADE80"
          fontSize="7"
          fontFamily="monospace"
        >
          ENTRANCE
        </text>
        {/* Gate pillars */}
        <rect x="238" y="268" width="8" height="34" fill="#475569" />
        <rect x="314" y="268" width="8" height="34" fill="#475569" />

        {/* Parking area */}
        <rect x="40" y="280" width="180" height="40" fill="#334155" rx="4" />
        <text
          x="130"
          y="305"
          textAnchor="middle"
          fill="#94A3B8"
          fontSize="7"
          fontFamily="monospace"
        >
          PARKING
        </text>
        {/* Car pixels */}
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={`car-${i}`}>
            <rect
              x={55 + i * 32}
              y={288}
              width={20}
              height={10}
              fill={["#F87171", "#60A5FA", "#FBBF24", "#4ADE80", "#A78BFA"][i]}
              rx="2"
            />
            <rect x={58 + i * 32} y={298} width={4} height={3} fill="#1E293B" rx="1" />
            <rect x={68 + i * 32} y={298} width={4} height={3} fill="#1E293B" rx="1" />
          </g>
        ))}

        {/* Path from parking to entrance */}
        <rect x="270" y="300" width="20" height="20" fill="#D4A574" opacity="0.6" />

        {/* Trees */}
        {[520, 530, 540].map((tx, i) => (
          <g key={`tree-${i}`}>
            <rect x={tx} y={280 + i * 20} width="6" height="12" fill="#92400E" />
            <circle cx={tx + 3} cy={275 + i * 20} r="10" fill="#15803D" />
            <circle cx={tx + 3} cy={270 + i * 20} r="7" fill="#166534" />
          </g>
        ))}

        {/* Animated characters */}
        {movingChars.map((mc, i) => (
          <PixelCharacter key={mc.id} char={mc} index={i} />
        ))}

        {/* Character count badge */}
        {movingChars.length > 0 && (
          <g>
            <rect x="340" y="330" width="100" height="18" rx="3" fill="#0F172A" opacity="0.8" />
            <text
              x="390"
              y="343"
              textAnchor="middle"
              fill="#4ADE80"
              fontSize="6"
              fontFamily="monospace"
            >
              {movingChars.length} at the event!
            </text>
          </g>
        )}

        {/* Title banner */}
        <rect x="120" y="370" width="320" height="35" fill="#0F172A" rx="4" />
        <text
          x="280"
          y="385"
          textAnchor="middle"
          fill="#4ADE80"
          fontSize="8"
          fontFamily="monospace"
        >
          SIGNAL HILL NEIGHBOUR DAY
        </text>
        <text
          x="280"
          y="397"
          textAnchor="middle"
          fill="#FBBF24"
          fontSize="7"
          fontFamily="monospace"
        >
          JUNE 21, 2026
        </text>
      </svg>

      {/* Tooltip */}
      {hoveredZone && !selectedZone && (
        <div
          className="map-tooltip"
          style={{
            left: `${(hoveredZone.x / 560) * 100}%`,
            top: `${((hoveredZone.y - 20) / 420) * 100}%`,
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
