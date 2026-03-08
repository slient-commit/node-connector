const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const crypto = require('crypto');

function requiredSecret(envVar, name) {
  const value = process.env[envVar];
  if (value) return value;
  // In production, secrets must be set explicitly
  if (process.env.NODE_ENV === 'production') {
    console.error(`ERROR: ${envVar} environment variable is required in production.`);
    process.exit(1);
  }
  // In development, generate a random secret and warn
  const generated = crypto.randomBytes(32).toString('hex');
  console.warn(`WARNING: ${envVar} not set. Generated random ${name} for this session. Set it in .env for persistence.`);
  return generated;
}

const config = {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || './db/database.sqlite',
  jwtSecret: requiredSecret('JWT_SECRET', 'JWT secret'),
  refreshTokenSecret: requiredSecret('REFRESH_TOKEN_SECRET', 'refresh token secret'),
  internalApiKey: requiredSecret('INTERNAL_API_KEY', 'internal API key'),
  encryptionKey: requiredSecret('ENCRYPTION_KEY', 'encryption key'),
};

module.exports = config;
