// M-Pesa Daraja integration — STK Push (Lipa Na M-Pesa Online).
//
// Required environment variables (see .env.example):
//   MPESA_ENV                sandbox | production   (defaults to sandbox)
//   MPESA_CONSUMER_KEY       from your Daraja app dashboard
//   MPESA_CONSUMER_SECRET    from your Daraja app dashboard
//   MPESA_SHORTCODE          174379 for the shared sandbox shortcode
//   MPESA_PASSKEY            from your Daraja sandbox app dashboard
//   MPESA_CALLBACK_URL       a PUBLIC https URL Safaricom can reach (see README)
//
// Get sandbox credentials at https://developer.safaricom.co.ke

const axios = require("axios");

function baseUrl() {
  return process.env.MPESA_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

function timestampNow() {
  // Format required by Daraja: yyyymmddhhiiss
  return new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
}

function normalizePhone(phone) {
  // Accepts 07xx xxx xxx, 7xx xxx xxx, or 2547xx xxx xxx and returns 2547xxxxxxxx
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return "254" + digits.slice(1);
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits;
  return digits;
}

let cachedToken = null;
let cachedTokenExpiry = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) return cachedToken;

  const { MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET } = process.env;
  if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
    throw new Error("MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET are not set in .env");
  }

  const credentials = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString("base64");
  const res = await axios.get(
    `${baseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  cachedToken = res.data.access_token;
  // Token lasts ~3599s; refresh a little early to be safe.
  cachedTokenExpiry = now + (parseInt(res.data.expires_in, 10) - 60) * 1000;
  return cachedToken;
}

/**
 * Initiate an STK Push prompt on the customer's phone.
 * @param {Object} opts
 * @param {string} opts.phone - customer phone, any common format (07xx, 2547xx, etc.)
 * @param {number} opts.amount - amount in KES (whole number)
 * @param {string} opts.accountReference - shown on the STK screen, max 12 chars
 * @param {string} opts.transactionDesc - short description, max 13 chars
 * @returns {Promise<Object>} Daraja's response, including CheckoutRequestID
 */
async function stkPush({ phone, amount, accountReference, transactionDesc }) {
  const { MPESA_SHORTCODE, MPESA_PASSKEY, MPESA_CALLBACK_URL } = process.env;
  if (!MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL) {
    throw new Error("MPESA_SHORTCODE / MPESA_PASSKEY / MPESA_CALLBACK_URL are not set in .env");
  }

  const accessToken = await getAccessToken();
  const timestamp = timestampNow();
  const password = Buffer.from(MPESA_SHORTCODE + MPESA_PASSKEY + timestamp).toString("base64");
  const partyPhone = normalizePhone(phone);

  const payload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(amount),
    PartyA: partyPhone,
    PartyB: MPESA_SHORTCODE,
    PhoneNumber: partyPhone,
    CallBackURL: MPESA_CALLBACK_URL,
    AccountReference: (accountReference || "NarokCarHire").slice(0, 12),
    TransactionDesc: (transactionDesc || "Car hire deposit").slice(0, 13),
  };

  const res = await axios.post(
    `${baseUrl()}/mpesa/stkpush/v1/processrequest`,
    payload,
    { headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" } }
  );

  return res.data; // includes MerchantRequestID, CheckoutRequestID, ResponseCode
}

/**
 * Parse the callback Safaricom POSTs to MPESA_CALLBACK_URL after the customer
 * completes or cancels the prompt. Returns a simplified, consistent shape
 * regardless of success or failure.
 */
function parseCallback(body) {
  const callback = body?.Body?.stkCallback;
  if (!callback) return null;

  const result = {
    merchantRequestId: callback.MerchantRequestID,
    checkoutRequestId: callback.CheckoutRequestID,
    resultCode: callback.ResultCode,
    resultDesc: callback.ResultDesc,
    success: callback.ResultCode === 0,
  };

  if (result.success && callback.CallbackMetadata?.Item) {
    for (const item of callback.CallbackMetadata.Item) {
      if (item.Name === "Amount") result.amount = item.Value;
      if (item.Name === "MpesaReceiptNumber") result.mpesaReceiptNumber = item.Value;
      if (item.Name === "TransactionDate") result.transactionDate = item.Value;
      if (item.Name === "PhoneNumber") result.phoneNumber = item.Value;
    }
  }

  return result;
}

module.exports = { stkPush, parseCallback, normalizePhone };
