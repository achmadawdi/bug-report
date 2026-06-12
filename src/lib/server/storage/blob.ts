import { del, list, put, type PutCommandOptions } from '@vercel/blob';
import { isLocalEvidencePath } from '$lib/evidence.js';
import { blobCommandOptions, type BlobAuth } from './blob-auth.js';
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

export function createBlobStorage(auth: BlobAuth): ProjectStorage {
	const localFallback = createLocalStorage();
	const commandAuth = blobCommandOptions(auth);
	let seeded = false;

	async function listReportPathnames(): Promise<string[]> {
		const pathnames: string[] = [];
		let cursor: string | undefined;

		do {
			const result = await list({
				prefix: `${REPORT_PREFIX}/`,
				cursor,
				limit: 1000,
				...commandAuth
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

	async function readBlobText(pathname: string): Promise<string | null> {
		const result = await list({ prefix: pathname, limit: 1, ...commandAuth });
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

	async function ensureSeeded(storage: ProjectStorage) {
		if (seeded) return;
		seeded = true;

		const existing = await listReportPathnames();
		if (existing.length > 0) return;

		await seedFromBundledData(storage);
	}

	const putOptions = {
		access: 'public',
		addRandomSuffix: false,
		allowOverwrite: true,
		...commandAuth
	} satisfies Partial<PutCommandOptions>;

	return {
		async ensureReady() {
			await ensureSeeded(this);
		},

		async listProjectSlugs() {
			await this.ensureReady();
			const pathnames = await listReportPathnames();
			const slugs = pathnames
				.map((pathname) => pathname.match(/^projects\/([^/]+)\/report\.json$/)?.[1] ?? null)
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
				...putOptions,
				contentType: 'application/json'
			});
		},

		async reportExists(project) {
			await this.ensureReady();
			const json = await readBlobText(reportPathname(project));
			return json != null;
		},

		async saveEvidenceFile(project, filename, data, contentType) {
			const blob = await put(evidencePathname(project, filename), data, {
				...putOptions,
				contentType: contentType || 'application/octet-stream'
			});
			return blob.url;
		},

		async deleteEvidenceBySrc(src, project) {
			if (isBlobUrl(src)) {
				try {
					await del(src, commandAuth);
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
