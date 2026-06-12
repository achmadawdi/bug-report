import {
	copyFile,
	mkdir,
	readdir,
	readFile,
	rename,
	unlink,
	writeFile
} from 'node:fs/promises';
import path from 'node:path';
import type { ReportData } from '$lib/types.js';
import { reportDataSchema } from '$lib/types.js';
import { isLocalEvidencePath } from '$lib/evidence.js';
import type { ProjectStorage } from './types.js';

const PROJECTS_DIR = path.resolve('data/projects');
const LEGACY_REPORT_PATH = path.resolve('data/report.json');
const LEGACY_EVIDENCE_DIR = path.resolve('static/evidence');
const EVIDENCE_ROOT = path.resolve('static/evidence');
const LEGACY_MIGRATION_SLUG = 'gauntlet-minigames';

function getProjectPaths(project: string) {
	return {
		projectDir: path.join(PROJECTS_DIR, project),
		reportPath: path.join(PROJECTS_DIR, project, 'report.json'),
		evidenceDir: path.join(EVIDENCE_ROOT, project)
	};
}

async function fileExists(filePath: string): Promise<boolean> {
	try {
		await readFile(filePath);
		return true;
	} catch {
		return false;
	}
}

function rewriteEvidencePaths(data: ReportData, project: string): ReportData {
	return {
		...data,
		issues: data.issues.map((issue) => ({
			...issue,
			evidence_media: (issue.evidence_media ?? []).map((media) => {
				if (!isLocalEvidencePath(media.src)) return media;

				const filename = path.basename(media.src);
				const prefixed = `/evidence/${project}/${filename}`;
				if (media.src === prefixed) return media;

				return { ...media, src: prefixed };
			})
		}))
	};
}

async function migrateLegacyEvidence(project: string): Promise<void> {
	const { evidenceDir } = getProjectPaths(project);

	try {
		const entries = await readdir(LEGACY_EVIDENCE_DIR, { withFileTypes: true });
		const files = entries.filter((entry) => entry.isFile());

		if (files.length === 0) return;

		await mkdir(evidenceDir, { recursive: true });

		for (const file of files) {
			const source = path.join(LEGACY_EVIDENCE_DIR, file.name);
			const destination = path.join(evidenceDir, file.name);
			try {
				await copyFile(source, destination);
				await unlink(source);
			} catch {
				// ignore individual file migration failures
			}
		}
	} catch {
		// legacy evidence directory may not exist
	}
}

async function writeReportFile(project: string, json: string): Promise<void> {
	const { projectDir, reportPath } = getProjectPaths(project);
	await mkdir(projectDir, { recursive: true });

	const tempPath = `${reportPath}.${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
	await writeFile(tempPath, json, 'utf-8');
	await rename(tempPath, reportPath);
}

async function migrateLegacyReport(): Promise<void> {
	if (!(await fileExists(LEGACY_REPORT_PATH))) return;

	const { reportPath } = getProjectPaths(LEGACY_MIGRATION_SLUG);
	if (await fileExists(reportPath)) return;

	const raw = await readFile(LEGACY_REPORT_PATH, 'utf-8');
	const parsed = reportDataSchema.parse(JSON.parse(raw));
	const migrated = rewriteEvidencePaths(parsed, LEGACY_MIGRATION_SLUG);

	await writeReportFile(LEGACY_MIGRATION_SLUG, `${JSON.stringify(migrated, null, 2)}\n`);
	await migrateLegacyEvidence(LEGACY_MIGRATION_SLUG);

	try {
		await unlink(LEGACY_REPORT_PATH);
	} catch {
		// ignore if legacy file cannot be removed
	}
}

export function createLocalStorage(): ProjectStorage {
	return {
		async ensureReady() {
			await mkdir(PROJECTS_DIR, { recursive: true });
			await migrateLegacyReport();
		},

		async listProjectSlugs() {
			await this.ensureReady();

			let entries: string[];
			try {
				entries = await readdir(PROJECTS_DIR);
			} catch {
				return [];
			}

			const slugs: string[] = [];
			for (const slug of entries) {
				if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) continue;
				const reportPath = path.join(PROJECTS_DIR, slug, 'report.json');
				if (await fileExists(reportPath)) {
					slugs.push(slug);
				}
			}
			return slugs;
		},

		async readReportJson(project) {
			await this.ensureReady();
			const { reportPath } = getProjectPaths(project);

			try {
				return await readFile(reportPath, 'utf-8');
			} catch {
				throw new Error(`Project "${project}" not found`);
			}
		},

		async writeReportJson(project, json) {
			await writeReportFile(project, json);
		},

		async reportExists(project) {
			const { reportPath } = getProjectPaths(project);
			return fileExists(reportPath);
		},

		async saveEvidenceFile(project, filename, data) {
			const { evidenceDir } = getProjectPaths(project);
			await mkdir(evidenceDir, { recursive: true });

			const filePath = path.join(evidenceDir, filename);
			await writeFile(filePath, data);
			return `/evidence/${project}/${filename}`;
		},

		async deleteEvidenceBySrc(src, project) {
			if (!isLocalEvidencePath(src)) return;

			const { evidenceDir } = getProjectPaths(project);
			const relative = src.replace(/^\/evidence\//, '');
			const filePath = path.join(EVIDENCE_ROOT, relative);
			const scopedPath = path.join(evidenceDir, path.basename(src));

			for (const candidate of [filePath, scopedPath]) {
				try {
					await unlink(candidate);
				} catch {
					// ignore missing files
				}
			}
		}
	};
}
