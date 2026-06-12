export const STANDARD_AREAS = ['Global UI', 'Multiplayer'] as const;

export function mergeAreas(issueAreas: string[]): string[] {
	const merged = new Set([...issueAreas, ...STANDARD_AREAS]);
	return [...merged].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
