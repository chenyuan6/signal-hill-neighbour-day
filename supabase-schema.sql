-- Signal Hill Neighbour Day 2026 - Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database
-- To reuse year over year: just TRUNCATE all tables (keeps structure)

-- RSVPs
CREATE TABLE rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_name TEXT NOT NULL,
  email TEXT NOT NULL,
  headcount INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Volunteers
CREATE TABLE volunteers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  shift TEXT NOT NULL CHECK (shift IN ('AM', 'PM', 'Full Day')),
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Vendors
CREATE TABLE vendors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can see counts/names)
CREATE POLICY "Public read" ON rsvps FOR SELECT USING (true);
CREATE POLICY "Public read" ON volunteers FOR SELECT USING (true);
CREATE POLICY "Public read" ON vendors FOR SELECT USING (true);

-- Public insert (anyone can sign up - no auth required for community event)
CREATE POLICY "Public insert" ON rsvps FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert" ON volunteers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert" ON vendors FOR INSERT WITH CHECK (true);

-- Year-over-year reset: run these to clear data for the next year
-- TRUNCATE rsvps, volunteers, vendors;
