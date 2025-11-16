/**
 * Database test helpers
 * Provides in-memory SQLite database for testing
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '../schema';

/**
 * Creates an in-memory SQLite database for testing
 * This is isolated per test and automatically cleaned up
 */
export async function createTestDb() {
  // Create in-memory client
  const client = createClient({
    url: ':memory:',
  });

  // Create drizzle instance
  const db = drizzle(client, { schema });

  // Run migrations to set up schema
  await migrate(db, { migrationsFolder: './drizzle/migrations' });

  return { db, client };
}

/**
 * Cleanup helper for test database
 */
export async function cleanupTestDb(client: ReturnType<typeof createClient>) {
  await client.close();
}
