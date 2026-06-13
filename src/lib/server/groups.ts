import { CREATE_NEW_GROUP } from '$lib/groups.js';
import { createProjectGroup } from '$lib/server/store.js';

export async function resolveGroupAssignment(
	groupSlugRaw: string | null | undefined,
	newGroupNameRaw: string | null | undefined
): Promise<string | null> {
	const newGroupName = (newGroupNameRaw ?? '').trim();
	if (newGroupName) {
		return (await createProjectGroup(newGroupName)).slug;
	}

	const slug = (groupSlugRaw ?? '').trim();
	if (!slug || slug === 'none' || slug === CREATE_NEW_GROUP) {
		return null;
	}

	return slug;
}
