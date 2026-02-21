"use client";

import { useEffect, useState } from "react";
import { getVolunteers } from "@/lib/store";
import { Volunteer, VOLUNTEER_ROLES } from "@/lib/types";

const SCHEDULE = [
  { time: "9:00 AM", event: "Volunteer Check-in & Setup", icon: "📋" },
  { time: "10:30 AM", event: "Final Setup & Sound Check", icon: "🔊" },
  { time: "11:00 AM", event: "Gates Open! Welcome Ceremony", icon: "🎉" },
  { time: "11:15 AM", event: "Bouncy Castles & Kids Zone Open", icon: "🏰" },
  { time: "11:30 AM", event: "Face Painting Begins", icon: "🎨" },
  { time: "11:30 AM", event: "Petting Zoo Opens", icon: "🐑" },
  { time: "12:00 PM", event: "Food Vendors Open & BBQ Lunch", icon: "🍔" },
  { time: "12:30 PM", event: "Yard Games Tournament", icon: "🎯" },
  { time: "1:00 PM", event: "Live Music Set 1", icon: "🎵" },
  { time: "1:30 PM", event: "VIP Remarks - Councillor & MLA", icon: "👑" },
  { time: "2:00 PM", event: "Live Music Set 2", icon: "🎸" },
  { time: "2:30 PM", event: "Community Raffle Draw", icon: "🎟️" },
  { time: "3:00 PM", event: "Final Activities & Wind Down", icon: "🌅" },
  { time: "3:30 PM", event: "Cleanup Begins", icon: "🧹" },
  { time: "4:00 PM", event: "Event Ends - Thank You!", icon: "💚" },
];

export default function SchedulePage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [activeTab, setActiveTab] = useState<"schedule" | "roster">(
    "schedule"
  );

  useEffect(() => {
    getVolunteers().then(setVolunteers);
  }, []);

  const roleGroups = VOLUNTEER_ROLES.reduce(
    (acc, role) => {
      acc[role] = volunteers.filter((v) => v.role === role);
      return acc;
    },
    {} as Record<string, Volunteer[]>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-sm text-[#FBBF24]">📅 Event Day</h1>
        <p className="text-[8px] text-[#94A3B8] mt-2">
          June 21, 2026 &bull; 489 Sienna Park Dr SW
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`pixel-btn text-[8px] ${
            activeTab === "schedule"
              ? "bg-[#FBBF24] text-[#0F172A]"
              : "bg-[#1E293B] text-[#94A3B8]"
          }`}
        >
          📅 Schedule
        </button>
        <button
          onClick={() => setActiveTab("roster")}
          className={`pixel-btn text-[8px] ${
            activeTab === "roster"
              ? "bg-[#60A5FA] text-[#0F172A]"
              : "bg-[#1E293B] text-[#94A3B8]"
          }`}
        >
          👥 Team Roster
        </button>
      </div>

      {activeTab === "schedule" ? (
        <div className="bg-[#0F172A] p-6 pixel-border">
          <div className="space-y-1">
            {SCHEDULE.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 py-3 border-b border-[#1E293B] last:border-b-0"
              >
                <div className="text-[9px] text-[#FBBF24] w-20 shrink-0 text-right">
                  {item.time}
                </div>
                <div className="text-base">{item.icon}</div>
                <div className="text-[9px] text-[#F0FDF4]">{item.event}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {VOLUNTEER_ROLES.map((role) => {
            const members = roleGroups[role];
            if (!members || members.length === 0) return null;
            return (
              <div key={role} className="bg-[#0F172A] p-4 pixel-border-light">
                <h3 className="text-[9px] text-[#60A5FA] mb-3">
                  {role} ({members.length})
                </h3>
                <div className="space-y-2">
                  {members.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {/* Mini pixel character */}
                        <svg width="14" height="18" viewBox="0 0 14 20">
                          <rect
                            x="3"
                            y="0"
                            width="8"
                            height="8"
                            fill="#FBBF24"
                          />
                          <rect
                            x="4"
                            y="2"
                            width="2"
                            height="2"
                            fill="#0F172A"
                          />
                          <rect
                            x="8"
                            y="2"
                            width="2"
                            height="2"
                            fill="#0F172A"
                          />
                          <rect
                            x="2"
                            y="8"
                            width="10"
                            height="8"
                            fill="#60A5FA"
                          />
                          <rect
                            x="3"
                            y="16"
                            width="3"
                            height="4"
                            fill="#1E293B"
                          />
                          <rect
                            x="8"
                            y="16"
                            width="3"
                            height="4"
                            fill="#1E293B"
                          />
                        </svg>
                        <span className="text-[8px] text-[#F0FDF4]">
                          {v.name}
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
            );
          })}

          {volunteers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🙋</div>
              <p className="text-[9px] text-[#94A3B8]">
                No volunteers yet!
              </p>
              <p className="text-[7px] text-[#64748B] mt-2">
                Be the first to sign up
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
