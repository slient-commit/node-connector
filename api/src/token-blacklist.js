const jwt = require("jsonwebtoken");

// In-memory blacklist — tokens auto-expire so entries are cleaned up periodically
const blacklist = new Map();

const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

function add(token) {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      blacklist.set(token, decoded.exp * 1000);
    }
  } catch {
    // If token can't be decoded, nothing to blacklist
  }
}

function isBlacklisted(token) {
  return blacklist.has(token);
}

// Remove expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, expiresAt] of blacklist) {
    if (expiresAt <= now) {
      blacklist.delete(token);
    }
  }
}, CLEANUP_INTERVAL).unref();

module.exports = { add, isBlacklisted };
