import { env } from '$env/dynamic/private';

export type BlobAuth = {
	token?: string;
	storeId?: string;
	oidcToken?: string;
};

function readEnv(name: string): string | undefined {
	const value = (env as Record<string, string | undefined>)[name] ?? process.env[name];
	return value?.trim() || undefined;
}

export function getBlobAuth(): BlobAuth {
	const token = readEnv('BLOB_READ_WRITE_TOKEN');
	const storeId = readEnv('BLOB_STORE_ID');
	const oidcToken = readEnv('VERCEL_OIDC_TOKEN');

	if (storeId) {
		// OIDC is preferred on Vercel when VERCEL_OIDC_TOKEN is present; token is a fallback.
		return {
			storeId,
			...(oidcToken ? { oidcToken } : {}),
			...(token ? { token } : {})
		};
	}

	if (token) {
		return { token };
	}

	return {};
}

export function canUseBlobStorage(): boolean {
	const auth = getBlobAuth();
	return Boolean(auth.token || auth.storeId);
}

export function blobCommandOptions(auth: BlobAuth): BlobAuth {
	const options: BlobAuth = {};
	if (auth.token) options.token = auth.token;
	if (auth.storeId) options.storeId = auth.storeId;
	if (auth.oidcToken) options.oidcToken = auth.oidcToken;
	return options;
}
