type EnvRecord = Record<string, string | undefined>;

let kitEnv: EnvRecord = {};

try {
	const mod = await import('$env/dynamic/private');
	kitEnv = mod.env;
} catch {
	// Outside SvelteKit (e.g. bun scripts) — use process.env only.
}

/** Read a server-only env var (SvelteKit `.env`; falls back to process.env for scripts). */
export function readPrivateEnv(name: string): string {
	return kitEnv[name]?.trim() || process.env[name]?.trim() || '';
}
