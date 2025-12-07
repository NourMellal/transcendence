// Remove JWT_SECRET from config since it's shared
export const config = {
  // Server
  server: {
    port: parseInt(process.env.PORT || '3003'),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },

  // Database
  database: {
    path: process.env.DATABASE_PATH || './data/chat.db'
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  },

  // Rate Limiting
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '1 minute'
  }
};
