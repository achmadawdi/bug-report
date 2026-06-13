import { neon } from '@neondatabase/serverless';
import { parseSchemaStatements, SCHEMA_SQL } from '../src/lib/server/db/schema.js';

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const sql = neon(databaseUrl);

for (const statement of parseSchemaStatements(SCHEMA_SQL)) {
	await sql.query(statement, []);
}

console.log('Database schema applied successfully.');
