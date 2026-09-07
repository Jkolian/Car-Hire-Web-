// Postgres storage backend — used automatically once DATABASE_URL is set
// (see index.js). Run schema.sql against your database first:
//   psql "$DATABASE_URL" -f data-access/schema.sql
const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Most hosted Postgres providers (Neon, Supabase, Render, Railway) require
  // SSL. This setting works for their self-signed setups; tighten it if your
  // provider gives you a CA bundle to verify against instead.
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

function vehicleRowToObject(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    seats: row.seats,
    transmission: row.transmission,
    fuel: row.fuel,
    price: row.price,
    location: row.location,
    owner: row.owner_name,
    phone: row.owner_phone,
    blurb: row.blurb,
  };
}

function bookingRowToObject(row) {
  return {
    ref: row.ref,
    vehicleId: row.vehicle_id,
    vehicleName: row.vehicle_name,
    name: row.customer_name,
    phone: row.customer_phone,
    pickup: row.pickup_date.toISOString().slice(0, 10),
    ret: row.return_date.toISOString().slice(0, 10),
    notes: row.notes,
    days: row.days,
    total: row.total,
    status: row.status,
    mpesaCheckoutId: row.mpesa_checkout_id,
    mpesaReceiptNumber: row.mpesa_receipt_number,
  };
}

async function listVehicles({ type } = {}) {
  const result = type && type !== "All"
    ? await pool.query("SELECT * FROM vehicles WHERE type = $1 ORDER BY created_at DESC", [type])
    : await pool.query("SELECT * FROM vehicles ORDER BY created_at DESC");
  return result.rows.map(vehicleRowToObject);
}

async function createVehicle(data) {
  const id = "v" + crypto.randomBytes(4).toString("hex");
  const result = await pool.query(
    `INSERT INTO vehicles (id, name, type, seats, transmission, fuel, price, location, owner_name, owner_phone, blurb)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      id, data.name, data.type, Number(data.seats) || 4,
      data.transmission || "Automatic", data.fuel || "Petrol", Number(data.price),
      data.location || "Narok Town", data.owner, data.phone,
      data.blurb || "Newly listed vehicle — details confirmed with the owner directly.",
    ]
  );
  return vehicleRowToObject(result.rows[0]);
}

async function getVehicleById(id) {
  const result = await pool.query("SELECT * FROM vehicles WHERE id = $1", [id]);
  return result.rows[0] ? vehicleRowToObject(result.rows[0]) : null;
}

async function listBookings() {
  const result = await pool.query("SELECT * FROM bookings ORDER BY created_at DESC");
  return result.rows.map(bookingRowToObject);
}

async function createBooking(data) {
  const result = await pool.query(
    `INSERT INTO bookings (ref, vehicle_id, vehicle_name, customer_name, customer_phone, pickup_date, return_date, notes, days, total, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      data.ref, data.vehicleId, data.vehicleName, data.name, data.phone,
      data.pickup, data.ret, data.notes || "", data.days, data.total,
      data.status || "requested",
    ]
  );
  return bookingRowToObject(result.rows[0]);
}

async function updateBookingByRef(ref, updates) {
  const result = await pool.query(
    `UPDATE bookings SET
       status = COALESCE($2, status),
       mpesa_checkout_id = COALESCE($3, mpesa_checkout_id),
       mpesa_receipt_number = COALESCE($4, mpesa_receipt_number)
     WHERE ref = $1 RETURNING *`,
    [ref, updates.status, updates.mpesaCheckoutId, updates.mpesaReceiptNumber]
  );
  return result.rows[0] ? bookingRowToObject(result.rows[0]) : null;
}

async function updateBookingByCheckoutId(checkoutId, updates) {
  const result = await pool.query(
    `UPDATE bookings SET
       status = COALESCE($2, status),
       mpesa_receipt_number = COALESCE($3, mpesa_receipt_number)
     WHERE mpesa_checkout_id = $1 RETURNING *`,
    [checkoutId, updates.status, updates.mpesaReceiptNumber]
  );
  return result.rows[0] ? bookingRowToObject(result.rows[0]) : null;
}

module.exports = {
  listVehicles,
  createVehicle,
  getVehicleById,
  listBookings,
  createBooking,
  updateBookingByRef,
  updateBookingByCheckoutId,
};
