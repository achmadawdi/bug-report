import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from './$types.js';
import { getVercelTmpEvidencePath } from '$lib/server/storage/local.js';
import { isValidSlug } from '$lib/server/store.js';

const MIME_BY_EXT: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.gif': 'image/gif',
	'.webp': 'image/webp',
	'.avif': 'image/avif',
	'.svg': 'image/svg+xml',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mov': 'video/quicktime',
	'.ogg': 'video/ogg',
	'.m4v': 'video/mp4'
};

export const GET: RequestHandler = async ({ params }) => {
	const { project, filename } = params;

	if (!isValidSlug(project) || !filename || filename.includes('..') || filename.includes('/')) {
		error(400, 'Invalid evidence path');
	}

	const ext = path.extname(filename).toLowerCase();
	const contentType = MIME_BY_EXT[ext];
	if (!contentType) {
		error(415, 'Unsupported evidence file type');
	}

	try {
		const data = await readFile(getVercelTmpEvidencePath(project, filename));
		return new Response(data, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=3600'
			}
		});
	} catch {
		// fall through to 404
	}

	error(404, 'Evidence file not found');
};
