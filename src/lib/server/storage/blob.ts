import { del, list, put } from '@vercel/blob';
import { isLocalEvidencePath } from '$lib/evidence.js';
import { createLocalStorage } from './local.js';
import { getBundledSeedProjects } from './seed.js';
import type { ProjectStorage } from './types.js';

const REPORT_PREFIX = 'projects';
const EVIDENCE_PREFIX = 'evidence';

function reportPathname(project: string) {
	return `${REPORT_PREFIX}/${project}/report.json`;
}

function evidencePathname(project: string, filename: string) {
	return `${EVIDENCE_PREFIX}/${project}/${filename}`;
}

function isBlobUrl(src: string): boolean {
	return src.startsWith('https://') && src.includes('blob.vercel-storage.com');
}

async function listReportPathnames(): Promise<string[]> {
	const pathnames: string[] = [];
	let cursor: string | undefined;

	do {
		const result = await list({
			prefix: `${REPORT_PREFIX}/`,
			cursor,
			limit: 1000
		});

		for (const blob of result.blobs) {
			if (blob.pathname.endsWith('/report.json')) {
				pathnames.push(blob.pathname);
			}
		}

		cursor = result.hasMore ? result.cursor : undefined;
	} while (cursor);

	return pathnames;
}

function slugFromReportPathname(pathname: string): string | null {
	const match = pathname.match(/^projects\/([^/]+)\/report\.json$/);
	return match?.[1] ?? null;
}

async function readBlobText(pathname: string): Promise<string | null> {
	const result = await list({ prefix: pathname, limit: 1 });
	const blob = result.blobs.find((entry) => entry.pathname === pathname);
	if (!blob) return null;

	const response = await fetch(blob.url);
	if (!response.ok) return null;
	return response.text();
}

async function seedFromBundledData(storage: ProjectStorage): Promise<void> {
	const seeds = getBundledSeedProjects();
	if (seeds.length === 0) return;

	for (const { slug, json } of seeds) {
		if (await storage.reportExists(slug)) continue;
		await storage.writeReportJson(slug, json);
	}
}

export function createBlobStorage(token: string): ProjectStorage {
	const localFallback = createLocalStorage();
	let seeded = false;

	async function ensureSeeded(storage: ProjectStorage) {
		if (seeded) return;
		seeded = true;

		const existing = await listReportPathnames();
		if (existing.length > 0) return;

		await seedFromBundledData(storage);
	}

	return {
		async ensureReady() {
			await ensureSeeded(this);
		},

		async listProjectSlugs() {
			await this.ensureReady();
			const pathnames = await listReportPathnames();
			const slugs = pathnames
				.map(slugFromReportPathname)
				.filter((slug): slug is string => slug != null);
			return [...new Set(slugs)].sort();
		},

		async readReportJson(project) {
			await this.ensureReady();
			const json = await readBlobText(reportPathname(project));
			if (json == null) {
				throw new Error(`Project "${project}" not found`);
			}
			return json;
		},

		async writeReportJson(project, json) {
			await put(reportPathname(project), json, {
				access: 'public',
				contentType: 'application/json',
				addRandomSuffix: false,
				allowOverwrite: true,
				token
			});
		},

		async reportExists(project) {
			await this.ensureReady();
			const json = await readBlobText(reportPathname(project));
			return json != null;
		},

		async saveEvidenceFile(project, filename, data, contentType) {
			const pathname = evidencePathname(project, filename);
			const blob = await put(pathname, data, {
				access: 'public',
				contentType: contentType || 'application/octet-stream',
				addRandomSuffix: false,
				allowOverwrite: true,
				token
			});
			return blob.url;
		},

		async deleteEvidenceBySrc(src, project) {
			if (isBlobUrl(src)) {
				try {
					await del(src, { token });
				} catch {
					// ignore missing blobs
				}
				return;
			}

			if (isLocalEvidencePath(src)) {
				await localFallback.deleteEvidenceBySrc(src, project);
			}
		}
	};
}
