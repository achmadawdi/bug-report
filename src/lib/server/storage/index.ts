export {
	ensureReady as ensureDbReady,
	getReport,
	listReportSlugs,
	listStandaloneReportSlugs,
	reportExists,
	saveReport,
	updateIssueStatus,
	listProjectGroups,
	projectGroupExists,
	createProjectGroup,
	getProjectGroup,
	listProjectGroupStats,
	getReportGroupSlug,
	listReportsInGroup,
	setReportGroupSlug,
	appendReportSortOrder,
	reorderProjectGroups,
	reorderReportsInGroup,
	reorderStandaloneReports,
	getReportWorkflow,
	getReportWorkflowStatus,
	updateReportWorkflowStatus
} from '$lib/server/db/repository.js';

import { canUseR2Storage as checkR2Storage } from './r2.js';

export {
	deleteEvidenceBySrc,
	getPublicEvidenceUrl,
	saveEvidenceFile
} from './r2.js';

export function canUseR2Storage(): boolean {
	return checkR2Storage();
}

export function useR2Storage(): boolean {
	return checkR2Storage();
}
