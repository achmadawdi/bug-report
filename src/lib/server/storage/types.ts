export interface ProjectStorage {
	ensureReady(): Promise<void>;
	listProjectSlugs(): Promise<string[]>;
	readReportJson(project: string): Promise<string>;
	writeReportJson(project: string, json: string): Promise<void>;
	reportExists(project: string): Promise<boolean>;
	saveEvidenceFile(
		project: string,
		filename: string,
		data: Buffer,
		contentType?: string
	): Promise<string>;
	deleteEvidenceBySrc(src: string, project: string): Promise<void>;
}
