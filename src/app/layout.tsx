import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Signal Hill Neighbour Day 2026",
  description:
    "Join us June 20, 2026 at 489 Sienna Park Dr SW for Signal Hill Neighbour Day! RSVP, volunteer, or apply as a vendor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
