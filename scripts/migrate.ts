import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, '../src/lib/server/db/schema.sql');

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
	console.error('DATABASE_URL is not set.');
	process.exit(1);
}

const sql = neon(databaseUrl);
const schema = readFileSync(schemaPath, 'utf-8');

const statements = schema
	.split(';')
	.map((s) => s.trim())
	.filter((s) => s.length > 0 && !s.startsWith('--'));

	for (const statement of statements) {
		await sql.query(statement, []);
	}

console.log('Database schema applied successfully.');
