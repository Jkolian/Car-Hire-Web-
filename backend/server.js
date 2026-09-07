require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const store = require("./data-access");
const mpesa = require("./mpesa");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

function refCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[crypto.randomInt(0, chars.length)];
  return "NCH-" + s;
}

function dayCount(pickup, ret) {
  const a = new Date(pickup);
  const b = new Date(ret);
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 1;
}

// ---- Vehicles ----

app.get("/api/vehicles", async (req, res) => {
  try {
    const vehicles = await store.listVehicles({ type: req.query.type });
    res.json(vehicles);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load vehicles" });
  }
});

app.post("/api/vehicles", async (req, res) => {
  const { name, type, price, owner, phone } = req.body;
  if (!name || !type || !price || !owner || !phone) {
    return res.status(400).json({ error: "name, type, price, owner, and phone are required" });
  }
  try {
    const vehicle = await store.createVehicle(req.body);
    res.status(201).json(vehicle);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to list vehicle" });
  }
});

// ---- Bookings ----

app.get("/api/bookings", async (req, res) => {
  try {
    res.json(await store.listBookings());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

app.post("/api/bookings", async (req, res) => {
  const { vehicleId, name, phone, pickup, ret, notes } = req.body;
  if (!vehicleId || !name || !phone || !pickup || !ret) {
    return res.status(400).json({ error: "vehicleId, name, phone, pickup, and ret are required" });
  }

  try {
    const vehicle = await store.getVehicleById(vehicleId);
    if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });

    const days = dayCount(pickup, ret);
    const total = days * vehicle.price;

    const booking = await store.createBooking({
      ref: refCode(),
      vehicleId,
      vehicleName: vehicle.name,
      name,
      phone,
      pickup,
      ret,
      notes: notes || "",
      days,
      total,
      status: "requested",
    });

    res.status(201).json(booking);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ---- M-Pesa (Daraja) ----

// POST /api/mpesa/pay  { bookingRef, phone, amount }
// Triggers an STK Push prompt on the customer's phone for a deposit (or the
// full amount) tied to an existing booking. The actual payment result
// arrives later via /api/mpesa/callback, not in this response.
app.post("/api/mpesa/pay", async (req, res) => {
  const { bookingRef, phone, amount } = req.body;
  if (!bookingRef || !phone || !amount) {
    return res.status(400).json({ error: "bookingRef, phone, and amount are required" });
  }

  try {
    const result = await mpesa.stkPush({
      phone,
      amount,
      accountReference: bookingRef,
      transactionDesc: "Car hire deposit",
    });

    if (result.ResponseCode === "0") {
      await store.updateBookingByRef(bookingRef, {
        status: "payment_pending",
        mpesaCheckoutId: result.CheckoutRequestID,
      });
    }

    res.json(result);
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: "Failed to initiate M-Pesa payment", detail: e.response?.data || e.message });
  }
});

// POST /api/mpesa/callback — Safaricom calls this once the customer
// completes or cancels the STK Push. This URL must be a public HTTPS URL
// (see README) — Safaricom cannot reach your localhost directly.
app.post("/api/mpesa/callback", async (req, res) => {
  console.log("M-Pesa callback received:", JSON.stringify(req.body));
  try {
    const result = mpesa.parseCallback(req.body);
    if (result) {
      await store.updateBookingByCheckoutId(result.checkoutRequestId, {
        status: result.success ? "paid" : "payment_failed",
        mpesaReceiptNumber: result.mpesaReceiptNumber,
      });
    }
  } catch (e) {
    console.error("Failed to process M-Pesa callback:", e);
  }
  // Always acknowledge receipt so Safaricom doesn't retry indefinitely.
  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Narok Car Hire API running on http://localhost:${PORT}`);
});
