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
      <div className="max-w-md mx-auto text-center space-y-6 py-12">
        <div className="text-4xl">🏪</div>
        <h2 className="text-sm text-[#F472B6]">Application Received!</h2>
        <p className="text-[9px] text-[#94A3B8]">
          {businessName} ({category})
        </p>
        <div className="bg-[#0F172A] p-4 pixel-border-light">
          <p className="text-[8px] text-[#FBBF24]">
            {vendorCount} vendor{vendorCount !== 1 ? "s" : ""} registered!
          </p>
          <p className="text-[7px] text-[#64748B] mt-2">
            We&apos;ll review your application and
            <br />
            get back to you shortly.
          </p>
        </div>
        <Link href="/" className="pixel-btn bg-[#F472B6] text-[#0F172A]">
          🗺️ See the Map
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-sm text-[#F472B6]">🏪 Vendor Application</h1>
        <p className="text-[8px] text-[#94A3B8] mt-2">
          Join us as a vendor at Neighbour Day!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            BUSINESS NAME
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="pixel-input"
            placeholder="Best Burgers YYC"
            required
          />
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            CONTACT NAME
          </label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
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
            placeholder="vendor@email.com"
            required
          />
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            CATEGORY
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="pixel-select"
          >
            {VENDOR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[8px] text-[#94A3B8] mb-2">
            DESCRIPTION
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="pixel-input min-h-[80px] resize-y"
            placeholder="Tell us about your business and what you'll offer..."
          />
        </div>

        <button
          type="submit"
          className="pixel-btn bg-[#F472B6] text-[#0F172A] w-full mt-6"
        >
          📝 SUBMIT APPLICATION
        </button>
      </form>
    </div>
  );
}
