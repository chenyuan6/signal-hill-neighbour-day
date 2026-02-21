"use client";

import { useState, FormEvent } from "react";
import { addVolunteer, getVolunteers } from "@/lib/store";
import { VOLUNTEER_ROLES } from "@/lib/types";
import Link from "next/link";

export default function VolunteerPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shift, setShift] = useState<"AM" | "PM" | "Full Day">("Full Day");
  const [role, setRole] = useState(VOLUNTEER_ROLES[0] as string);
  const [submitted, setSubmitted] = useState(false);
  const [volunteerCount, setVolunteerCount] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    await addVolunteer({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      shift,
      role,
    });
    const all = await getVolunteers();
    setVolunteerCount(all.length);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div className="text-4xl">🙌</div>
        <h2 className="text-sm text-[#60A5FA]">Thanks, {name}!</h2>
        <p className="text-[9px] text-[#94A3B8]">
          You&apos;re signed up as a volunteer for {shift} shift
          <br />
          Role: {role}
        </p>
        <div className="bg-[#0F172A] p-4 pixel-border-light">
          <p className="text-[8px] text-[#FBBF24]">
            {volunteerCount} volunteers signed up!
          </p>
          <p className="text-[7px] text-[#64748B] mt-2">
            Your pixel character (with clipboard!)
            <br />
            is now on the map! 📋
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="pixel-btn bg-[#60A5FA] text-[#0F172A]">
            🗺️ See the Map
          </Link>
          <Link
            href="/schedule"
            className="pixel-btn bg-[#334155] text-[#F0FDF4]"
          >
            📅 View Schedule
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-sm text-[#60A5FA]">🙋 Volunteer</h1>
        <p className="text-[8px] text-[#94A3B8] mt-2">
          Help make Neighbour Day amazing!
        </p>
      </div>

      {/* Pixel volunteer preview */}
      <div className="flex justify-center">
        <svg width="70" height="70" viewBox="0 0 70 70">
          {/* Head */}
          <rect x="24" y="5" width="16" height="16" fill="#FBBF24" />
          {/* Eyes */}
          <rect x="27" y="10" width="4" height="4" fill="#0F172A" />
          <rect x="35" y="10" width="4" height="4" fill="#0F172A" />
          {/* Body (blue vest) */}
          <rect x="22" y="21" width="20" height="16" fill="#60A5FA" />
          {/* Clipboard */}
          <rect x="42" y="21" width="10" height="12" fill="#F0FDF4" />
          <rect x="44" y="23" width="6" height="2" fill="#94A3B8" />
          <rect x="44" y="27" width="6" height="2" fill="#94A3B8" />
          {/* Legs */}
          <rect x="24" y="37" width="6" height="10" fill="#1E293B" />
          <rect x="34" y="37" width="6" height="10" fill="#1E293B" />
        </svg>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            YOUR NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pixel-input"
            placeholder="Jane Doe"
            required
          />
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pixel-input"
            placeholder="jane@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">PHONE</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pixel-input"
            placeholder="(403) 555-1234"
          />
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">SHIFT</label>
          <div className="flex gap-2">
            {(["AM", "PM", "Full Day"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShift(s)}
                className={`pixel-btn flex-1 text-[8px] ${
                  shift === s
                    ? "bg-[#60A5FA] text-[#0F172A]"
                    : "bg-[#1E293B] text-[#94A3B8]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-[7px] text-[#64748B] mt-1">
            AM: 9AM-12PM &bull; PM: 12PM-4PM &bull; Full: 9AM-4PM
          </p>
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">ROLE</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="pixel-select"
          >
            {VOLUNTEER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="pixel-btn bg-[#60A5FA] text-[#0F172A] w-full mt-6"
        >
          📋 SIGN ME UP!
        </button>
      </form>
    </div>
  );
}
