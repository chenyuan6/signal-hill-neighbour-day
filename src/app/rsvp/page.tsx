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
      <div className="page-wrap">
        <div className="page-container animate-fade-in">
          <Link href="/" className="back-link">← Back to Map</Link>
          <div className="wood-card">
            <div className="wood-card-inner text-center space-y-5">
              <div className="text-5xl">🌻</div>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 800, color: "#3A7828" }}>
                You&apos;re In!
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B5A40", lineHeight: 1.6 }}>
                The {familyName} family ({headcount}{" "}
                {headcount === 1 ? "person" : "people"}) is coming to Neighbour Day!
              </p>

              <div style={{ background: "#F5E6C8", borderRadius: 8, padding: 16 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: "#D4A830" }}>
                  {totalAttending} people attending so far!
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A60", marginTop: 6 }}>
                  Your character is wandering the festival
                  <br />
                  with a balloon! 🎈
                </p>
              </div>

              <Link href="/" className="wood-btn w-full" style={{ background: "#4EAE5C", color: "#FDF5E6" }}>
                🗺️ See the Map
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="page-container animate-fade-in">
        <Link href="/" className="back-link">← Back to Map</Link>

        <div className="wood-card">
          <div className="wood-card-inner space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 800, color: "#3A7828" }}>
                🌻 RSVP
              </h1>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7A60", marginTop: 4 }}>
                Let us know you&apos;re coming!
              </p>
            </div>

            {/* Character preview */}
            <div className="flex justify-center">
              <svg width="60" height="75" viewBox="0 0 60 75">
                <line x1="30" y1="22" x2="30" y2="8" stroke="#A08060" strokeWidth="0.8" />
                <ellipse cx="30" cy="4" rx="7" ry="9" fill="#FF6B6B" className="animate-float-balloon" opacity="0.85" />
                <ellipse cx="28" cy="2" rx="2" ry="3" fill="#FFF" opacity="0.3" />
                <ellipse cx="30" cy="67" rx="6" ry="2" fill="#2A5A1A" opacity="0.12" />
                <rect x="26" y="53" width="3.5" height="9" rx="1.5" fill="#5A4A3A" />
                <rect x="31" y="53" width="3.5" height="9" rx="1.5" fill="#5A4A3A" />
                <rect x="25" y="60" width="4.5" height="3" rx="1" fill="#6B4226" />
                <rect x="30.5" y="60" width="4.5" height="3" rx="1" fill="#6B4226" />
                <rect x="24" y="38" width="12" height="15" rx="2" fill="#4EAE5C" />
                <rect x="25" y="39" width="4" height="8" rx="1" fill="#FFF" opacity="0.1" />
                <ellipse cx="30" cy="33" rx="5.5" ry="6" fill="#FFE0BD" />
                <circle cx="28" cy="32" r="1.2" fill="#2A1A08" />
                <circle cx="32.5" cy="32" r="1.2" fill="#2A1A08" />
                <path d="M28 35 Q30 37 32 35" fill="none" stroke="#C88A6A" strokeWidth="0.8" />
              </svg>
            </div>

            <div className="divider" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Family Name
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="warm-input"
                  placeholder="The Smith Family"
                  required
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="warm-input"
                  placeholder="family@email.com"
                  required
                />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  How many people?
                </label>
                <div className="flex items-center gap-5 justify-center">
                  <button
                    type="button"
                    onClick={() => setHeadcount(Math.max(1, headcount - 1))}
                    className="wood-btn"
                    style={{ background: "#E8DCC8", color: "#5A3A20", width: 44, height: 44, padding: 0, fontSize: 18, fontWeight: 700, borderRadius: "50%" }}
                  >
                    -
                  </button>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 32, fontWeight: 800, color: "#D4A830", minWidth: 48, textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                    {headcount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHeadcount(Math.min(20, headcount + 1))}
                    className="wood-btn"
                    style={{ background: "#E8DCC8", color: "#5A3A20", width: 44, height: 44, padding: 0, fontSize: 18, fontWeight: 700, borderRadius: "50%" }}
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="wood-btn w-full"
                style={{ background: "#4EAE5C", color: "#FDF5E6", fontSize: 14, padding: "14px 24px" }}
              >
                🎈 Count Us In!
              </button>
            </form>

            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#B8A088", textAlign: "center" }}>
              June 20, 2026 · 11 AM - 4 PM · 489 Sienna Park Dr SW
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
