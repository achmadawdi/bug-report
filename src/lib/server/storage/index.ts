import { env } from '$env/dynamic/private';
import { createBlobStorage } from './blob.js';
import { createLocalStorage } from './local.js';
import type { ProjectStorage } from './types.js';

let storage: ProjectStorage | undefined;

function isVercelRuntime(): boolean {
	return env.VERCEL === '1' || Boolean(env.VERCEL_ENV);
}

function missingBlobTokenError(): Error {
	return new Error(
		'BLOB_READ_WRITE_TOKEN is not configured. In the Vercel project dashboard, open Storage → Blob, create or connect a store to this project, then redeploy.'
	);
}

export function getStorage(): ProjectStorage {
	if (storage) return storage;

	const token = env.BLOB_READ_WRITE_TOKEN;

	if (token) {
		storage = createBlobStorage(token);
	} else if (isVercelRuntime()) {
		throw missingBlobTokenError();
	} else {
		storage = createLocalStorage();
	}

	return storage;
}

export function useBlobStorage(): boolean {
	return Boolean(env.BLOB_READ_WRITE_TOKEN) || isVercelRuntime();
}
