import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

// Bootstrap client before runMigrations uses getSql()
process.env.DATABASE_URL = databaseUrl;

const { runMigrations } = await import('../src/lib/server/db/migrate.js');

await runMigrations();

console.log('Database schema applied successfully.');
