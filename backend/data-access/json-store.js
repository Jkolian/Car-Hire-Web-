// Default storage backend — a JSON file on disk. Zero setup, good for local
// development and small demos. Every function here has a matching function
// with the exact same name and shape in postgres-store.js, so switching
// backends (see index.js) never requires touching server.js.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VEHICLES_PATH = path.join(__dirname, "..", "data", "vehicles.json");
const BOOKINGS_PATH = path.join(__dirname, "..", "data", "bookings.json");

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function listVehicles({ type } = {}) {
  let vehicles = readJSON(VEHICLES_PATH);
  if (type && type !== "All") vehicles = vehicles.filter((v) => v.type === type);
  return vehicles;
}

async function createVehicle(data) {
  const vehicles = readJSON(VEHICLES_PATH);
  const vehicle = {
    id: "v" + crypto.randomBytes(4).toString("hex"),
    name: data.name,
    type: data.type,
    seats: Number(data.seats) || 4,
    transmission: data.transmission || "Automatic",
    fuel: data.fuel || "Petrol",
    price: Number(data.price),
    location: data.location || "Narok Town",
    owner: data.owner,
    phone: data.phone,
    blurb: data.blurb || "Newly listed vehicle — details confirmed with the owner directly.",
  };
  vehicles.unshift(vehicle);
  writeJSON(VEHICLES_PATH, vehicles);
  return vehicle;
}

async function getVehicleById(id) {
  const vehicles = readJSON(VEHICLES_PATH);
  return vehicles.find((v) => v.id === id) || null;
}

async function listBookings() {
  return readJSON(BOOKINGS_PATH);
}

async function createBooking(data) {
  const bookings = readJSON(BOOKINGS_PATH);
  bookings.unshift(data);
  writeJSON(BOOKINGS_PATH, bookings);
  return data;
}

async function updateBookingByRef(ref, updates) {
  const bookings = readJSON(BOOKINGS_PATH);
  const idx = bookings.findIndex((b) => b.ref === ref);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...updates };
  writeJSON(BOOKINGS_PATH, bookings);
  return bookings[idx];
}

async function updateBookingByCheckoutId(checkoutId, updates) {
  const bookings = readJSON(BOOKINGS_PATH);
  const idx = bookings.findIndex((b) => b.mpesaCheckoutId === checkoutId);
  if (idx === -1) return null;
  bookings[idx] = { ...bookings[idx], ...updates };
  writeJSON(BOOKINGS_PATH, bookings);
  return bookings[idx];
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
