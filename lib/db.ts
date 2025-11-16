import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

/**
 * Database client singleton
 * Uses local SQLite database for development and learning
 */

// Create libsql client for local SQLite
const client = createClient({
  url: 'file:./database.db',
});

// Log connection info in development
if (process.env.NODE_ENV === 'development') {
  console.log('[Database] Connected to local SQLite file: database.db');
}

// Export Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export client for direct access if needed
export { client };
