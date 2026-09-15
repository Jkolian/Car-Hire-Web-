import React, { useState, useEffect, useMemo } from "react";
import {
  Car,
  MapPin,
  Calendar,
  Phone,
  CheckCircle2,
  ArrowLeft,
  Users,
  Gauge,
  Loader2,
  Check,
  MessageCircle,
  Mail,
  Clock3,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

// ---- Design tokens ----
const INK = "#201D18";
const SAND = "#FFFFFF";
const CARD = "#FBF8F1";
const RED = "#A8382B";
const OLIVE = "#556047";
const GOLD = "#C0923A";
const TEAL = "#3D6763";
const LINE = "rgba(32,29,24,0.12)";
const BLUE = "#1F4E8C";
const LOGO_SRC = "/koldrive-logo.png";
const LOGO_MARK_SRC = "/koldrive-logo-mark.png";

const TYPE_COLOR = {
  "Safari 4x4": RED,
  Sedan: OLIVE,
  Van: GOLD,
  SUV: TEAL,
};

const TYPES = ["All", "Safari 4x4", "SUV", "Van", "Sedan"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayCount(pickup, ret) {
  const a = new Date(pickup);
  const b = new Date(ret);
  const diff = Math.round((b - a) / 86400000);
  return diff > 0 ? diff : 1;
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

function TypeTag({ type, size = "sm" }) {
  const color = TYPE_COLOR[type] || INK;
  return (
    <span
      className={size === "sm" ? "text-xs px-2 py-1" : "text-sm px-3 py-1"}
      style={{
        backgroundColor: color + "1A",
        color,
        borderRadius: 3,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

function VehicleRow({ v, onSelect }) {
  const color = TYPE_COLOR[v.type] || INK;

  return (
    <button
      onClick={() => onSelect(v)}
      className="w-full text-left flex flex-col sm:flex-row gap-4 sm:items-center py-5"
      style={{ borderBottom: `1px solid ${LINE}` }}
    >
      <div
        className="flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          width: 140,
          height: 90,
          backgroundColor: color,
          borderRadius: 6,
        }}
      >
        {v.image_url ? (
          <img
            src={v.image_url}
            alt={v.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.nextElementSibling) {
                e.currentTarget.nextElementSibling.style.display = "flex";
              }
            }}
          />
        ) : null}
        <div
          className="items-center justify-center w-full h-full"
          style={{ display: v.image_url ? "none" : "flex" }}
        >
          <Car size={34} color={CARD} strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-serif text-lg" style={{ color: INK }}>
            {v.name}
          </h3>
          <TypeTag type={v.type} />
        </div>
        <div
          className="flex items-center gap-4 mt-1 text-sm flex-wrap"
          style={{ color: INK, opacity: 0.65 }}
        >
          <span className="flex items-center gap-1">
            <Users size={14} /> {v.seats} seats
          </span>
          <span className="flex items-center gap-1">
            <Gauge size={14} /> {v.transmission}
          </span>
          <span className="flex items-center gap-1">
            <MapPin size={14} /> {v.location}
          </span>
        </div>
      </div>

      <div className="text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between gap-1">
        <div>
          <span className="font-serif text-xl" style={{ color: GOLD }}>
            KES {Number(v.price).toLocaleString()}
          </span>
          <span className="text-sm" style={{ color: INK, opacity: 0.55 }}>
            {" "}
            /day
          </span>
        </div>
        <span className="text-sm font-semibold" style={{ color: RED }}>
          View details
        </span>
      </div>
    </button>
  );
}

function BookingPanel({ vehicle, initialPickup, initialRet, onBack, onConfirmed }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickup, setPickup] = useState(initialPickup || "");
  const [ret, setRet] = useState(initialRet || "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const days = pickup && ret ? dayCount(pickup, ret) : 0;
  const total = days * Number(vehicle.price || 0);

  async function submitBooking(e) {
    e.preventDefault();
    setError("");

    if (!name || !phone || !pickup || !ret) {
      setError("Please fill in all required fields.");
      return;
    }

    if (new Date(ret) <= new Date(pickup)) {
      setError("Return date must be after the pickup date.");
      return;
    }

    try {
      setLoading(true);
      const data = await apiPost("/bookings", {
        vehicleId: vehicle.id,
        name,
        phone,
        pickup,
        ret,
        notes,
      });

      onConfirmed({
        ...data,
        vehicleName: vehicle.name,
        pickup,
        ret,
        days,
        total,
        phone,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create booking");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-sm font-semibold"
        style={{ color: RED }}
      >
        <ArrowLeft size={16} />
        Back to vehicles
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT: Vehicle details */}
        <div>
          <div
            className="relative overflow-hidden mb-5"
            style={{
              height: 320,
              backgroundColor: TYPE_COLOR[vehicle.type] || INK,
              borderRadius: 8,
            }}
          >
            {vehicle.image_url ? (
              <img
                src={vehicle.image_url}
                alt={vehicle.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className="w-full h-full items-center justify-center"
              style={{ display: vehicle.image_url ? "none" : "flex" }}
            >
              <Car size={72} color={CARD} strokeWidth={1.3} />
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <TypeTag type={vehicle.type} />
              <h1 className="font-serif text-3xl mt-2" style={{ color: INK }}>
                {vehicle.name}
              </h1>
              <p className="mt-2 text-sm" style={{ color: INK, opacity: 0.65 }}>
                {vehicle.location}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-serif text-2xl" style={{ color: GOLD }}>
                KES {Number(vehicle.price).toLocaleString()}
              </div>
              <div className="text-sm" style={{ color: INK, opacity: 0.55 }}>
                per day
              </div>
            </div>
          </div>

          {vehicle.blurb && (
            <p className="mt-5 leading-7" style={{ color: INK, opacity: 0.78 }}>
              {vehicle.blurb}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
            {[
              { label: "Seats", value: vehicle.seats },
              { label: "Transmission", value: vehicle.transmission },
              { label: "Fuel", value: vehicle.fuel },
              { label: "Year", value: vehicle.year },
              { label: "Drive", value: vehicle.drive },
              {
                label: "Mileage",
                value: vehicle.mileage_km
                  ? `${Number(vehicle.mileage_km).toLocaleString()} km`
                  : null,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-3"
                style={{ backgroundColor: "#F7F3EA", borderRadius: 6 }}
              >
                <div
                  className="text-xs uppercase tracking-wide"
                  style={{ color: INK, opacity: 0.5 }}
                >
                  {label}
                </div>
                <div className="font-semibold mt-1" style={{ color: INK }}>
                  {value || "—"}
                </div>
              </div>
            ))}
          </div>

          {vehicle.engine && (
            <div className="mt-5">
              <div
                className="text-xs uppercase tracking-wide"
                style={{ color: INK, opacity: 0.5 }}
              >
                Engine
              </div>
              <div className="mt-1 font-medium" style={{ color: INK }}>
                {vehicle.engine}
              </div>
            </div>
          )}

          {Array.isArray(vehicle.features) && vehicle.features.length > 0 && (
            <div className="mt-6">
              <div
                className="text-xs uppercase tracking-wide mb-3"
                style={{ color: INK, opacity: 0.5 }}
              >
                Features
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {vehicle.features.map((feature, index) => (
                  <div
                    key={`${feature}-${index}`}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: INK }}
                  >
                    <Check size={15} style={{ color: RED }} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            className="mt-6 inline-flex items-center gap-2 px-3 py-2 text-sm"
            style={{
              backgroundColor: vehicle.available ? "#EEF7EE" : "#FBECEC",
              color: vehicle.available ? "#356B35" : "#9B3B3B",
              borderRadius: 5,
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: vehicle.available ? "#4C8A4C" : "#B84A4A",
              }}
            />
            {vehicle.available ? "Available for booking" : "Currently unavailable"}
          </div>
        </div>

        {/* RIGHT: Booking form */}
        <div>
          <div
            className="p-6 sm:p-7"
            style={{
              border: `1px solid ${LINE}`,
              backgroundColor: CARD,
              borderRadius: 8,
            }}
          >
            <h2 className="font-serif text-2xl" style={{ color: INK }}>
              Book this vehicle
            </h2>
            <p className="text-sm mt-1 mb-6" style={{ color: INK, opacity: 0.6 }}>
              Send a booking request and the owner will confirm availability.
            </p>

            {error && (
              <div
                className="mb-5 p-3 text-sm"
                style={{
                  backgroundColor: "#FBECEC",
                  color: "#9B3B3B",
                  borderRadius: 5,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={submitBooking}>
              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: INK }}
                >
                  Full name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3 py-3 outline-none"
                  style={{
                    border: `1px solid ${LINE}`,
                    borderRadius: 5,
                    color: INK,
                    backgroundColor: CARD,
                  }}
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: INK }}
                >
                  Phone number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  className="w-full px-3 py-3 outline-none"
                  style={{
                    border: `1px solid ${LINE}`,
                    borderRadius: 5,
                    color: INK,
                    backgroundColor: CARD,
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: INK }}
                  >
                    Pickup date *
                  </label>
                  <input
                    type="date"
                    value={pickup}
                    min={todayISO()}
                    onChange={(e) => setPickup(e.target.value)}
                    className="w-full px-3 py-3 outline-none"
                    style={{
                      border: `1px solid ${LINE}`,
                      borderRadius: 5,
                      color: INK,
                      backgroundColor: CARD,
                    }}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: INK }}
                  >
                    Return date *
                  </label>
                  <input
                    type="date"
                    value={ret}
                    min={pickup || todayISO()}
                    onChange={(e) => setRet(e.target.value)}
                    className="w-full px-3 py-3 outline-none"
                    style={{
                      border: `1px solid ${LINE}`,
                      borderRadius: 5,
                      color: INK,
                      backgroundColor: CARD,
                    }}
                    required
                  />
                </div>
              </div>

              <div className="mb-5">
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: INK }}
                >
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Pickup details, destination, special requests..."
                  rows={4}
                  className="w-full px-3 py-3 outline-none resize-none"
                  style={{
                    border: `1px solid ${LINE}`,
                    borderRadius: 5,
                    color: INK,
                    backgroundColor: CARD,
                  }}
                />
              </div>

              <div
                className="p-4 mb-5"
                style={{ backgroundColor: "#F7F3EA", borderRadius: 6 }}
              >
                <div className="flex justify-between text-sm">
                  <span style={{ color: INK, opacity: 0.65 }}>Daily rate</span>
                  <span className="font-semibold" style={{ color: INK }}>
                    KES {Number(vehicle.price).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span style={{ color: INK, opacity: 0.65 }}>Number of days</span>
                  <span className="font-semibold" style={{ color: INK }}>
                    {days || "—"}
                  </span>
                </div>
                <div
                  className="flex justify-between mt-4 pt-4"
                  style={{ borderTop: `1px solid ${LINE}` }}
                >
                  <span className="font-serif text-lg" style={{ color: INK }}>
                    Estimated total
                  </span>
                  <span className="font-serif text-xl" style={{ color: GOLD }}>
                    {days ? `KES ${total.toLocaleString()}` : "—"}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || vehicle.available === false}
                className="w-full py-3.5 font-semibold"
                style={{
                  backgroundColor:
                    loading || vehicle.available === false ? "#B8B1A5" : RED,
                  color: "#FFFFFF",
                  borderRadius: 5,
                  cursor:
                    loading || vehicle.available === false
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {loading
                  ? "Sending request..."
                  : vehicle.available === false
                  ? "Vehicle unavailable"
                  : "Request booking"}
              </button>
            </form>

            {(vehicle.owner || vehicle.phone) && (
              <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${LINE}` }}>
                <div
                  className="text-xs uppercase tracking-wide"
                  style={{ color: INK, opacity: 0.5 }}
                >
                  Vehicle owner
                </div>
                {vehicle.owner && (
                  <div className="font-medium mt-1" style={{ color: INK }}>
                    {vehicle.owner}
                  </div>
                )}
                {vehicle.phone && (
                  <a href={`tel:${vehicle.phone}`} className="text-sm" style={{ color: RED }}>
                    {vehicle.phone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Confirmation({ booking, onDone }) {
  const depositAmount = Math.max(500, Math.round(booking.total * 0.2));
  const [payPhone, setPayPhone] = useState(booking.phone || "");
  const [payState, setPayState] = useState("idle"); // idle | sending | sent | error
  const [payError, setPayError] = useState(null);

  const payDeposit = async () => {
    setPayState("sending");
    setPayError(null);
    try {
      const result = await apiPost("/mpesa/pay", {
        bookingRef: booking.ref,
        phone: payPhone,
        amount: depositAmount,
      });
      if (result.ResponseCode === "0") {
        setPayState("sent");
      } else {
        setPayState("error");
        setPayError(result.ResponseDescription || "Could not start the M-Pesa prompt.");
      }
    } catch (e) {
      setPayState("error");
      setPayError(e.message || "Could not start the M-Pesa prompt.");
    }
  };

  return (
    <div className="max-w-lg mx-auto text-center py-10">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: OLIVE + "22",
        }}
      >
        <CheckCircle2 size={28} color={OLIVE} />
      </div>
      <h2 className="font-serif text-2xl mb-2" style={{ color: INK }}>
        Booking requested
      </h2>
      <p className="text-sm mb-6" style={{ color: INK, opacity: 0.7 }}>
        The owner will confirm availability by phone or SMS shortly.
      </p>

      <div
        className="text-left p-5 mb-6"
        style={{
          backgroundColor: CARD,
          border: `1px solid ${LINE}`,
          borderRadius: 4,
        }}
      >
        <div
          className="flex justify-between text-sm mb-3 pb-3"
          style={{ borderBottom: `1px solid ${LINE}` }}
        >
          <span style={{ color: INK, opacity: 0.6 }}>Reference</span>
          <span className="font-semibold" style={{ color: RED }}>
            {booking.ref}
          </span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: INK, opacity: 0.6 }}>Vehicle</span>
          <span style={{ color: INK }}>{booking.vehicleName}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: INK, opacity: 0.6 }}>Dates</span>
          <span style={{ color: INK }}>
            {booking.pickup} → {booking.ret}
          </span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: INK, opacity: 0.6 }}>Duration</span>
          <span style={{ color: INK }}>
            {booking.days} day{booking.days > 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span style={{ color: INK, opacity: 0.6 }}>Total</span>
          <span className="font-semibold" style={{ color: GOLD }}>
            KES {booking.total.toLocaleString()}
          </span>
        </div>
      </div>

      <div
        className="text-left p-5 mb-6"
        style={{
          backgroundColor: CARD,
          border: `1px solid ${LINE}`,
          borderRadius: 4,
        }}
      >
        <h3 className="font-serif text-lg mb-1" style={{ color: INK }}>
          Secure it with a deposit
        </h3>
        <p className="text-sm mb-4" style={{ color: INK, opacity: 0.65 }}>
          KES {depositAmount.toLocaleString()} via M-Pesa (20% of the total, min
          KES 500).
        </p>
        <label className="text-sm block mb-4">
          <span className="block mb-1 font-medium" style={{ color: INK }}>
            M-Pesa phone number
          </span>
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 3,
              backgroundColor: "white",
            }}
          >
            <Phone size={15} style={{ opacity: 0.5 }} />
            <input
              value={payPhone}
              onChange={(e) => setPayPhone(e.target.value)}
              placeholder="07xx xxx xxx"
              className="w-full text-sm outline-none"
              style={{ backgroundColor: "transparent" }}
            />
          </div>
        </label>

        {payState === "sent" ? (
          <p className="text-sm flex items-center gap-2" style={{ color: OLIVE }}>
            <CheckCircle2 size={16} /> Check your phone and enter your M-Pesa PIN
            to complete the deposit.
          </p>
        ) : (
          <button
            disabled={payState === "sending" || payPhone.trim().length < 9}
            onClick={payDeposit}
            className="w-full py-3 font-semibold text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: OLIVE,
              color: CARD,
              borderRadius: 3,
              opacity:
                payState === "sending" || payPhone.trim().length < 9 ? 0.5 : 1,
              cursor: payState === "sending" ? "wait" : "pointer",
            }}
          >
            {payState === "sending" && (
              <Loader2 size={16} className="animate-spin" />
            )}
            {payState === "sending"
              ? "Sending M-Pesa prompt..."
              : "Pay deposit with M-Pesa"}
          </button>
        )}
        {payState === "error" && (
          <p className="text-sm mt-3" style={{ color: RED }}>
            {payError}
          </p>
        )}
      </div>

      <button
        onClick={onDone}
        className="px-6 py-3 text-sm font-semibold"
        style={{ backgroundColor: INK, color: CARD, borderRadius: 3 }}
      >
        Book another vehicle
      </button>
    </div>
  );
}

function ListVehicleForm({ onAdded }) {
  const [form, setForm] = useState({
    owner: "",
    phone: "",
    name: "",
    type: "SUV",
    seats: "5",
    price: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const canSubmit =
    form.owner.trim() &&
    form.phone.trim().length >= 9 &&
    form.name.trim() &&
    form.price &&
    !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const vehicle = await apiPost("/vehicles", {
        name: form.name,
        type: form.type,
        seats: Number(form.seats),
        price: Number(form.price),
        owner: form.owner,
        phone: form.phone,
      });
      onAdded(vehicle);
      setDone(true);
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div
          className="mx-auto mb-5 flex items-center justify-center"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            backgroundColor: OLIVE + "22",
          }}
        >
          <CheckCircle2 size={28} color={OLIVE} />
        </div>
        <h2 className="font-serif text-2xl mb-2" style={{ color: INK }}>
          Your vehicle is listed
        </h2>
        <p className="text-sm mb-6" style={{ color: INK, opacity: 0.7 }}>
          {form.name} now appears in the "Book a car" tab. Renters will contact
          you directly to arrange hire.
        </p>
        <button
          onClick={() => setDone(false)}
          className="px-6 py-3 text-sm font-semibold"
          style={{ backgroundColor: INK, color: CARD, borderRadius: 3 }}
        >
          List another vehicle
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="font-serif text-2xl mb-1" style={{ color: INK }}>
        List your vehicle
      </h2>
      <p className="text-sm mb-6" style={{ color: INK, opacity: 0.65 }}>
        Own a car, van, or 4x4 in the Narok area? List it here — you set the
        price, renters contact you directly.
      </p>
      <div
        className="p-5"
        style={{
          backgroundColor: CARD,
          border: `1px solid ${LINE}`,
          borderRadius: 4,
        }}
      >
        <label className="text-sm block mb-4">
          <span className="block mb-1 font-medium" style={{ color: INK }}>
            Your name
          </span>
          <input
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 3,
              backgroundColor: "white",
            }}
          />
        </label>
        <label className="text-sm block mb-4">
          <span className="block mb-1 font-medium" style={{ color: INK }}>
            Phone number
          </span>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="07xx xxx xxx"
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 3,
              backgroundColor: "white",
            }}
          />
        </label>
        <label className="text-sm block mb-4">
          <span className="block mb-1 font-medium" style={{ color: INK }}>
            Vehicle (make and model)
          </span>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Toyota RAV4"
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 3,
              backgroundColor: "white",
            }}
          />
        </label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="text-sm">
            <span className="block mb-1 font-medium" style={{ color: INK }}>
              Vehicle type
            </span>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 text-sm outline-none"
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 3,
                backgroundColor: "white",
              }}
            >
              {TYPES.filter((t) => t !== "All").map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 font-medium" style={{ color: INK }}>
              Seats
            </span>
            <input
              type="number"
              value={form.seats}
              onChange={(e) => setForm({ ...form, seats: e.target.value })}
              className="w-full px-3 py-2 text-sm outline-none"
              style={{
                border: `1px solid ${LINE}`,
                borderRadius: 3,
                backgroundColor: "white",
              }}
            />
          </label>
        </div>
        <label className="text-sm block mb-5">
          <span className="block mb-1 font-medium" style={{ color: INK }}>
            Daily rate (KES)
          </span>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="e.g. 5000"
            className="w-full px-3 py-2 text-sm outline-none"
            style={{
              border: `1px solid ${LINE}`,
              borderRadius: 3,
              backgroundColor: "white",
            }}
          />
        </label>
        {error && (
          <p className="text-sm mb-4" style={{ color: RED }}>
            {error}
          </p>
        )}
        <button
          disabled={!canSubmit}
          onClick={submit}
          className="w-full py-3 font-semibold text-sm flex items-center justify-center gap-2"
          style={{
            backgroundColor: canSubmit ? RED : LINE,
            color: canSubmit ? CARD : INK,
            opacity: canSubmit ? 1 : 0.5,
            borderRadius: 3,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? "Listing..." : "List this vehicle"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState("book");
  const [view, setView] = useState("browse");
  const [activeType, setActiveType] = useState("All");
  const [search, setSearch] = useState({
    pickup: todayISO(),
    ret: addDaysISO(todayISO(), 2),
  });
  const [selected, setSelected] = useState(null);
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    apiGet("/vehicles")
      .then(setVehicles)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () => vehicles.filter((v) => activeType === "All" || v.type === activeType),
    [vehicles, activeType]
  );

  return (
    <div
      style={{ backgroundColor: SAND, minHeight: "100vh" }}
      className="w-full font-sans"
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3"
        style={{ backgroundColor: INK }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center overflow-hidden shrink-0"
            style={{
              width: 48,
              height: 48,
              backgroundColor: "#FFFFFF",
              borderRadius: 8,
              padding: 3,
            }}
          >
            <img
              src={LOGO_MARK_SRC}
              alt="KD — KOLDrive Instant"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div
              className="font-semibold text-lg leading-tight"
              style={{ color: "#FFFFFF" }}
            >
              KOLDrive
            </div>
            <div
              className="text-[10px] sm:text-xs tracking-[0.28em] font-semibold leading-tight"
              style={{ color: "#4DA3FF" }}
            >
              INSTANT
            </div>
          </div>
        </div>
        <nav className="flex items-center gap-6">
          <button
            onClick={() => {
              setTab("book");
              setView("browse");
            }}
            className="text-sm font-medium pb-1"
            style={{
              color: tab === "book" ? GOLD : CARD,
              opacity: tab === "book" ? 1 : 0.6,
              borderBottom:
                tab === "book" ? `2px solid ${GOLD}` : "2px solid transparent",
            }}
          >
            Book a car
          </button>
          <button
            onClick={() => setTab("list")}
            className="text-sm font-medium pb-1"
            style={{
              color: tab === "list" ? GOLD : CARD,
              opacity: tab === "list" ? 1 : 0.6,
              borderBottom:
                tab === "list" ? `2px solid ${GOLD}` : "2px solid transparent",
            }}
          >
            List your vehicle
          </button>
        </nav>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto">
        {loadError && (
          <div
            className="p-4 mb-6 text-sm"
            style={{
              backgroundColor: RED + "1A",
              color: RED,
              borderRadius: 4,
            }}
          >
            Couldn't reach the backend at {API_BASE}. Make sure the server is
            running (see backend/README.md).
          </div>
        )}

        {tab === "book" && view === "browse" && (
          <>
            <section className="text-center mb-10 pt-4">
              <h1
                className="font-serif text-4xl mb-3"
                style={{ color: INK, lineHeight: 1.15 }}
              >
                Car hire in Narok, done simply.
              </h1>
              <p
                className="text-base mb-8 mx-auto"
                style={{ color: INK, opacity: 0.65, maxWidth: 480 }}
              >
                Pick your dates, choose a vehicle, and book directly with the
                owner — no call centre, no middleman.
              </p>

              <div
                className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto p-3"
                style={{
                  backgroundColor: CARD,
                  border: `1px solid ${LINE}`,
                  borderRadius: 6,
                }}
              >
                <label className="text-sm flex-1 text-left">
                  <span
                    className="block mb-1 font-medium"
                    style={{ color: INK }}
                  >
                    Pickup
                  </span>
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                      border: `1px solid ${LINE}`,
                      borderRadius: 3,
                      backgroundColor: "white",
                    }}
                  >
                    <Calendar size={14} style={{ opacity: 0.5 }} />
                    <input
                      type="date"
                      value={search.pickup}
                      min={todayISO()}
                      onChange={(e) =>
                        setSearch({ ...search, pickup: e.target.value })
                      }
                      className="w-full text-sm outline-none"
                      style={{ backgroundColor: "transparent" }}
                    />
                  </div>
                </label>
                <label className="text-sm flex-1 text-left">
                  <span
                    className="block mb-1 font-medium"
                    style={{ color: INK }}
                  >
                    Return
                  </span>
                  <div
                    className="flex items-center gap-2 px-3 py-2"
                    style={{
                      border: `1px solid ${LINE}`,
                      borderRadius: 3,
                      backgroundColor: "white",
                    }}
                  >
                    <Calendar size={14} style={{ opacity: 0.5 }} />
                    <input
                      type="date"
                      value={search.ret}
                      min={search.pickup}
                      onChange={(e) =>
                        setSearch({ ...search, ret: e.target.value })
                      }
                      className="w-full text-sm outline-none"
                      style={{ backgroundColor: "transparent" }}
                    />
                  </div>
                </label>
                <button
                  onClick={() =>
                    document
                      .getElementById("vehicle-list")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="px-6 py-2 text-sm font-semibold self-end"
                  style={{
                    backgroundColor: RED,
                    color: CARD,
                    borderRadius: 3,
                    height: 42,
                  }}
                >
                  Search
                </button>
              </div>

              <div className="flex items-center justify-center gap-8 mt-8 flex-wrap">
                {[
                  "No hidden fees",
                  "Pay deposit via M-Pesa",
                  "Book directly with owners",
                  "Narok Town & the Mara",
                ].map((item) => (
                  <span
                    key={item}
                    className="text-sm"
                    style={{ color: INK, opacity: 0.6 }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </section>

            <div
              id="vehicle-list"
              className="flex items-center gap-2 mb-2 flex-wrap"
            >
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveType(t)}
                  className="text-sm px-3 py-1.5 font-medium"
                  style={{
                    borderRadius: 3,
                    border: `1px solid ${activeType === t ? INK : LINE}`,
                    backgroundColor: activeType === t ? INK : "transparent",
                    color: activeType === t ? CARD : INK,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {loading ? (
              <p
                className="text-sm py-8 flex items-center gap-2"
                style={{ color: INK, opacity: 0.6 }}
              >
                <Loader2 size={16} className="animate-spin" /> Loading
                vehicles...
              </p>
            ) : (
              <>
                <p
                  className="text-xs mb-2"
                  style={{ color: INK, opacity: 0.5 }}
                >
                  {filtered.length} vehicles available
                </p>
                <div>
                  {filtered.map((v) => (
                    <VehicleRow
                      key={v.id}
                      v={v}
                      onSelect={(veh) => {
                        setSelected(veh);
                        setView("detail");
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {tab === "book" && view === "detail" && selected && (
          <BookingPanel
            vehicle={selected}
            initialPickup={search.pickup}
            initialRet={search.ret}
            onBack={() => setView("browse")}
            onConfirmed={(b) => {
              setBooking(b);
              setView("confirmed");
            }}
          />
        )}

        {tab === "book" && view === "confirmed" && booking && (
          <Confirmation
            booking={booking}
            onDone={() => {
              setView("browse");
              setSelected(null);
              setBooking(null);
            }}
          />
        )}

        {tab === "list" && (
          <ListVehicleForm
            onAdded={(veh) => setVehicles((prev) => [veh, ...prev])}
          />
        )}
      </main>

      {/* Footer */}
      <footer
        className="mt-16"
        style={{
          background: "linear-gradient(180deg, #101010 0%, #080808 100%)",
          color: "#FFFFFF",
          borderTop: `3px solid ${BLUE}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <div
                className="flex items-center justify-center mb-6"
                style={{
                  width: 170,
                  height: 82,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 8,
                  padding: 8,
                }}
              >
                <img
                  src={LOGO_SRC}
                  alt="KOLDrive INSTANT"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <h3
                className="text-lg font-semibold mb-3"
                style={{ color: "#2997FF" }}
              >
                Premium Mobility Solutions
              </h3>
              <p
                className="text-sm leading-7"
                style={{ color: "#B8C4D8", maxWidth: 420 }}
              >
                Reliable car hire and mobility solutions in Narok and the
                Maasai Mara. Choose your vehicle, make a booking, and connect
                directly with the vehicle owner.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3
                className="text-xl font-semibold mb-8"
                style={{ color: "#FFFFFF" }}
              >
                Quick Links
              </h3>
              <div className="flex flex-col gap-5">
                <button
                  onClick={() => {
                    setTab("book");
                    setView("browse");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-left text-sm transition-colors duration-200"
                  style={{ color: "#AEB9CB" }}
                >
                  Book a car
                </button>
                <button
                  onClick={() => {
                    setTab("list");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-left text-sm transition-colors duration-200"
                  style={{ color: "#AEB9CB" }}
                >
                  List your vehicle
                </button>
                <button
                  onClick={() => {
                    setTab("book");
                    setView("browse");
                    document
                      .getElementById("vehicle-list")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="text-left text-sm transition-colors duration-200"
                  style={{ color: "#AEB9CB" }}
                >
                  Our fleet
                </button>
                <a
                  href="mailto:info@koldrive.co.ke"
                  className="text-sm"
                  style={{ color: "#AEB9CB" }}
                >
                  Contact us
                </a>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3
                className="text-xl font-semibold mb-8"
                style={{ color: "#FFFFFF" }}
              >
                Contact
              </h3>
              <div className="space-y-7">
                <div>
                  <div
                    className="flex items-center gap-2 font-medium mb-2"
                    style={{ color: "#FFFFFF" }}
                  >
                    <MapPin size={18} color="#2997FF" />
                    Location
                  </div>
                  <p className="text-sm leading-6" style={{ color: "#AEB9CB" }}>
                    Narok Town
                    <br />
                    Narok County, Kenya
                    <br />
                    Near the Maasai Mara
                  </p>
                </div>
                <div>
                  <div
                    className="flex items-center gap-2 font-medium mb-2"
                    style={{ color: "#FFFFFF" }}
                  >
                    <Mail size={18} color="#2997FF" />
                    Email
                  </div>
                  <div className="flex flex-col gap-2">
                    <a
                      href="mailto:info@koldrive.co.ke"
                      className="text-sm"
                      style={{ color: "#AEB9CB" }}
                    >
                      info@koldrive.co.ke
                    </a>
                    <a
                      href="mailto:bookings@koldrive.co.ke"
                      className="text-sm"
                      style={{ color: "#AEB9CB" }}
                    >
                      bookings@koldrive.co.ke
                    </a>
                  </div>
                </div>
                <div>
                  <div
                    className="flex items-center gap-2 font-medium mb-2"
                    style={{ color: "#FFFFFF" }}
                  >
                    <Phone size={18} color="#2997FF" />
                    Phone
                  </div>
                  <div className="flex flex-col gap-2">
                    <a
                      href="tel:+254701390914"
                      className="text-sm"
                      style={{ color: "#AEB9CB" }}
                    >
                      +254 701 390 914
                    </a>
                    <a
                      href="tel:+254700000000"
                      className="text-sm"
                      style={{ color: "#AEB9CB" }}
                    >
                      +254 700 000 000
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div>
              <h3
                className="text-xl font-semibold mb-8"
                style={{ color: "#FFFFFF" }}
              >
                Working Hours
              </h3>
              <div className="space-y-5">
                <div className="flex gap-3">
                  <Clock3
                    size={20}
                    color="#2997FF"
                    className="shrink-0 mt-1"
                  />
                  <div>
                    <p className="text-sm mb-1" style={{ color: "#FFFFFF" }}>
                      Monday – Friday
                    </p>
                    <p className="text-sm" style={{ color: "#AEB9CB" }}>
                      08:00 AM – 09:00 PM
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock3
                    size={20}
                    color="#2997FF"
                    className="shrink-0 mt-1"
                  />
                  <div>
                    <p className="text-sm mb-1" style={{ color: "#FFFFFF" }}>
                      Saturday
                    </p>
                    <p className="text-sm" style={{ color: "#AEB9CB" }}>
                      09:00 AM – 07:00 PM
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock3
                    size={20}
                    color="#2997FF"
                    className="shrink-0 mt-1"
                  />
                  <div>
                    <p className="text-sm mb-1" style={{ color: "#FFFFFF" }}>
                      Sunday
                    </p>
                    <p className="text-sm" style={{ color: "#AEB9CB" }}>
                      Closed
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="mt-8 p-5"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(41,151,255,0.14), rgba(41,151,255,0.04))",
                  border: "1px solid rgba(41,151,255,0.35)",
                  borderRadius: 10,
                }}
              >
                <p
                  className="font-semibold text-sm leading-6"
                  style={{ color: "#2997FF" }}
                >
                  24/7 WhatsApp support
                  <br />
                  Available for bookings
                </p>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            className="mt-14 pt-7 flex flex-col md:flex-row items-center justify-between gap-4"
            style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
          >
            <p
              className="text-xs text-center md:text-left"
              style={{ color: "#718096" }}
            >
              © {new Date().getFullYear()} KOLDrive INSTANT. All rights
              reserved.
            </p>
            <p
              className="text-xs text-center md:text-right"
              style={{ color: "#718096" }}
            >
              Direct vehicle bookings • Narok & Maasai Mara
            </p>
          </div>
        </div>

        {/* Floating WhatsApp button */}
        <a
          href="https://wa.me/254701390914?text=Hello%20KOLDrive%20INSTANT%2C%20I%20would%20like%20to%20book%20a%20vehicle."
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Chat with KOLDrive on WhatsApp"
          className="fixed flex items-center justify-center shadow-xl transition-transform duration-200 hover:scale-110"
          style={{
            right: 28,
            bottom: 28,
            width: 64,
            height: 64,
            borderRadius: "50%",
            backgroundColor: "#25D366",
            color: "#FFFFFF",
            zIndex: 50,
          }}
        >
          <MessageCircle size={34} strokeWidth={2.2} />
        </a>
      </footer>
    </div>
  );
}