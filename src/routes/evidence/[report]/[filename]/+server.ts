import { redirect } from '@sveltejs/kit';
import path from 'node:path';
import type { RequestHandler } from './$types.js';
import { getPublicEvidenceUrl } from '$lib/server/storage/r2.js';
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
	const { report, filename } = params;

	if (!isValidSlug(report) || !filename || filename.includes('..') || filename.includes('/')) {
		return new Response('Invalid evidence path', { status: 400 });
	}

	const ext = path.extname(filename).toLowerCase();
	if (!MIME_BY_EXT[ext]) {
		return new Response('Unsupported evidence file type', { status: 415 });
	}

	const url = getPublicEvidenceUrl(report, filename);
	redirect(302, url);
};
