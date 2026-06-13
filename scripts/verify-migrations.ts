const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

process.env.DATABASE_URL = databaseUrl;

const { runMigrations } = await import('../src/lib/server/db/migrate.js');

console.log('Running migrations (pass 1)...');
await runMigrations();

// Reset in-process cache so pass 2 exercises the ledger, not the module singleton.
const migrateModule = await import('../src/lib/server/db/migrate.js');
if ('resetMigrationsForTests' in migrateModule) {
	(migrateModule as { resetMigrationsForTests: () => void }).resetMigrationsForTests();
}

console.log('Running migrations (pass 2)...');
await runMigrations();

console.log('Migration ledger idempotency check passed.');
