import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSql } from './client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'schema.sql');

let migrated = false;

export async function runMigrations(): Promise<void> {
	if (migrated) return;

	const sql = getSql();
	const schema = readFileSync(schemaPath, 'utf-8');
	const statements = schema
		.split(';')
		.map((s) => s.trim())
		.filter((s) => s.length > 0 && !s.startsWith('--'));

	for (const statement of statements) {
		await sql.query(statement, []);
	}

	migrated = true;
}
