import { env } from '$env/dynamic/private';
import { canUseBlobStorage, getBlobAuth } from './blob-auth.js';
import { createBlobStorage } from './blob.js';
import { createLocalStorage } from './local.js';
import type { ProjectStorage } from './types.js';

let storage: ProjectStorage | undefined;

function isVercelRuntime(): boolean {
	return env.VERCEL === '1' || Boolean(env.VERCEL_ENV);
}

export function getStorage(): ProjectStorage {
	if (storage) return storage;

	if (canUseBlobStorage()) {
		storage = createBlobStorage(getBlobAuth());
	} else if (isVercelRuntime()) {
		// Writable but ephemeral; connect a Blob store for durable production data.
		storage = createLocalStorage({
			projectsDir: '/tmp/bug-report/data/projects',
			evidenceRoot: '/tmp/bug-report/static/evidence',
			seedFromBundled: true,
			runLegacyMigration: false
		});
	} else {
		storage = createLocalStorage();
	}

	return storage;
}

export function useBlobStorage(): boolean {
	return canUseBlobStorage();
}

export function useEphemeralVercelStorage(): boolean {
	return isVercelRuntime() && !canUseBlobStorage();
}
