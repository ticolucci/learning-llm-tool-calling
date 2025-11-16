import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * Database client singleton
 * Automatically connects to Turso (cloud) or local SQLite based on environment variables
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTurso =
  !!process.env.TURSO_DATABASE_URL && !!process.env.TURSO_AUTH_TOKEN;

// Create libsql client
const client = createClient(
  isTurso
    ? {
        // Production/CI: Connect to Turso
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!,
      }
    : {
        // Local development: Use local SQLite file
        url: 'file:./database.db',
      }
);

// Log connection type for debugging
if (isDevelopment) {
  console.log(
    `[Database] Connected to ${isTurso ? 'Turso (cloud)' : 'local SQLite file'}`
  );
}

// Export Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export client for direct access if needed
export { client };
