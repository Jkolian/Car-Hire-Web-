-- Run this once against your Postgres database before using db-postgres.js.
-- Locally:   psql "$DATABASE_URL" -f data-access/schema.sql
-- Hosted (Neon/Supabase/Railway): paste this into their SQL editor, or run
-- the same psql command with their connection string.

CREATE TABLE IF NOT EXISTS vehicles (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL,
  seats         INTEGER NOT NULL DEFAULT 4,
  transmission  TEXT NOT NULL DEFAULT 'Automatic',
  fuel          TEXT NOT NULL DEFAULT 'Petrol',
  price         INTEGER NOT NULL,
  location      TEXT NOT NULL DEFAULT 'Narok Town',
  owner_name    TEXT NOT NULL,
  owner_phone   TEXT NOT NULL,
  blurb         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bookings (
  ref                  TEXT PRIMARY KEY,
  vehicle_id           TEXT NOT NULL REFERENCES vehicles(id),
  vehicle_name         TEXT NOT NULL,
  customer_name        TEXT NOT NULL,
  customer_phone       TEXT NOT NULL,
  pickup_date          DATE NOT NULL,
  return_date          DATE NOT NULL,
  notes                TEXT,
  days                 INTEGER NOT NULL,
  total                INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'requested',
  -- populated once an M-Pesa STK Push has been triggered for this booking
  mpesa_checkout_id    TEXT,
  mpesa_receipt_number TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A handful of starter vehicles so the app isn't empty on first run.
-- Safe to skip or delete once you have real listings.
INSERT INTO vehicles (id, name, type, seats, transmission, fuel, price, location, owner_name, owner_phone, blurb)
VALUES
  ('v1', 'Toyota Land Cruiser Prado', 'Safari 4x4', 7, 'Automatic', 'Diesel', 9500, 'Narok Town', 'Daniel S.', '0712 345 001', 'Pop-up roof hatch, ideal for Mara game drives and long-distance safari transfers.'),
  ('v2', 'Land Cruiser 76 (Open-roof)', 'Safari 4x4', 6, 'Manual', 'Diesel', 12000, 'Sekenani Gate', 'Mary N.', '0722 456 002', 'Purpose-built safari vehicle with an experienced driver-guide included.'),
  ('v3', 'Subaru Forester', 'SUV', 5, 'Automatic', 'Petrol', 5000, 'Narok Town', 'James K.', '0733 567 003', 'Comfortable for tarmac and light off-road runs around town and Ololulunga.'),
  ('v4', 'Toyota Axio', 'Sedan', 5, 'Automatic', 'Petrol', 3000, 'Narok Town', 'Grace W.', '0700 678 004', 'Economical daily hire for in-town errands and Nairobi-Narok trips.'),
  ('v5', 'Toyota Noah', 'Van', 8, 'Automatic', 'Petrol', 6500, 'Narok Town', 'Peter L.', '0711 789 005', 'Family-sized van, good for group travel and airport-style transfers.'),
  ('v6', 'Nissan X-Trail', 'SUV', 5, 'Automatic', 'Petrol', 5500, 'Talek', 'Susan M.', '0755 890 006', 'Solid ground clearance for the Mara roads without a full safari price tag.'),
  ('v7', 'Toyota Hiace', 'Van', 14, 'Manual', 'Diesel', 8000, 'Narok Town', 'Kevin O.', '0744 901 007', 'Best fit for larger tour groups or church and school trips.'),
  ('v8', 'Mazda Demio', 'Sedan', 4, 'Automatic', 'Petrol', 2500, 'Narok Town', 'Alice T.', '0766 012 008', 'Light and fuel-efficient — the cheapest way to get around town for the day.')
ON CONFLICT (id) DO NOTHING;
