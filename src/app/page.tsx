"use client";

import { useEffect, useState } from "react";
import PixelMap from "@/components/PixelMap";
import { getRSVPs, getVolunteers, getVendors } from "@/lib/store";
import { TARGETS } from "@/lib/types";
import Link from "next/link";

export default function Home() {
  const [stats, setStats] = useState({ rsvps: 0, volunteers: 0, vendors: 0 });

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
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-sm sm:text-base text-[#4ADE80]">
          Signal Hill Neighbour Day
        </h1>
        <p className="text-[8px] text-[#FBBF24]">
          June 21, 2026 &bull; 489 Sienna Park Dr SW &bull; 11AM - 4PM
        </p>
      </div>

      {/* Quick stats bar */}
      <div className="flex flex-wrap justify-center gap-4">
        <div className="bg-[#0F172A] px-4 py-2 pixel-border-light text-center">
          <div className="text-sm text-[#4ADE80]">{stats.rsvps}</div>
          <div className="text-[7px] text-[#94A3B8]">
            ATTENDING / {TARGETS.rsvps}
          </div>
        </div>
        <div className="bg-[#0F172A] px-4 py-2 pixel-border-light text-center">
          <div className="text-sm text-[#60A5FA]">{stats.volunteers}</div>
          <div className="text-[7px] text-[#94A3B8]">
            VOLUNTEERS / {TARGETS.volunteers}
          </div>
        </div>
        <div className="bg-[#0F172A] px-4 py-2 pixel-border-light text-center">
          <div className="text-sm text-[#F472B6]">{stats.vendors}</div>
          <div className="text-[7px] text-[#94A3B8]">
            VENDORS / {TARGETS.vendors}
          </div>
        </div>
      </div>

      {/* Map */}
      <PixelMap />

      {/* CTA buttons */}
      <div className="flex flex-wrap justify-center gap-3 pt-4">
        <Link
          href="/rsvp"
          className="pixel-btn bg-[#4ADE80] text-[#0F172A]"
        >
          🎟️ RSVP Now
        </Link>
        <Link
          href="/volunteer"
          className="pixel-btn bg-[#60A5FA] text-[#0F172A]"
        >
          🙋 Volunteer
        </Link>
        <Link
          href="/vendor"
          className="pixel-btn bg-[#F472B6] text-[#0F172A]"
        >
          🏪 Apply as Vendor
        </Link>
      </div>
    </div>
  );
}
