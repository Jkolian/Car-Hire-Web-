// Postgres storage backend — used automatically once DATABASE_URL is set
// (see index.js). Run schema.sql against your database first:
//   psql "$DATABASE_URL" -f data-access/schema.sql

const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  // Supabase / hosted PostgreSQL requires SSL.
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});


// ============================================================
// VEHICLE ROW → FRONTEND OBJECT
// ============================================================

function vehicleRowToObject(row) {
  return {
    // Basic vehicle information
    id: row.id,
    name: row.name,
    type: row.type,
    seats: row.seats,
    transmission: row.transmission,
    fuel: row.fuel,
    price: row.price,
    location: row.location,

    // Owner information
    owner: row.owner_name,
    phone: row.owner_phone,

    // Description
    blurb: row.blurb,

    // Additional vehicle information
    year: row.year,
    engine: row.engine,
    drive: row.drive,
    mileage_km: row.mileage_km,
    features: row.features,

    // Availability
    available: row.available,

    // IMAGE URL
    image_url: row.image_url,
  };
}


// ============================================================
// BOOKING ROW → FRONTEND OBJECT
// ============================================================

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


// ============================================================
// LIST VEHICLES
// ============================================================

async function listVehicles({ type } = {}) {
  const result =
    type && type !== "All"
      ? await pool.query(
          `
          SELECT *
          FROM vehicles
          WHERE type = $1
          ORDER BY created_at DESC
          `,
          [type]
        )
      : await pool.query(
          `
          SELECT *
          FROM vehicles
          ORDER BY created_at DESC
          `
        );

  return result.rows.map(vehicleRowToObject);
}


// ============================================================
// CREATE VEHICLE
// ============================================================

async function createVehicle(data) {
  const id = "v" + crypto.randomBytes(4).toString("hex");

  const result = await pool.query(
    `
    INSERT INTO vehicles (
      id,
      name,
      type,
      seats,
      transmission,
      fuel,
      price,
      location,
      owner_name,
      owner_phone,
      blurb,
      year,
      engine,
      drive,
      mileage_km,
      features,
      available,
      image_url
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13,
      $14,
      $15,
      $16,
      $17,
      $18
    )
    RETURNING *
    `,
    [
      id,

      // Basic information
      data.name,
      data.type,
      Number(data.seats) || 4,
      data.transmission || "Automatic",
      data.fuel || "Petrol",
      Number(data.price),
      data.location || "Narok Town",

      // Owner
      data.owner,
      data.phone,

      // Description
      data.blurb ||
        "Newly listed vehicle — details confirmed with the owner directly.",

      // Additional vehicle information
      data.year || null,
      data.engine || null,
      data.drive || null,
      Number(data.mileage_km) || null,
      data.features || [],

      // Availability
      data.available !== undefined ? data.available : true,

      // IMAGE URL
      data.image_url || null,
    ]
  );

  return vehicleRowToObject(result.rows[0]);
}


// ============================================================
// GET ONE VEHICLE BY ID
// ============================================================

async function getVehicleById(id) {
  const result = await pool.query(
    `
    SELECT *
    FROM vehicles
    WHERE id = $1
    `,
    [id]
  );

  return result.rows[0]
    ? vehicleRowToObject(result.rows[0])
    : null;
}


// ============================================================
// LIST BOOKINGS
// ============================================================

async function listBookings() {
  const result = await pool.query(
    `
    SELECT *
    FROM bookings
    ORDER BY created_at DESC
    `
  );

  return result.rows.map(bookingRowToObject);
}


// ============================================================
// CREATE BOOKING
// ============================================================

async function createBooking(data) {
  const result = await pool.query(
    `
    INSERT INTO bookings (
      ref,
      vehicle_id,
      vehicle_name,
      customer_name,
      customer_phone,
      pickup_date,
      return_date,
      notes,
      days,
      total,
      status
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11
    )
    RETURNING *
    `,
    [
      data.ref,
      data.vehicleId,
      data.vehicleName,
      data.name,
      data.phone,
      data.pickup,
      data.ret,
      data.notes || "",
      data.days,
      data.total,
      data.status || "requested",
    ]
  );

  return bookingRowToObject(result.rows[0]);
}


// ============================================================
// UPDATE BOOKING BY REFERENCE
// ============================================================

async function updateBookingByRef(ref, updates) {
  const result = await pool.query(
    `
    UPDATE bookings
    SET
      status = COALESCE($2, status),
      mpesa_checkout_id = COALESCE($3, mpesa_checkout_id),
      mpesa_receipt_number = COALESCE($4, mpesa_receipt_number)
    WHERE ref = $1
    RETURNING *
    `,
    [
      ref,
      updates.status,
      updates.mpesaCheckoutId,
      updates.mpesaReceiptNumber,
    ]
  );

  return result.rows[0]
    ? bookingRowToObject(result.rows[0])
    : null;
}


// ============================================================
// UPDATE BOOKING BY M-PESA CHECKOUT ID
// ============================================================

async function updateBookingByCheckoutId(checkoutId, updates) {
  const result = await pool.query(
    `
    UPDATE bookings
    SET
      status = COALESCE($2, status),
      mpesa_receipt_number = COALESCE($3, mpesa_receipt_number)
    WHERE mpesa_checkout_id = $1
    RETURNING *
    `,
    [
      checkoutId,
      updates.status,
      updates.mpesaReceiptNumber,
    ]
  );

  return result.rows[0]
    ? bookingRowToObject(result.rows[0])
    : null;
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  listVehicles,
  createVehicle,
  getVehicleById,
  listBookings,
  createBooking,
  updateBookingByRef,
  updateBookingByCheckoutId,
};
