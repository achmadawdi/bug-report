import { deserialize } from '$app/forms';
import type { ActionResult } from '@sveltejs/kit';
import type { PendingEvidenceItem } from '$lib/evidence.js';
import {
	detectMediaTypeFromFile,
	detectMediaTypeFromUrl,
	isAllowedEvidenceFile
} from '$lib/evidence.js';
import type { Issue, ReportView } from '$lib/types.js';

async function postAction<T extends Record<string, unknown>>(
	action: string,
	data: FormData
): Promise<ActionResult<T>> {
	const response = await fetch(`?/${action}`, {
		method: 'POST',
		body: data
	});

	return deserialize(await response.text()) as ActionResult<T>;
}

export async function uploadEvidenceFile(
	issueId: string,
	file: File,
	caption?: string
): Promise<ReportView | null> {
	const formData = new FormData();
	formData.set('id', issueId);
	formData.set('file', file);
	if (caption) formData.set('caption', caption);

	const result = await postAction<{ report?: ReportView; message?: string }>('uploadEvidence', formData);

	if (result.type === 'failure' || result.type === 'error') {
		throw new Error(
			(result.type === 'failure' ? result.data?.message : undefined) ?? 'Failed to upload evidence'
		);
	}

	if (result.type !== 'success') return null;

	return result.data?.report ?? null;
}

export async function addEvidenceUrl(
	issueId: string,
	url: string,
	type: 'image' | 'video',
	caption?: string
): Promise<ReportView | null> {
	const formData = new FormData();
	formData.set('id', issueId);
	formData.set('url', url);
	formData.set('type', type);
	if (caption) formData.set('caption', caption);

	const result = await postAction<{ report?: ReportView; message?: string }>('addEvidenceUrl', formData);

	if (result.type === 'failure' || result.type === 'error') {
		throw new Error(
			(result.type === 'failure' ? result.data?.message : undefined) ??
				'Failed to add evidence URL'
		);
	}

	if (result.type !== 'success') return null;

	return result.data?.report ?? null;
}

export async function flushPendingEvidence(
	issueId: string,
	pending: PendingEvidenceItem[]
): Promise<Issue | null> {
	let report: ReportView | null = null;

	for (const item of pending) {
		if (item.kind === 'file') {
			report = await uploadEvidenceFile(issueId, item.file, item.caption);
		} else {
			report = await addEvidenceUrl(issueId, item.url, item.type, item.caption);
		}
	}

	return report?.issues.find((issue) => issue.id === issueId) ?? null;
}

export function validatePendingFile(file: File): string | null {
	if (!isAllowedEvidenceFile(file)) {
		return 'Unsupported file type or file is too large (max 10MB).';
	}

	if (!detectMediaTypeFromFile(file)) {
		return 'Could not determine media type.';
	}

	return null;
}

export function validatePendingUrl(
	url: string,
	typeOverride: 'image' | 'video' | 'auto'
): { type: 'image' | 'video' } | { error: string } {
	try {
		new URL(url);
	} catch {
		return { error: 'Invalid URL.' };
	}

	const type =
		typeOverride === 'auto' ? detectMediaTypeFromUrl(url) : typeOverride;

	if (!type) {
		return { error: 'Could not detect media type. Select image or video manually.' };
	}

	return { type };
}
