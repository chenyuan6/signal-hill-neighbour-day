import { RSVP, Volunteer, Vendor, PixelCharacterData } from "./types";
import { supabase, isSupabaseConfigured } from "./supabase";

// ---------------------------------------------------------------------------
// localStorage helpers (always available as fallback)
// ---------------------------------------------------------------------------
const isBrowser = typeof window !== "undefined";

function getLocal<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T) {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------------------------------------------------------------------------
// RSVPs
// ---------------------------------------------------------------------------
export async function getRSVPs(): Promise<RSVP[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from("rsvps")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        familyName: r.family_name,
        email: r.email,
        headcount: r.headcount,
        createdAt: r.created_at,
      }));
    } catch (e) {
      console.warn("Supabase getRSVPs failed, using localStorage:", e);
    }
  }
  return getLocal("nd_rsvps", []);
}

export async function addRSVP(
  rsvp: Omit<RSVP, "id" | "createdAt">
): Promise<RSVP> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from("rsvps")
        .insert({
          family_name: rsvp.familyName,
          email: rsvp.email,
          headcount: rsvp.headcount,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        familyName: data.family_name,
        email: data.email,
        headcount: data.headcount,
        createdAt: data.created_at,
      };
    } catch (e) {
      console.warn("Supabase addRSVP failed, using localStorage:", e);
    }
  }
  // localStorage fallback
  const list = getLocal<RSVP[]>("nd_rsvps", []);
  const entry: RSVP = {
    ...rsvp,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  setLocal("nd_rsvps", list);
  return entry;
}

// ---------------------------------------------------------------------------
// Volunteers
// ---------------------------------------------------------------------------
export async function getVolunteers(): Promise<Volunteer[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from("volunteers")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        email: v.email,
        phone: v.phone ?? "",
        shift: v.shift,
        role: v.role,
        createdAt: v.created_at,
      }));
    } catch (e) {
      console.warn("Supabase getVolunteers failed, using localStorage:", e);
    }
  }
  return getLocal("nd_volunteers", []);
}

export async function addVolunteer(
  vol: Omit<Volunteer, "id" | "createdAt">
): Promise<Volunteer> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from("volunteers")
        .insert({
          name: vol.name,
          email: vol.email,
          phone: vol.phone || null,
          shift: vol.shift,
          role: vol.role,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone ?? "",
        shift: data.shift,
        role: data.role,
        createdAt: data.created_at,
      };
    } catch (e) {
      console.warn("Supabase addVolunteer failed, using localStorage:", e);
    }
  }
  const list = getLocal<Volunteer[]>("nd_volunteers", []);
  const entry: Volunteer = {
    ...vol,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  setLocal("nd_volunteers", list);
  return entry;
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------
export async function getVendors(): Promise<Vendor[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from("vendors")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((v) => ({
        id: v.id,
        businessName: v.business_name,
        contactName: v.contact_name,
        email: v.email,
        category: v.category,
        description: v.description ?? "",
        createdAt: v.created_at,
      }));
    } catch (e) {
      console.warn("Supabase getVendors failed, using localStorage:", e);
    }
  }
  return getLocal("nd_vendors", []);
}

export async function addVendor(
  vendor: Omit<Vendor, "id" | "createdAt">
): Promise<Vendor> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase!
        .from("vendors")
        .insert({
          business_name: vendor.businessName,
          contact_name: vendor.contactName,
          email: vendor.email,
          category: vendor.category,
          description: vendor.description || null,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: data.id,
        businessName: data.business_name,
        contactName: data.contact_name,
        email: data.email,
        category: data.category,
        description: data.description ?? "",
        createdAt: data.created_at,
      };
    } catch (e) {
      console.warn("Supabase addVendor failed, using localStorage:", e);
    }
  }
  const list = getLocal<Vendor[]>("nd_vendors", []);
  const entry: Vendor = {
    ...vendor,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  list.push(entry);
  setLocal("nd_vendors", list);
  return entry;
}

// ---------------------------------------------------------------------------
// Pixel characters (derived from data — always computed client-side)
// ---------------------------------------------------------------------------
export async function getCharacters(): Promise<PixelCharacterData[]> {
  const rsvps = await getRSVPs();
  const volunteers = await getVolunteers();
  const vendors = await getVendors();
  const chars: PixelCharacterData[] = [];

  // VIPs (always present)
  chars.push(
    {
      id: "vip-1",
      x: 420,
      y: 100,
      color: "#FFD700",
      type: "vip",
      name: "Councillor",
    },
    {
      id: "vip-2",
      x: 450,
      y: 110,
      color: "#FFD700",
      type: "vip",
      name: "MLA",
    }
  );

  // Simple hash to get repeatable "random" positions from id
  const spread = (id: string, minX: number, maxX: number, minY: number, maxY: number) => {
    let h = 0;
    for (let j = 0; j < id.length; j++) h = (h * 31 + id.charCodeAt(j)) | 0;
    const nx = Math.abs(h % 1000) / 1000;
    const ny = Math.abs((h * 7 + 13) % 1000) / 1000;
    return { x: minX + nx * (maxX - minX), y: minY + ny * (maxY - minY) };
  };

  rsvps.forEach((r) => {
    const pos = spread(r.id, 60, 490, 85, 240);
    chars.push({
      id: r.id,
      x: pos.x,
      y: pos.y,
      color: "#4ADE80",
      type: "rsvp",
      name: r.familyName,
    });
  });

  volunteers.forEach((v) => {
    const pos = spread(v.id, 55, 500, 75, 340);
    chars.push({
      id: v.id,
      x: pos.x,
      y: pos.y,
      color: "#60A5FA",
      type: "volunteer",
      name: v.name,
    });
  });

  vendors.forEach((v) => {
    const pos = spread(v.id, 170, 500, 90, 240);
    chars.push({
      id: v.id,
      x: pos.x,
      y: pos.y,
      color: "#F472B6",
      type: "vendor",
      name: v.businessName,
    });
  });

  return chars;
}
