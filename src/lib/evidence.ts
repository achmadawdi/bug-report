import type { EvidenceMedia, EvidenceMediaType } from './types.js';

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp', '.svg'];
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.ogg', '.m4v'];

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg']);

export const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024;

export function detectMediaTypeFromUrl(url: string): EvidenceMediaType | null {
	try {
		const pathname = new URL(url).pathname.toLowerCase();

		if (IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'image';
		if (VIDEO_EXTENSIONS.some((ext) => pathname.endsWith(ext))) return 'video';
	} catch {
		const lower = url.toLowerCase();
		if (IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'image';
		if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return 'video';
	}

	return null;
}

export function detectMediaTypeFromFile(file: File): EvidenceMediaType | null {
	if (IMAGE_MIME_TYPES.has(file.type)) return 'image';
	if (VIDEO_MIME_TYPES.has(file.type)) return 'video';

	const detected = detectMediaTypeFromUrl(file.name);
	return detected;
}

export function isAllowedEvidenceFile(file: File): boolean {
	return detectMediaTypeFromFile(file) !== null && file.size <= MAX_EVIDENCE_FILE_SIZE;
}

export function isLocalEvidencePath(src: string): boolean {
	return src.startsWith('/evidence/');
}

export function getEvidencePreviewItems(media: EvidenceMedia[] | undefined, limit = 3): EvidenceMedia[] {
	return (media ?? []).slice(0, limit);
}

export function hasEvidenceContent(issue: {
	evidence?: string;
	evidence_media?: EvidenceMedia[];
}): boolean {
	return Boolean(issue.evidence?.trim()) || (issue.evidence_media?.length ?? 0) > 0;
}
