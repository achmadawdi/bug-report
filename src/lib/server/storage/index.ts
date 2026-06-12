import { env } from '$env/dynamic/private';
import { createBlobStorage } from './blob.js';
import { createLocalStorage } from './local.js';
import type { ProjectStorage } from './types.js';

let storage: ProjectStorage | undefined;

export function getStorage(): ProjectStorage {
	if (storage) return storage;

	if (env.BLOB_READ_WRITE_TOKEN) {
		storage = createBlobStorage(env.BLOB_READ_WRITE_TOKEN);
	} else {
		storage = createLocalStorage();
	}

	return storage;
}

export function useBlobStorage(): boolean {
	return Boolean(env.BLOB_READ_WRITE_TOKEN);
}
