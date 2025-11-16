#!/usr/bin/env tsx
/**
 * Database migration script
 * Automatically detects environment and runs migrations
 *
 * Usage:
 *   npm run db:migrate
 *   tsx lib/migrate.ts
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

async function runMigrations() {
  const isTurso =
    !!process.env.TURSO_DATABASE_URL && !!process.env.TURSO_AUTH_TOKEN;

  console.log('🔄 Running database migrations...');
  console.log(`Environment: ${isTurso ? 'Turso (cloud)' : 'Local SQLite'}`);

  // Create client
  const client = createClient(
    isTurso
      ? {
          url: process.env.TURSO_DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN!,
        }
      : {
          url: 'file:./database.db',
        }
  );

  const db = drizzle(client);

  try {
    // Run migrations from the drizzle/migrations folder
    await migrate(db, { migrationsFolder: './drizzle/migrations' });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

runMigrations();
