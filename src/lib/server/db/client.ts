import { neon } from '@neondatabase/serverless';
import { readPrivateEnv } from '$lib/server/env.js';

let sql: ReturnType<typeof neon> | undefined;

function requireDatabaseUrl(): string {
	const url = readPrivateEnv('DATABASE_URL');
	if (!url) {
		throw new Error(
			'DATABASE_URL is not set. Add your Neon PostgreSQL connection string to .env (see .env.example).'
		);
	}
	return url;
}

export function getSql() {
	if (!sql) {
		sql = neon(requireDatabaseUrl());
	}
	return sql;
}
