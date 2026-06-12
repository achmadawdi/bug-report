import type { Issue } from './types.js';

export function generateNextBugId(issues: Issue[]): string {
	const max = issues.reduce((acc, issue) => {
		const match = issue.id.match(/BUG-(\d+)/i);
		return match ? Math.max(acc, Number.parseInt(match[1], 10)) : acc;
	}, 0);

	return `BUG-${String(max + 1).padStart(3, '0')}`;
}
