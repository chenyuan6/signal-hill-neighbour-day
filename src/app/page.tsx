"use client";

import { useEffect, useState } from "react";
import PixelMap from "@/components/PixelMap";
import { getRSVPs, getVolunteers, getVendors } from "@/lib/store";
import { TARGETS } from "@/lib/types";
import Link from "next/link";

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
    // Poll stats every 10 seconds
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#1A472A]">
      {/* ═══ TOP TOOLBAR (RCT-style) ═══ */}
      <div className="h-10 bg-[#2A2A2A] border-b-2 border-[#4A4A4A] flex items-center px-2 gap-1 shrink-0 z-20">
        {/* Title */}
        <div className="flex items-center gap-2 mr-3">
          <div className="w-5 h-5 bg-[#4ADE80] rounded-sm flex items-center justify-center text-[6px] font-bold text-[#0F172A]">
            SH
          </div>
          <span className="text-[#4ADE80] text-[9px] font-mono font-bold hidden sm:block">
            SIGNAL HILL NEIGHBOUR DAY
          </span>
          <span className="text-[#4ADE80] text-[9px] font-mono font-bold sm:hidden">
            SHND
          </span>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-[#4A4A4A] mx-1" />

        {/* Stats */}
        <div className="flex items-center gap-2">
          <div className="rct-stat">
            <span className="text-[#4ADE80]">{stats.rsvps}</span>
            <span className="text-[#888] text-[7px]">/{TARGETS.rsvps}</span>
            <span className="text-[#94A3B8] text-[6px] ml-0.5 hidden sm:inline">GUESTS</span>
          </div>
          <div className="rct-stat">
            <span className="text-[#60A5FA]">{stats.volunteers}</span>
            <span className="text-[#888] text-[7px]">/{TARGETS.volunteers}</span>
            <span className="text-[#94A3B8] text-[6px] ml-0.5 hidden sm:inline">VOLS</span>
          </div>
          <div className="rct-stat">
            <span className="text-[#F472B6]">{stats.vendors}</span>
            <span className="text-[#888] text-[7px]">/{TARGETS.vendors}</span>
            <span className="text-[#94A3B8] text-[6px] ml-0.5 hidden sm:inline">VENDORS</span>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-[#4A4A4A] mx-1" />

        {/* Nav buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <Link href="/rsvp" className="rct-nav-btn bg-[#4ADE80] text-[#0F172A]">
            RSVP
          </Link>
          <Link href="/volunteer" className="rct-nav-btn bg-[#60A5FA] text-[#0F172A]">
            VOLUNTEER
          </Link>
          <Link href="/vendor" className="rct-nav-btn bg-[#F472B6] text-[#0F172A]">
            VENDOR
          </Link>
          <Link href="/dashboard" className="rct-nav-btn bg-[#FFE066] text-[#0F172A]">
            STATS
          </Link>
          <Link href="/schedule" className="rct-nav-btn bg-[#94A3B8] text-[#0F172A]">
            SCHEDULE
          </Link>
        </div>
      </div>

      {/* ═══ MAP AREA (fills remaining space) ═══ */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          background: "linear-gradient(180deg, #7EC8E3 0%, #B5E3F5 28%, #D4F0D4 40%, #1A5C10 40%, #163F0E 100%)",
        }}
      >
        <PixelMap onZoneSelect={setSelectedZone} />

        {/* Zone info popup */}
        {selectedZone && (
          <div className="absolute top-3 right-3 w-56 bg-[#0F172A] border-2 border-[#4ADE80] p-3 z-30">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-[10px] text-[#4ADE80] font-mono font-bold">
                  {selectedZone.label}
                </h3>
                <p className="text-[8px] text-[#94A3B8] mt-1 font-mono">
                  {selectedZone.description}
                </p>
              </div>
              <button
                onClick={() => setSelectedZone(null)}
                className="text-[8px] text-[#94A3B8] hover:text-[#F0FDF4] font-mono ml-2"
              >
                [X]
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM INFO BAR ═══ */}
      <div className="h-8 bg-[#2A2A2A] border-t-2 border-[#4A4A4A] flex items-center px-3 gap-3 shrink-0 z-20">
        <span className="text-[#FFE066] text-[7px] font-mono">
          JUNE 21, 2026
        </span>
        <div className="w-px h-4 bg-[#4A4A4A]" />
        <span className="text-[#94A3B8] text-[7px] font-mono">
          489 Sienna Park Dr SW
        </span>
        <div className="w-px h-4 bg-[#4A4A4A]" />
        <span className="text-[#94A3B8] text-[7px] font-mono">
          11AM - 4PM
        </span>
        <div className="flex-1" />
        <span className="text-[#4ADE80] text-[7px] font-mono">
          Signal Hill Community Association
        </span>
      </div>
    </div>
  );
}
