"use client";

import { useEffect, useState } from "react";
import { getRSVPs, getVolunteers, getVendors } from "@/lib/store";
import { TARGETS, RSVP, Volunteer, Vendor } from "@/lib/types";

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
    <div className="space-y-2">
      <div className="flex justify-between text-[8px]">
        <span className="text-[#94A3B8]">{label}</span>
        <span style={{ color }}>
          {current} / {target}
        </span>
      </div>
      <div className="pixel-progress">
        <div
          className="pixel-progress-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-[7px] text-[#64748B] text-right">
        {pct.toFixed(0)}%
      </div>
    </div>
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
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-sm text-[#4ADE80]">📊 Live Dashboard</h1>
        <p className="text-[8px] text-[#94A3B8] mt-2">
          Real-time event statistics
        </p>
      </div>

      {/* Big stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0F172A] p-6 pixel-border text-center">
          <div className="text-3xl text-[#4ADE80]">{totalAttending}</div>
          <div className="text-[8px] text-[#94A3B8] mt-2">
            PEOPLE ATTENDING
          </div>
          <div className="text-[7px] text-[#64748B] mt-1">
            {rsvps.length} {rsvps.length === 1 ? "family" : "families"}
          </div>
        </div>
        <div className="bg-[#0F172A] p-6 pixel-border text-center">
          <div className="text-3xl text-[#60A5FA]">{volunteers.length}</div>
          <div className="text-[8px] text-[#94A3B8] mt-2">VOLUNTEERS</div>
          <div className="text-[7px] text-[#64748B] mt-1">
            AM: {amVolunteers} &bull; PM: {pmVolunteers}
          </div>
        </div>
        <div className="bg-[#0F172A] p-6 pixel-border text-center">
          <div className="text-3xl text-[#F472B6]">{vendors.length}</div>
          <div className="text-[8px] text-[#94A3B8] mt-2">VENDORS</div>
          <div className="text-[7px] text-[#64748B] mt-1">
            {[...new Set(vendors.map((v) => v.category))].length} categories
          </div>
        </div>
      </div>

      {/* Progress bars */}
      <div className="bg-[#0F172A] p-6 pixel-border space-y-6">
        <h2 className="text-[10px] text-[#F0FDF4]">Progress to Targets</h2>
        <ProgressBar
          label="RSVP Headcount"
          current={totalAttending}
          target={TARGETS.rsvps}
          color="#4ADE80"
        />
        <ProgressBar
          label="Volunteers"
          current={volunteers.length}
          target={TARGETS.volunteers}
          color="#60A5FA"
        />
        <ProgressBar
          label="Vendors"
          current={vendors.length}
          target={TARGETS.vendors}
          color="#F472B6"
        />
      </div>

      {/* Volunteer roles breakdown */}
      {volunteers.length > 0 && (
        <div className="bg-[#0F172A] p-6 pixel-border">
          <h2 className="text-[10px] text-[#F0FDF4] mb-4">
            Volunteer Roster
          </h2>
          <div className="space-y-2">
            {volunteers.map((v) => (
              <div
                key={v.id}
                className="flex justify-between items-center border-b border-[#1E293B] pb-2"
              >
                <div>
                  <span className="text-[9px] text-[#60A5FA]">{v.name}</span>
                  <span className="text-[7px] text-[#64748B] ml-2">
                    {v.role}
                  </span>
                </div>
                <span
                  className={`text-[7px] px-2 py-1 ${
                    v.shift === "Full Day"
                      ? "bg-[#4ADE80] text-[#0F172A]"
                      : v.shift === "AM"
                        ? "bg-[#FBBF24] text-[#0F172A]"
                        : "bg-[#A78BFA] text-[#0F172A]"
                  }`}
                >
                  {v.shift}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendor list */}
      {vendors.length > 0 && (
        <div className="bg-[#0F172A] p-6 pixel-border">
          <h2 className="text-[10px] text-[#F0FDF4] mb-4">
            Registered Vendors
          </h2>
          <div className="space-y-2">
            {vendors.map((v) => (
              <div
                key={v.id}
                className="flex justify-between items-center border-b border-[#1E293B] pb-2"
              >
                <div>
                  <span className="text-[9px] text-[#F472B6]">
                    {v.businessName}
                  </span>
                  <span className="text-[7px] text-[#64748B] ml-2">
                    {v.contactName}
                  </span>
                </div>
                <span className="text-[7px] text-[#94A3B8] bg-[#1E293B] px-2 py-1">
                  {v.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent RSVPs */}
      {rsvps.length > 0 && (
        <div className="bg-[#0F172A] p-6 pixel-border">
          <h2 className="text-[10px] text-[#F0FDF4] mb-4">Recent RSVPs</h2>
          <div className="space-y-2">
            {rsvps
              .slice(-10)
              .reverse()
              .map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center border-b border-[#1E293B] pb-2"
                >
                  <span className="text-[9px] text-[#4ADE80]">
                    {r.familyName}
                  </span>
                  <span className="text-[8px] text-[#FBBF24]">
                    {r.headcount} 🎈
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
