import { getSql } from './client.js';
import { parseSchemaStatements, SCHEMA_SQL } from './schema.js';

let migrated = false;

export async function runMigrations(): Promise<void> {
	if (migrated) return;

	const sql = getSql();

	for (const statement of parseSchemaStatements(SCHEMA_SQL)) {
		await sql.query(statement, []);
	}

	migrated = true;
}
