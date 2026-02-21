"use client";

import { useState, FormEvent } from "react";
import { addRSVP, getRSVPs } from "@/lib/store";
import Link from "next/link";

export default function RSVPPage() {
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [headcount, setHeadcount] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [totalAttending, setTotalAttending] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!familyName.trim() || !email.trim()) return;
    await addRSVP({ familyName: familyName.trim(), email: email.trim(), headcount });
    const all = await getRSVPs();
    setTotalAttending(all.reduce((sum, r) => sum + r.headcount, 0));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div className="text-4xl">🎉</div>
        <h2 className="text-sm text-[#4ADE80]">You&apos;re In!</h2>
        <p className="text-[9px] text-[#94A3B8]">
          The {familyName} family ({headcount}{" "}
          {headcount === 1 ? "person" : "people"}) is coming to Neighbour Day!
        </p>
        <div className="bg-[#0F172A] p-4 pixel-border-light">
          <p className="text-[8px] text-[#FBBF24]">
            {totalAttending} people attending so far!
          </p>
          <p className="text-[7px] text-[#64748B] mt-2">
            Your pixel character is now on the map
            <br />
            waiting with a balloon! 🎈
          </p>
        </div>
        <Link href="/" className="pixel-btn bg-[#4ADE80] text-[#0F172A]">
          🗺️ See the Map
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-sm text-[#4ADE80]">🎟️ RSVP</h1>
        <p className="text-[8px] text-[#94A3B8] mt-2">
          Let us know you&apos;re coming!
        </p>
      </div>

      {/* Pixel character preview */}
      <div className="flex justify-center">
        <svg width="60" height="80" viewBox="0 0 60 80">
          {/* Balloon */}
          <line x1="30" y1="25" x2="30" y2="10" stroke="#94A3B8" strokeWidth="1" />
          <ellipse
            cx="30"
            cy="5"
            rx="8"
            ry="10"
            fill="#F87171"
            className="animate-float-balloon"
          />
          {/* Head */}
          <rect x="22" y="28" width="16" height="16" fill="#4ADE80" />
          {/* Eyes */}
          <rect x="25" y="33" width="4" height="4" fill="#0F172A" />
          <rect x="33" y="33" width="4" height="4" fill="#0F172A" />
          {/* Smile */}
          <rect x="27" y="39" width="8" height="2" fill="#0F172A" />
          {/* Body */}
          <rect x="20" y="44" width="20" height="16" fill="#4ADE80" />
          {/* Legs */}
          <rect x="22" y="60" width="6" height="10" fill="#1E293B" />
          <rect x="32" y="60" width="6" height="10" fill="#1E293B" />
        </svg>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            FAMILY NAME
          </label>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="pixel-input"
            placeholder="The Smith Family"
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
            placeholder="family@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            HOW MANY PEOPLE?
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setHeadcount(Math.max(1, headcount - 1))}
              className="pixel-btn bg-[#334155] text-[#F0FDF4] text-xs"
            >
              -
            </button>
            <span className="text-xl text-[#FBBF24] min-w-[40px] text-center">
              {headcount}
            </span>
            <button
              type="button"
              onClick={() => setHeadcount(Math.min(20, headcount + 1))}
              className="pixel-btn bg-[#334155] text-[#F0FDF4] text-xs"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="pixel-btn bg-[#4ADE80] text-[#0F172A] w-full mt-6"
        >
          🎈 COUNT US IN!
        </button>
      </form>

      <p className="text-[7px] text-[#64748B] text-center">
        June 20, 2026 &bull; 11AM - 4PM &bull; 489 Sienna Park Dr SW
      </p>
    </div>
  );
}
