#!/usr/bin/env tsx
/**
 * Database migration script
 * Runs migrations against local SQLite database
 *
 * Usage:
 *   npm run db:migrate
 *   tsx lib/migrate.ts
 */

import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  console.log('Database: Local SQLite (database.db)');

  // Create client for local SQLite
  const client = createClient({
    url: 'file:./database.db',
  });

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
