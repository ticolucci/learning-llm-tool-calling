import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './lib/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: 'file:./database.db',
  },
});
