import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

export default {
  schema: './shared/database/schema/*.ts',
  out: './shared/database/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://gymdeck_user:gymdeck_password@localhost:5432/gymdeck_cloud',
  },
  verbose: true,
  strict: true,
} satisfies Config;
