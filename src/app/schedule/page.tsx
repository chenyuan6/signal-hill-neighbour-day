"use client";

import { useEffect, useState } from "react";
import { getVolunteers } from "@/lib/store";
import { Volunteer, VOLUNTEER_ROLES } from "@/lib/types";
import Link from "next/link";

const SCHEDULE = [
  { time: "9:00 AM", event: "Volunteer Check-in & Setup", icon: "📋", category: "setup" },
  { time: "10:30 AM", event: "Final Setup & Sound Check", icon: "🔊", category: "setup" },
  { time: "11:00 AM", event: "Gates Open! Welcome Ceremony", icon: "🎉", category: "main" },
  { time: "11:15 AM", event: "Bouncy Castles & Kids Zone Open", icon: "🏰", category: "activity" },
  { time: "11:30 AM", event: "Face Painting Begins", icon: "🎨", category: "activity" },
  { time: "11:30 AM", event: "Petting Zoo Opens", icon: "🐑", category: "activity" },
  { time: "12:00 PM", event: "Food Vendors Open & BBQ Lunch", icon: "🍔", category: "food" },
  { time: "12:30 PM", event: "Yard Games Tournament", icon: "🎯", category: "activity" },
  { time: "1:00 PM", event: "Live Music Set 1", icon: "🎵", category: "main" },
  { time: "1:30 PM", event: "VIP Remarks — Councillor & MLA", icon: "👑", category: "main" },
  { time: "2:00 PM", event: "Live Music Set 2", icon: "🎸", category: "main" },
  { time: "2:30 PM", event: "Community Raffle Draw", icon: "🎟️", category: "main" },
  { time: "3:00 PM", event: "Final Activities & Wind Down", icon: "🌅", category: "main" },
  { time: "3:30 PM", event: "Cleanup Begins", icon: "🧹", category: "setup" },
  { time: "4:00 PM", event: "Event Ends — Thank You!", icon: "💚", category: "main" },
];

const categoryColors: Record<string, string> = {
  setup: "#B8A088",
  main: "#4EAE5C",
  activity: "#5B8EC9",
  food: "#D4A830",
};

export default function SchedulePage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activeTab, setActiveTab] = useState<"schedule" | "roster">("schedule");

  useEffect(() => {
    getVolunteers().then(setVolunteers);
  }, []);

  const roleGroups = VOLUNTEER_ROLES.reduce((acc, role) => {
    acc[role] = volunteers.filter((v) => v.role === role);
    return acc;
  }, {} as Record<string, Volunteer[]>);

  return (
    <div className="page-wrap">
      <div style={{ maxWidth: 560, margin: "0 auto" }} className="space-y-6 animate-fade-in">
        <Link href="/" className="back-link">← Back to Map</Link>

        {/* Header */}
        <div className="text-center">
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 800, color: "#FDF5E6" }}>
            📅 Event Day
          </h1>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#D4B888", marginTop: 4 }}>
            June 20, 2026 · 489 Sienna Park Dr SW
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setActiveTab("schedule")}
            className="wood-btn"
            style={{
              background: activeTab === "schedule" ? "#D4A830" : "#E8DCC8",
              color: activeTab === "schedule" ? "#FDF5E6" : "#6B5A40",
              fontSize: 13, padding: "10px 20px",
            }}
          >
            📅 Schedule
          </button>
          <button
            onClick={() => setActiveTab("roster")}
            className="wood-btn"
            style={{
              background: activeTab === "roster" ? "#5B8EC9" : "#E8DCC8",
              color: activeTab === "roster" ? "#FDF5E6" : "#6B5A40",
              fontSize: 13, padding: "10px 20px",
            }}
          >
            👥 Team Roster
          </button>
        </div>

        {activeTab === "schedule" ? (
          <div className="wood-card">
            <div className="wood-card-inner" style={{ padding: "16px 20px" }}>
              <div className="space-y-0">
                {SCHEDULE.map((item, i) => {
                  const dotColor = categoryColors[item.category] || "#B8A088";
                  return (
                    <div key={i} className="flex items-start gap-4 py-3" style={{ borderBottom: i < SCHEDULE.length - 1 ? "1px solid #E8DCC8" : "none" }}>
                      {/* Time */}
                      <div style={{
                        fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 700, color: "#D4A830",
                        width: 64, flexShrink: 0, textAlign: "right", paddingTop: 2,
                        fontVariantNumeric: "tabular-nums"
                      }}>
                        {item.time}
                      </div>
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center" style={{ paddingTop: 4 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: "50%", background: dotColor,
                          boxShadow: `0 0 0 2px #FDF5E6, 0 0 0 3px ${dotColor}40`,
                        }} />
                        {i < SCHEDULE.length - 1 && (
                          <div style={{ width: 2, flex: 1, minHeight: 20, background: "#E8DCC8", marginTop: 4 }} />
                        )}
                      </div>
                      {/* Event info */}
                      <div className="flex items-center gap-2 flex-1" style={{ paddingTop: 1 }}>
                        <span style={{ fontSize: 16 }}>{item.icon}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#5A3A20", lineHeight: 1.4 }}>
                          {item.event}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {VOLUNTEER_ROLES.map((role) => {
              const members = roleGroups[role];
              if (!members || members.length === 0) return null;
              return (
                <div key={role} className="wood-card">
                  <div className="wood-card-inner" style={{ padding: 16 }}>
                    <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 700, color: "#5B8EC9", marginBottom: 10 }}>
                      {role} ({members.length})
                    </h3>
                    <div className="space-y-1">
                      {members.map((v) => (
                        <div key={v.id} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #E8DCC8" }}>
                          <div className="flex items-center gap-2">
                            {/* Mini character */}
                            <svg width="14" height="18" viewBox="0 0 14 20">
                              <ellipse cx="7" cy="5" rx="4" ry="4.5" fill="#FFE0BD" />
                              <circle cx="5.5" cy="4" r="0.8" fill="#2A1A08" />
                              <circle cx="8.5" cy="4" r="0.8" fill="#2A1A08" />
                              <rect x="3" y="9" width="8" height="7" rx="1.5" fill="#5B8EC9" />
                              <rect x="4" y="16" width="2.5" height="3.5" rx="1" fill="#5A4A3A" />
                              <rect x="7.5" y="16" width="2.5" height="3.5" rx="1" fill="#5A4A3A" />
                            </svg>
                            <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 600, color: "#5A3A20" }}>
                              {v.name}
                            </span>
                          </div>
                          <span style={{
                            fontFamily: "Inter, sans-serif", fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 12,
                            background: v.shift === "Full Day" ? "#4EAE5C" : v.shift === "AM" ? "#D4A830" : "#9B6FC0",
                            color: "#FDF5E6",
                          }}>
                            {v.shift}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}

            {volunteers.length === 0 && (
              <div className="wood-card">
                <div className="wood-card-inner text-center" style={{ padding: "32px 20px" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🌾</div>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B5A40" }}>
                    No volunteers yet!
                  </p>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#B8A088", marginTop: 4 }}>
                    Be the first to sign up
                  </p>
                  <Link href="/volunteer" className="wood-btn inline-flex" style={{
                    background: "#5B8EC9", color: "#FDF5E6", marginTop: 16, fontSize: 13
                  }}>
                    🌾 Volunteer Now
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
