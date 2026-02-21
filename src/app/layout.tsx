import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Signal Hill Neighbour Day 2026",
  description:
    "Join us June 21, 2026 at 489 Sienna Park Dr SW for Signal Hill Neighbour Day! RSVP, volunteer, or apply as a vendor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        <Navigation />
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-[7px] text-[#64748B] py-6 border-t-2 border-[#1E293B]">
          Signal Hill Community Association &bull; Neighbour Day 2026 &bull;
          489 Sienna Park Dr SW
        </footer>
      </body>
    </html>
  );
}
