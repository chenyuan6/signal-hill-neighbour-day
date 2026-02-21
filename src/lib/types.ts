export interface RSVP {
  id: string;
  familyName: string;
  email: string;
  headcount: number;
  createdAt: string;
}

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  phone: string;
  shift: "AM" | "PM" | "Full Day";
  role: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  category: string;
  description: string;
  createdAt: string;
}

export interface MapZone {
  id: string;
  label: string;
  icon: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description: string;
}

export interface PixelCharacterData {
  id: string;
  x: number;
  y: number;
  color: string;
  type: "rsvp" | "volunteer" | "vendor" | "vip";
  name: string;
}

export const VOLUNTEER_ROLES = [
  "Setup Crew",
  "Registration Desk",
  "Kids Zone Helper",
  "Food Service",
  "Cleanup Crew",
  "Parking & Directions",
  "First Aid",
  "Photography",
  "General Helper",
] as const;

export const VENDOR_CATEGORIES = [
  "Food & Beverage",
  "Crafts & Artisan",
  "Health & Wellness",
  "Kids Activities",
  "Community Service",
  "Sponsor/Corporate",
] as const;

export const TARGETS = {
  rsvps: 300,
  volunteers: 50,
  vendors: 15,
} as const;
