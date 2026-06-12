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
import { getBundledSeedProjects } from './seed.js';
import type { ProjectStorage } from './types.js';

const LEGACY_MIGRATION_SLUG = 'gauntlet-minigames';

export type LocalStorageOptions = {
	projectsDir?: string;
	evidenceRoot?: string;
	legacyReportPath?: string;
	legacyEvidenceDir?: string;
	seedFromBundled?: boolean;
	runLegacyMigration?: boolean;
};

export function createLocalStorage(options: LocalStorageOptions = {}): ProjectStorage {
	const projectsDir = options.projectsDir ?? path.resolve('data/projects');
	const evidenceRoot = options.evidenceRoot ?? path.resolve('static/evidence');
	const legacyReportPath = options.legacyReportPath ?? path.resolve('data/report.json');
	const legacyEvidenceDir = options.legacyEvidenceDir ?? path.resolve('static/evidence');
	const seedFromBundled = options.seedFromBundled ?? false;
	const runLegacyMigration = options.runLegacyMigration ?? true;

	function getProjectPaths(project: string) {
		return {
			projectDir: path.join(projectsDir, project),
			reportPath: path.join(projectsDir, project, 'report.json'),
			evidenceDir: path.join(evidenceRoot, project)
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
			const entries = await readdir(legacyEvidenceDir, { withFileTypes: true });
			const files = entries.filter((entry) => entry.isFile());

			if (files.length === 0) return;

			await mkdir(evidenceDir, { recursive: true });

			for (const file of files) {
				const source = path.join(legacyEvidenceDir, file.name);
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
		if (!(await fileExists(legacyReportPath))) return;

		const { reportPath } = getProjectPaths(LEGACY_MIGRATION_SLUG);
		if (await fileExists(reportPath)) return;

		const raw = await readFile(legacyReportPath, 'utf-8');
		const parsed = reportDataSchema.parse(JSON.parse(raw));
		const migrated = rewriteEvidencePaths(parsed, LEGACY_MIGRATION_SLUG);

		await writeReportFile(LEGACY_MIGRATION_SLUG, `${JSON.stringify(migrated, null, 2)}\n`);
		await migrateLegacyEvidence(LEGACY_MIGRATION_SLUG);

		try {
			await unlink(legacyReportPath);
		} catch {
			// ignore if legacy file cannot be removed
		}
	}

	async function seedBundledProjects(): Promise<void> {
		for (const { slug, json } of getBundledSeedProjects()) {
			const { reportPath } = getProjectPaths(slug);
			if (await fileExists(reportPath)) continue;
			await writeReportFile(slug, json);
		}
	}

	return {
		async ensureReady() {
			await mkdir(projectsDir, { recursive: true });
			await mkdir(evidenceRoot, { recursive: true });

			if (runLegacyMigration) {
				await migrateLegacyReport();
			}

			if (seedFromBundled) {
				await seedBundledProjects();
			}
		},

		async listProjectSlugs() {
			await this.ensureReady();

			let entries: string[];
			try {
				entries = await readdir(projectsDir);
			} catch {
				return [];
			}

			const slugs: string[] = [];
			for (const slug of entries) {
				if (slug.includes('..') || slug.includes('/') || slug.includes('\\')) continue;
				const reportPath = path.join(projectsDir, slug, 'report.json');
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
			const filePath = path.join(evidenceRoot, relative);
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

/** Writable evidence directory used by the Vercel /tmp fallback storage. */
export const VERCEL_TMP_EVIDENCE_ROOT = '/tmp/bug-report/static/evidence';

export function getVercelTmpEvidencePath(project: string, filename: string): string {
	return path.join(VERCEL_TMP_EVIDENCE_ROOT, project, filename);
}
