const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "123456789", "1234567890",
  "qwerty", "abc123", "password1", "111111", "iloveyou",
  "admin", "letmein", "welcome", "monkey", "dragon",
  "master", "login", "princess", "passw0rd", "shadow",
  "sunshine", "trustno1", "football", "baseball", "superman",
  "michael", "654321", "password123", "qwerty123", "admin123",
]);

const MIN_LENGTH = 8;

/**
 * Validates a password against policy rules.
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password) {
  if (typeof password !== "string" || !password) {
    return { valid: false, error: "Password is required" };
  }

  if (password.length < MIN_LENGTH) {
    return { valid: false, error: `Password must be at least ${MIN_LENGTH} characters` };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one lowercase letter" };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: "Password must contain at least one uppercase letter" };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, error: "Password must contain at least one digit" };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { valid: false, error: "This password is too common. Please choose a different one" };
  }

  return { valid: true };
}

module.exports = { validatePassword, MIN_LENGTH };
