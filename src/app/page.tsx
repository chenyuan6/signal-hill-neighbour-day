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
    <div className="hud-stat" style={{ padding: undefined }}>
      <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <div className="flex flex-col gap-0.5">
        <span className="hud-stat-label hidden sm:block">{label}</span>
        <div className="w-10 sm:w-14 h-1 rounded-full overflow-hidden" style={{ background: "rgba(196, 152, 92, 0.15)" }}>
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
    id: string; label: string; description: string; available?: boolean;
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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#2A5A1A" }}>
      {/* ═══ TOP TOOLBAR (warm wooden) ═══ */}
      <div className="hud-bar border-b shrink-0 z-20">
        {/* Desktop: single row */}
        <div className="hidden sm:flex h-12 items-center px-3 gap-2">
          {/* Logo + Title */}
          <div className="flex items-center gap-2.5 mr-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-md"
              style={{ background: "linear-gradient(135deg, #4EAE5C, #3A8828)" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 800, color: "#FDF5E6" }}>SH</span>
            </div>
            <div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color: "#FDF5E6", letterSpacing: "-0.02em" }}>
                Signal Hill Neighbour Day
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#D4B888", fontWeight: 500 }}>
                June 20, 2026
              </div>
            </div>
          </div>

          <div className="w-px h-7 mx-1" style={{ background: "rgba(196, 152, 92, 0.2)" }} />

          {/* Stats */}
          <div className="flex items-center gap-2">
            <StatPill value={stats.rsvps} target={TARGETS.rsvps} label="Guests" color="#4EAE5C" />
            <StatPill value={stats.volunteers} target={TARGETS.volunteers} label="Helpers" color="#5B8EC9" />
            <StatPill value={stats.vendors} target={TARGETS.vendors} label="Vendors" color="#D86090" />
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Link href="/rsvp" className="hud-nav-btn" style={{ background: "#4EAE5C", color: "#0A2A08" }}>
              RSVP
            </Link>
            <Link href="/volunteer" className="hud-nav-btn" style={{ background: "#5B8EC9", color: "#0A1A30" }}>
              Volunteer
            </Link>
            <Link href="/vendor" className="hud-nav-btn" style={{ background: "#D86090", color: "#3A0A1A" }}>
              Vendor
            </Link>
            <Link href="/dashboard" className="hud-nav-btn" style={{ background: "rgba(253, 245, 230, 0.1)", color: "#FDF5E6" }}>
              Stats
            </Link>
            <Link href="/schedule" className="hud-nav-btn" style={{ background: "rgba(253, 245, 230, 0.1)", color: "#FDF5E6" }}>
              Schedule
            </Link>
          </div>
        </div>

        {/* Mobile: two compact rows */}
        <div className="sm:hidden">
          {/* Row 1: logo + mini stats */}
          <div className="flex items-center h-10 px-2.5 gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center shadow-sm"
              style={{ background: "linear-gradient(135deg, #4EAE5C, #3A8828)" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 8, fontWeight: 800, color: "#FDF5E6" }}>SH</span>
            </div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, color: "#FDF5E6", letterSpacing: "-0.02em" }}>
              Neighbour Day
            </div>
            <div className="flex items-center gap-1.5 ml-auto">
              <StatPill value={stats.rsvps} target={TARGETS.rsvps} label="Guests" color="#4EAE5C" />
              <StatPill value={stats.volunteers} target={TARGETS.volunteers} label="Helpers" color="#5B8EC9" />
              <StatPill value={stats.vendors} target={TARGETS.vendors} label="Vendors" color="#D86090" />
            </div>
          </div>
          {/* Row 2: nav buttons */}
          <div className="flex items-center h-9 px-2.5 gap-1.5 border-t" style={{ borderColor: "rgba(196, 152, 92, 0.15)" }}>
            <Link href="/rsvp" className="hud-nav-btn" style={{ background: "#4EAE5C", color: "#0A2A08", padding: "3px 10px", fontSize: 10 }}>
              RSVP
            </Link>
            <Link href="/volunteer" className="hud-nav-btn" style={{ background: "#5B8EC9", color: "#0A1A30", padding: "3px 10px", fontSize: 10 }}>
              Volunteer
            </Link>
            <Link href="/vendor" className="hud-nav-btn" style={{ background: "#D86090", color: "#3A0A1A", padding: "3px 10px", fontSize: 10 }}>
              Vendor
            </Link>
            <div className="flex-1" />
            <Link href="/dashboard" className="hud-nav-btn" style={{ background: "rgba(253, 245, 230, 0.1)", color: "#FDF5E6", padding: "3px 10px", fontSize: 10 }}>
              📊
            </Link>
            <Link href="/schedule" className="hud-nav-btn" style={{ background: "rgba(253, 245, 230, 0.1)", color: "#FDF5E6", padding: "3px 10px", fontSize: 10 }}>
              📅
            </Link>
          </div>
        </div>
      </div>

      {/* ═══ MAP AREA ═══ */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #6BB3D9 0%, #90CCE8 30%, #B8E0C8 50%, #3A8828 55%, #2A6A1A 100%)",
        }}
      >
        <PixelMap onZoneSelect={setSelectedZone} stats={stats} />

        {/* Zone info card */}
        {selectedZone && (
          <div className="zone-card absolute top-4 right-4 w-64 p-4 z-30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: selectedZone.available ? "#D4B888" : "#4EAE5C" }}>
                  {selectedZone.available ? "Available Vendor Spot" : selectedZone.label}
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#D4B888", marginTop: 4, lineHeight: 1.5 }}>
                  {selectedZone.description}
                </p>
                {selectedZone.available && (
                  <Link
                    href="/vendor"
                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-md transition-all hover:brightness-110"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 700, background: "#4EAE5C", color: "#FDF5E6" }}
                  >
                    Apply as Vendor
                  </Link>
                )}
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                style={{ fontFamily: "Inter, sans-serif", fontSize: 12, background: "rgba(253, 245, 230, 0.1)", color: "rgba(253, 245, 230, 0.6)" }}
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM BAR ═══ */}
      <div className="hud-bar h-8 sm:h-9 border-t flex items-center px-3 sm:px-4 gap-2 sm:gap-4 shrink-0 z-20">
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, color: "#D4A830" }}>
          June 20, 2026
        </span>
        <div className="w-px h-4" style={{ background: "rgba(196, 152, 92, 0.2)" }} />
        <span className="hidden sm:inline" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#D4B888" }}>
          489 Sienna Park Dr SW
        </span>
        <span className="sm:hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#D4B888" }}>
          Sienna Park Dr
        </span>
        <div className="w-px h-4" style={{ background: "rgba(196, 152, 92, 0.2)" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: "#D4B888" }}>
          11 AM – 4 PM
        </span>
        <div className="flex-1" />
        <span className="hidden sm:inline" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 500, color: "#4EAE5C" }}>
          Signal Hill Community Association
        </span>
        <span className="sm:hidden" style={{ fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 500, color: "#4EAE5C" }}>
          SHCA
        </span>
      </div>
    </div>
  );
}
