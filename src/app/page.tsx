"use client";

import { useEffect, useState } from "react";
import PixelMap from "@/components/PixelMap";
import { getRSVPs, getVolunteers, getVendors } from "@/lib/store";
import { TARGETS } from "@/lib/types";
import Link from "next/link";

function StatPill({ value, target, label, color }: {
  value: number; target: number; label: string; color: string;
}) {
  const pct = Math.min(100, (value / target) * 100);
  return (
    <div className="hud-stat">
      <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <div className="flex flex-col gap-0.5">
        <span className="hud-stat-label">{label}</span>
        <div className="w-14 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [stats, setStats] = useState({ rsvps: 0, volunteers: 0, vendors: 0 });
  const [selectedZone, setSelectedZone] = useState<{
    id: string; label: string; description: string;
  } | null>(null);

  useEffect(() => {
    async function load() {
      const [r, v, d] = await Promise.all([getRSVPs(), getVolunteers(), getVendors()]);
      setStats({
        rsvps: r.reduce((sum, x) => sum + x.headcount, 0),
        volunteers: v.length,
        vendors: d.length,
      });
    }
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1A472A]">
      {/* ═══ TOP TOOLBAR (glassmorphism) ═══ */}
      <div className="hud-bar h-12 border-b flex items-center px-3 gap-2 shrink-0 z-20">
        {/* Logo + Title */}
        <div className="flex items-center gap-2.5 mr-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#4ADE80] to-[#22C55E] flex items-center justify-center shadow-md">
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 800, color: "#052E16" }}>SH</span>
          </div>
          <div className="hidden sm:block">
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#F0FDF4", letterSpacing: "-0.02em" }}>
              Signal Hill Neighbour Day
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#94A3B8", fontWeight: 400 }}>
              June 21, 2026
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-7 bg-white/10 mx-1" />

        {/* Stats */}
        <div className="flex items-center gap-2">
          <StatPill value={stats.rsvps} target={TARGETS.rsvps} label="Guests" color="#4ADE80" />
          <StatPill value={stats.volunteers} target={TARGETS.volunteers} label="Volunteers" color="#60A5FA" />
          <StatPill value={stats.vendors} target={TARGETS.vendors} label="Vendors" color="#F472B6" />
        </div>

        {/* Nav buttons */}
        <div className="flex items-center gap-1.5 ml-auto">
          <Link href="/rsvp" className="hud-nav-btn bg-[#4ADE80] text-[#052E16]">
            RSVP
          </Link>
          <Link href="/volunteer" className="hud-nav-btn bg-[#60A5FA] text-[#0C2D57]">
            Volunteer
          </Link>
          <Link href="/vendor" className="hud-nav-btn bg-[#F472B6] text-[#4A0E2B]">
            Vendor
          </Link>
          <Link href="/dashboard" className="hud-nav-btn bg-white/10 text-[#F0FDF4] hidden sm:inline-flex">
            Stats
          </Link>
          <Link href="/schedule" className="hud-nav-btn bg-white/10 text-[#F0FDF4] hidden sm:inline-flex">
            Schedule
          </Link>
        </div>
      </div>

      {/* ═══ MAP AREA ═══ */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #87CEEB 0%, #B0E0F0 35%, #C8ECD0 55%, #1A5C10 55%, #163F0E 100%)",
        }}
      >
        <PixelMap onZoneSelect={setSelectedZone} />

        {/* Zone info card */}
        {selectedZone && (
          <div className="zone-card absolute top-4 right-4 w-64 p-4 z-30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#4ADE80" }}>
                  {selectedZone.label}
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#94A3B8", marginTop: 4, lineHeight: 1.5 }}>
                  {selectedZone.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="w-6 h-6 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white/90 transition-colors"
                style={{ fontFamily: "Inter, sans-serif", fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM BAR ═══ */}
      <div className="hud-bar h-9 border-t flex items-center px-4 gap-4 shrink-0 z-20">
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#FFE066" }}>
          June 21, 2026
        </span>
        <div className="w-px h-4 bg-white/10" />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#94A3B8" }}>
          489 Sienna Park Dr SW
        </span>
        <div className="w-px h-4 bg-white/10" />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#94A3B8" }}>
          11 AM – 4 PM
        </span>
        <div className="flex-1" />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "#4ADE80" }}>
          Signal Hill Community Association
        </span>
      </div>
    </div>
  );
}
