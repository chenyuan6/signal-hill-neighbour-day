"use client";

import { useEffect, useState } from "react";
import { getRSVPs, getVolunteers, getVendors } from "@/lib/store";
import { TARGETS, RSVP, Volunteer, Vendor } from "@/lib/types";
import Link from "next/link";

function ProgressBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs text-[#94A3B8] font-medium" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>{label}</span>
        <span className="text-xs font-semibold" style={{ color, fontFamily: "Inter, system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}>
          {current} / {target}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-[10px] text-[#64748B] text-right" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {pct.toFixed(0)}% of goal
      </div>
    </div>
  );
}

function StatCard({ value, label, sublabel, color, href }: {
  value: number; label: string; sublabel: string; color: string; href: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className="rounded-xl bg-[#0F172A]/80 border border-white/5 p-5 text-center hover:border-white/10 transition-all hover:bg-[#0F172A]">
        <div
          className="text-4xl font-bold tracking-tight"
          style={{ color, fontFamily: "Inter, system-ui, sans-serif", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </div>
        <div className="text-xs font-semibold text-[#E2E8F0] mt-1.5 tracking-wide" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {label}
        </div>
        <div className="text-[10px] text-[#64748B] mt-0.5" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {sublabel}
        </div>
        <div className="text-[10px] mt-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color, fontFamily: "Inter, system-ui, sans-serif" }}>
          View details →
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    async function load() {
      const [r, v, d] = await Promise.all([getRSVPs(), getVolunteers(), getVendors()]);
      setRsvps(r);
      setVolunteers(v);
      setVendors(d);
    }
    load();
  }, []);

  const totalAttending = rsvps.reduce((sum, r) => sum + r.headcount, 0);
  const amVolunteers = volunteers.filter(
    (v) => v.shift === "AM" || v.shift === "Full Day"
  ).length;
  const pmVolunteers = volunteers.filter(
    (v) => v.shift === "PM" || v.shift === "Full Day"
  ).length;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="text-center pt-2">
        <h1 className="text-xl font-bold text-[#F0FDF4] tracking-tight">
          Live Dashboard
        </h1>
        <p className="text-sm text-[#64748B] mt-1">
          Real-time event statistics for Neighbour Day 2026 — June 20
        </p>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          value={totalAttending}
          label="GUESTS"
          sublabel={`${rsvps.length} ${rsvps.length === 1 ? "family" : "families"} RSVP'd`}
          color="#4ADE80"
          href="/rsvp"
        />
        <StatCard
          value={volunteers.length}
          label="VOLUNTEERS"
          sublabel={`AM: ${amVolunteers} · PM: ${pmVolunteers}`}
          color="#60A5FA"
          href="/volunteer"
        />
        <StatCard
          value={vendors.length}
          label="VENDORS"
          sublabel={vendors.length > 0 ? `${[...new Set(vendors.map((v) => v.category))].length} categories` : "10 spots available"}
          color="#F472B6"
          href="/vendor"
        />
      </div>

      {/* Progress bars */}
      <div className="rounded-xl bg-[#0F172A]/80 border border-white/5 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-[#F0FDF4]">Progress to Targets</h2>
        <ProgressBar label="Guest Headcount" current={totalAttending} target={TARGETS.rsvps} color="#4ADE80" />
        <ProgressBar label="Volunteers" current={volunteers.length} target={TARGETS.volunteers} color="#60A5FA" />
        <ProgressBar label="Vendors" current={vendors.length} target={TARGETS.vendors} color="#F472B6" />
      </div>

      {/* Two-column layout for lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Volunteer roster */}
        <div className="rounded-xl bg-[#0F172A]/80 border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#F0FDF4]">Volunteers</h2>
            <Link href="/volunteer" className="text-[10px] text-[#60A5FA] hover:text-[#93C5FD] transition-colors">
              Sign up →
            </Link>
          </div>
          {volunteers.length === 0 ? (
            <p className="text-xs text-[#64748B] py-4 text-center">No volunteers yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {volunteers.map((v) => (
                <div key={v.id} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#E2E8F0]">{v.name}</span>
                    <span className="text-[10px] text-[#64748B]">{v.role}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    v.shift === "Full Day"
                      ? "bg-[#4ADE80]/15 text-[#4ADE80]"
                      : v.shift === "AM"
                        ? "bg-[#FBBF24]/15 text-[#FBBF24]"
                        : "bg-[#A78BFA]/15 text-[#A78BFA]"
                  }`}>
                    {v.shift}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent RSVPs */}
        <div className="rounded-xl bg-[#0F172A]/80 border border-white/5 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#F0FDF4]">Recent RSVPs</h2>
            <Link href="/rsvp" className="text-[10px] text-[#4ADE80] hover:text-[#86EFAC] transition-colors">
              RSVP now →
            </Link>
          </div>
          {rsvps.length === 0 ? (
            <p className="text-xs text-[#64748B] py-4 text-center">No RSVPs yet. Be the first!</p>
          ) : (
            <div className="space-y-2">
              {rsvps.slice(-8).reverse().map((r) => (
                <div key={r.id} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-xs font-medium text-[#E2E8F0]">{r.familyName}</span>
                  <span className="text-xs font-semibold text-[#FBBF24]" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {r.headcount} guest{r.headcount > 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vendor list */}
      <div className="rounded-xl bg-[#0F172A]/80 border border-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[#F0FDF4]">Vendors</h2>
          <Link href="/vendor" className="text-[10px] text-[#F472B6] hover:text-[#F9A8D4] transition-colors">
            Apply as vendor →
          </Link>
        </div>
        {vendors.length === 0 ? (
          <div className="text-center py-6">
            <div className="text-2xl mb-2">🏪</div>
            <p className="text-xs text-[#64748B]">
              10 vendor spots available! Food trucks, artisans, entertainment — all welcome.
            </p>
            <Link
              href="/vendor"
              className="inline-block mt-3 px-4 py-1.5 rounded-lg bg-[#F472B6] text-[#4A0E2B] text-xs font-semibold hover:brightness-110 transition-all"
            >
              Apply Now
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {vendors.map((v) => (
              <div key={v.id} className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[#E2E8F0]">{v.businessName}</span>
                  <span className="text-[10px] text-[#64748B]">{v.contactName}</span>
                </div>
                <span className="text-[10px] text-[#94A3B8] bg-white/5 px-2 py-0.5 rounded-full">
                  {v.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
