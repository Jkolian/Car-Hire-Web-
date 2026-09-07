// Single import point for the rest of the app. Picks the storage backend
// based on whether DATABASE_URL is set — nothing else in the codebase needs
// to know or care which one is active.
if (process.env.DATABASE_URL) {
  console.log("Data store: Postgres (DATABASE_URL is set)");
  module.exports = require("./postgres-store");
} else {
  console.log("Data store: local JSON files (set DATABASE_URL to switch to Postgres)");
  module.exports = require("./json-store");
}
