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
      <div className="page-wrap">
        <div className="page-container animate-fade-in">
          <Link href="/" className="back-link">← Back to Map</Link>
          <div className="wood-card">
            <div className="wood-card-inner text-center space-y-5">
              <div className="text-5xl">🌾</div>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 800, color: "#2A6898" }}>
                Thanks, {name}!
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B5A40", lineHeight: 1.6 }}>
                You&apos;re signed up for the {shift} shift
                <br />
                Role: {role}
              </p>

              <div style={{ background: "#F5E6C8", borderRadius: 8, padding: 16 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: "#D4A830" }}>
                  {volunteerCount} volunteers signed up!
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A60", marginTop: 6 }}>
                  Your character (with a straw hat!)
                  <br />
                  is now on the festival map! 🌾
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Link href="/" className="wood-btn" style={{ background: "#5B8EC9", color: "#FDF5E6" }}>
                  🗺️ See the Map
                </Link>
                <Link href="/schedule" className="wood-btn" style={{ background: "#E8DCC8", color: "#5A3A20" }}>
                  📅 Schedule
                </Link>
              </div>
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
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 800, color: "#2A6898" }}>
                🌾 Volunteer
              </h1>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7A60", marginTop: 4 }}>
                Help make Neighbour Day amazing!
              </p>
            </div>

            {/* Character preview */}
            <div className="flex justify-center">
              <svg width="65" height="70" viewBox="0 0 65 70">
                <ellipse cx="30" cy="63" rx="6" ry="2" fill="#2A5A1A" opacity="0.12" />
                <rect x="26" y="50" width="3.5" height="9" rx="1.5" fill="#5A4A3A" />
                <rect x="31" y="50" width="3.5" height="9" rx="1.5" fill="#5A4A3A" />
                <rect x="25" y="57" width="4.5" height="3" rx="1" fill="#6B4226" />
                <rect x="30.5" y="57" width="4.5" height="3" rx="1" fill="#6B4226" />
                <rect x="24" y="35" width="12" height="15" rx="2" fill="#5B8EC9" />
                <rect x="25" y="36" width="4" height="8" rx="1" fill="#FFF" opacity="0.1" />
                <ellipse cx="30" cy="30" rx="5.5" ry="6" fill="#FFE0BD" />
                <circle cx="28" cy="29" r="1.2" fill="#2A1A08" />
                <circle cx="32.5" cy="29" r="1.2" fill="#2A1A08" />
                <path d="M28 32 Q30 34 32 32" fill="none" stroke="#C88A6A" strokeWidth="0.8" />
                {/* Straw hat */}
                <ellipse cx="30" cy="24.5" rx="9" ry="3.5" fill="#E8D8B0" />
                <ellipse cx="30" cy="24" rx="6.5" ry="3" fill="#F0E8C8" />
                <rect x="24" y="21" width="12" height="3.5" rx="1" fill="#E8D0A0" />
                {/* Hat band */}
                <rect x="23.5" y="24" width="13" height="1" rx="0.5" fill="#C4985C" />
                {/* Clipboard */}
                <rect x="41" y="35" width="10" height="13" rx="1" fill="#FDF5E6" stroke="#C4985C" strokeWidth="0.5" />
                <line x1="43" y1="38" x2="49" y2="38" stroke="#B8A088" strokeWidth="0.8" />
                <line x1="43" y1="41" x2="49" y2="41" stroke="#B8A088" strokeWidth="0.8" />
                <line x1="43" y1="44" x2="47" y2="44" stroke="#B8A088" strokeWidth="0.8" />
              </svg>
            </div>

            <div className="divider" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Your Name
                </label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="warm-input" placeholder="Jane Doe" required />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="warm-input" placeholder="jane@email.com" required />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Phone
                </label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="warm-input" placeholder="(403) 555-1234" />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Shift
                </label>
                <div className="flex gap-2">
                  {(["AM", "PM", "Full Day"] as const).map((s) => (
                    <button key={s} type="button" onClick={() => setShift(s)}
                      className="wood-btn flex-1"
                      style={{
                        background: shift === s ? "#5B8EC9" : "#E8DCC8",
                        color: shift === s ? "#FDF5E6" : "#6B5A40",
                        fontSize: 12,
                        padding: "10px 8px",
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: "#B8A088", marginTop: 6 }}>
                  AM: 9 AM - 12 PM · PM: 12 - 4 PM · Full: 9 AM - 4 PM
                </p>
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Role
                </label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="warm-select">
                  {VOLUNTEER_ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="wood-btn w-full"
                style={{ background: "#5B8EC9", color: "#FDF5E6", fontSize: 14, padding: "14px 24px" }}>
                📋 Sign Me Up!
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
