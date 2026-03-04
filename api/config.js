require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || './db/database.sqlite',
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_key',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || 'your_refresh_token_secret',
  internalApiKey: process.env.INTERNAL_API_KEY || 'default_internal_key',
};

module.exports = config;