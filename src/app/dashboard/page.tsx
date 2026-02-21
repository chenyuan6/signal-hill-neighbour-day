"use client";

import { useEffect, useState } from "react";
import { getRSVPs, getVolunteers, getVendors } from "@/lib/store";
import { TARGETS, RSVP, Volunteer, Vendor } from "@/lib/types";
import Link from "next/link";

function ProgressBar({ label, current, target, color }: {
  label: string; current: number; target: number; color: string;
}) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#6B5A40" }}>
          {label}
        </span>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" }}>
          {current} / {target}
        </span>
      </div>
      <div className="warm-progress">
        <div className="warm-progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#B8A088", textAlign: "right" }}>
        {pct.toFixed(0)}% of goal
      </div>
    </div>
  );
}

function StatCard({ value, label, sublabel, color, href, icon }: {
  value: number; label: string; sublabel: string; color: string; href: string; icon: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className="wood-card" style={{ transition: "transform 0.15s, box-shadow 0.15s" }}>
        <div className="wood-card-inner text-center" style={{ padding: 16 }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>{icon}</div>
          <div style={{
            fontFamily: "Inter, sans-serif", fontSize: 36, fontWeight: 800, color,
            fontVariantNumeric: "tabular-nums", lineHeight: 1.1
          }}>
            {value}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#5A3A20", marginTop: 4, letterSpacing: "0.05em" }}>
            {label}
          </div>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#B8A088", marginTop: 2 }}>
            {sublabel}
          </div>
          <div style={{
            fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color, marginTop: 8,
            opacity: 0, transition: "opacity 0.15s"
          }} className="group-hover:!opacity-100">
            View details →
          </div>
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
  const amVolunteers = volunteers.filter((v) => v.shift === "AM" || v.shift === "Full Day").length;
  const pmVolunteers = volunteers.filter((v) => v.shift === "PM" || v.shift === "Full Day").length;

  return (
    <div className="page-wrap">
      <div style={{ maxWidth: 720, margin: "0 auto" }} className="space-y-6 animate-fade-in">
        <Link href="/" className="back-link">← Back to Map</Link>

        {/* Header */}
        <div className="text-center" style={{ marginBottom: 8 }}>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 24, fontWeight: 800, color: "#FDF5E6" }}>
            📊 Live Dashboard
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#D4B888", marginTop: 4 }}>
            Neighbour Day 2026 — June 20
          </p>
        </div>

        {/* Big stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            value={totalAttending} label="GUESTS"
            sublabel={`${rsvps.length} ${rsvps.length === 1 ? "family" : "families"}`}
            color="#4EAE5C" href="/rsvp" icon="🌻"
          />
          <StatCard
            value={volunteers.length} label="VOLUNTEERS"
            sublabel={`AM: ${amVolunteers} · PM: ${pmVolunteers}`}
            color="#5B8EC9" href="/volunteer" icon="🌾"
          />
          <StatCard
            value={vendors.length} label="VENDORS"
            sublabel={vendors.length > 0 ? `${[...new Set(vendors.map((v) => v.category))].length} categories` : "10 spots open"}
            color="#D86090" href="/vendor" icon="🏕️"
          />
        </div>

        {/* Progress bars */}
        <div className="wood-card">
          <div className="wood-card-inner space-y-5">
            <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 16, fontWeight: 700, color: "#5A3A20" }}>
              Progress to Targets
            </h2>
            <ProgressBar label="Guest Headcount" current={totalAttending} target={TARGETS.rsvps} color="#4EAE5C" />
            <ProgressBar label="Volunteers" current={volunteers.length} target={TARGETS.volunteers} color="#5B8EC9" />
            <ProgressBar label="Vendors" current={vendors.length} target={TARGETS.vendors} color="#D86090" />
          </div>
        </div>

        {/* Two-column lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Volunteer roster */}
          <div className="wood-card">
            <div className="wood-card-inner" style={{ padding: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#5A3A20" }}>
                  Volunteers
                </h2>
                <Link href="/volunteer" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#5B8EC9", textDecoration: "none" }}>
                  Sign up →
                </Link>
              </div>
              {volunteers.length === 0 ? (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#B8A088", textAlign: "center", padding: "16px 0" }}>
                  No volunteers yet. Be the first!
                </p>
              ) : (
                <div className="space-y-1">
                  {volunteers.map((v) => (
                    <div key={v.id} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #E8DCC8" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#5A3A20" }}>{v.name}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#B8A088" }}>{v.role}</span>
                      </div>
                      <span style={{
                        fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
                        background: v.shift === "Full Day" ? "#4EAE5C20" : v.shift === "AM" ? "#D4A83020" : "#9B6FC020",
                        color: v.shift === "Full Day" ? "#3A7828" : v.shift === "AM" ? "#8B6A20" : "#7048A0",
                      }}>
                        {v.shift}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent RSVPs */}
          <div className="wood-card">
            <div className="wood-card-inner" style={{ padding: 16 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#5A3A20" }}>
                  Recent RSVPs
                </h2>
                <Link href="/rsvp" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#4EAE5C", textDecoration: "none" }}>
                  RSVP now →
                </Link>
              </div>
              {rsvps.length === 0 ? (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#B8A088", textAlign: "center", padding: "16px 0" }}>
                  No RSVPs yet. Be the first!
                </p>
              ) : (
                <div className="space-y-1">
                  {rsvps.slice(-8).reverse().map((r) => (
                    <div key={r.id} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #E8DCC8" }}>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#5A3A20" }}>{r.familyName}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#D4A830", fontVariantNumeric: "tabular-nums" }}>
                        {r.headcount} guest{r.headcount > 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vendor list */}
        <div className="wood-card">
          <div className="wood-card-inner" style={{ padding: 16 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#5A3A20" }}>
                Vendors
              </h2>
              <Link href="/vendor" style={{ fontFamily: "Inter, sans-serif", fontSize: 11, fontWeight: 600, color: "#D86090", textDecoration: "none" }}>
                Apply as vendor →
              </Link>
            </div>
            {vendors.length === 0 ? (
              <div className="text-center" style={{ padding: "20px 0" }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🏕️</div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7A60" }}>
                  10 vendor spots available! Food trucks, artisans, entertainment — all welcome.
                </p>
                <Link href="/vendor" className="wood-btn inline-flex" style={{
                  background: "#D86090", color: "#FDF5E6", marginTop: 12, fontSize: 13
                }}>
                  Apply Now
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {vendors.map((v) => (
                  <div key={v.id} className="flex justify-between items-center py-2" style={{ borderBottom: "1px solid #E8DCC8" }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#5A3A20" }}>{v.businessName}</span>
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#B8A088" }}>{v.contactName}</span>
                    </div>
                    <span style={{
                      fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 500, color: "#6B5A40",
                      background: "#F5E6C8", padding: "2px 8px", borderRadius: 12
                    }}>
                      {v.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
