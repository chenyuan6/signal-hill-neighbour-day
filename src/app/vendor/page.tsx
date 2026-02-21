"use client";

import { useState, FormEvent } from "react";
import { addVendor, getVendors } from "@/lib/store";
import { VENDOR_CATEGORIES } from "@/lib/types";
import Link from "next/link";

export default function VendorPage() {
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(VENDOR_CATEGORIES[0] as string);
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [vendorCount, setVendorCount] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!businessName.trim() || !contactName.trim() || !email.trim()) return;
    await addVendor({
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      category,
      description: description.trim(),
    });
    const all = await getVendors();
    setVendorCount(all.length);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="page-wrap">
        <div className="page-container animate-fade-in">
          <Link href="/" className="back-link">← Back to Map</Link>
          <div className="wood-card">
            <div className="wood-card-inner text-center space-y-5">
              <div className="text-5xl">🏕️</div>
              <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: 20, fontWeight: 800, color: "#B04870" }}>
                Application Received!
              </h2>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B5A40", lineHeight: 1.6 }}>
                {businessName} ({category})
              </p>

              <div style={{ background: "#F5E6C8", borderRadius: 8, padding: 16 }}>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, fontWeight: 700, color: "#D4A830" }}>
                  {vendorCount} vendor{vendorCount !== 1 ? "s" : ""} registered!
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7A60", marginTop: 6 }}>
                  We&apos;ll review your application and
                  <br />
                  get back to you shortly.
                </p>
              </div>

              <Link href="/" className="wood-btn w-full" style={{ background: "#D86090", color: "#FDF5E6" }}>
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
              <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: 22, fontWeight: 800, color: "#B04870" }}>
                🏕️ Vendor Application
              </h1>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7A60", marginTop: 4 }}>
                Join us as a vendor at Neighbour Day!
              </p>
            </div>

            {/* Market stall illustration */}
            <div className="flex justify-center">
              <svg width="80" height="65" viewBox="0 0 80 65">
                {/* Posts */}
                <line x1="12" y1="15" x2="12" y2="55" stroke="#8B5E34" strokeWidth="2" />
                <line x1="68" y1="15" x2="68" y2="55" stroke="#8B5E34" strokeWidth="2" />
                {/* Awning */}
                <polygon points="8,15 72,15 68,8 12,8" fill="#D86090" opacity="0.85" />
                <polygon points="8,15 72,15 68,8 12,8" fill="url(#vendorStripes)" opacity="0.3" />
                {/* Scalloped edge */}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <ellipse key={i} cx={14 + i * 10} cy="16.5" rx="5" ry="2.5" fill="#D86090" opacity="0.7" />
                ))}
                {/* Counter */}
                <polygon points="10,40 70,40 68,35 12,35" fill="#D4A86C" stroke="#A07840" strokeWidth="0.5" />
                {/* Items on counter */}
                <rect x="20" y="31" width="6" height="4" rx="1" fill="#FF6B6B" opacity="0.7" />
                <rect x="30" y="32" width="5" height="3" rx="1" fill="#FFE66D" opacity="0.7" />
                <rect x="40" y="31" width="7" height="4" rx="1" fill="#87CEEB" opacity="0.7" />
                <rect x="52" y="32" width="5" height="3" rx="1" fill="#C084FC" opacity="0.7" />
                {/* Sign */}
                <rect x="25" y="20" width="30" height="10" rx="2" fill="#FDF5E6" stroke="#A07840" strokeWidth="0.5" />
                <text x="40" y="27" textAnchor="middle" fill="#5A3A20" fontSize="5" fontWeight="700"
                  fontFamily="Inter, sans-serif">YOUR STALL</text>
                <defs>
                  <pattern id="vendorStripes" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="4" height="4" fill="#FFF" opacity="0.3" />
                    <rect width="2" height="4" fill="#FFF" opacity="0" />
                  </pattern>
                </defs>
              </svg>
            </div>

            <div className="divider" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Business Name
                </label>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  className="warm-input" placeholder="Best Burgers YYC" required />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Contact Name
                </label>
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                  className="warm-input" placeholder="Jane Doe" required />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Email
                </label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="warm-input" placeholder="vendor@email.com" required />
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Category
                </label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="warm-select">
                  {VENDOR_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#6B5A40", display: "block", marginBottom: 6 }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="warm-input min-h-[80px] resize-y"
                  placeholder="Tell us about your business and what you'll offer..."
                />
              </div>

              <button type="submit" className="wood-btn w-full"
                style={{ background: "#D86090", color: "#FDF5E6", fontSize: 14, padding: "14px 24px" }}>
                📝 Submit Application
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
