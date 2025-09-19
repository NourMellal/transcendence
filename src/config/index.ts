import { config } from 'dotenv';

config();

export const env = {
  PORT: process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'sqlite.db',
  FORTY_TWO_CLIENT_ID: process.env.FORTY_TWO_CLIENT_ID!,
  FORTY_TWO_CLIENT_SECRET: process.env.FORTY_TWO_CLIENT_SECRET!,
  FORTY_TWO_REDIRECT_URI: process.env.FORTY_TWO_REDIRECT_URI!,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads'
};
