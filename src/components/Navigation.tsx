"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Map", icon: "🗺️" },
  { href: "/rsvp", label: "RSVP", icon: "🎟️" },
  { href: "/volunteer", label: "Volunteer", icon: "🙋" },
  { href: "/vendor", label: "Vendors", icon: "🏪" },
  { href: "/dashboard", label: "Stats", icon: "📊" },
  { href: "/schedule", label: "Schedule", icon: "📅" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-[#0F172A] border-b-4 border-[#4ADE80] px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-[#4ADE80] text-sm">⛸️</span>
          <span className="text-[10px] text-[#4ADE80] tracking-wider">
            NEIGHBOUR DAY 2026
          </span>
        </Link>

        <div className="flex flex-wrap gap-1 sm:ml-auto justify-center">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-2 text-[8px] transition-colors ${
                pathname === item.href
                  ? "bg-[#4ADE80] text-[#0F172A]"
                  : "text-[#94A3B8] hover:text-[#F0FDF4] hover:bg-[#1E293B]"
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
