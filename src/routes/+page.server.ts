import { fail } from '@sveltejs/kit';
import {
	buildProjectGroupDetails,
	deleteGroup,
	filterStandaloneReports,
	reorderGroupReports,
	reorderGroups,
	reorderStandaloneReportOrder
} from '$lib/server/store.js';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types.js';

const slugListSchema = z.array(z.string().min(1)).min(1);

export const load: PageServerLoad = async ({ parent }) => {
	const { projects, groups } = await parent();

	return {
		groups: buildProjectGroupDetails(groups, projects),
		standaloneProjects: filterStandaloneReports(projects)
	};
};

export const actions: Actions = {
	reorderGroups: async ({ request }) => {
		const formData = await request.formData();
		const parsed = slugListSchema.safeParse(JSON.parse(String(formData.get('slugs') ?? '[]')));

		if (!parsed.success) {
			return fail(400, { message: 'Invalid group order.' });
		}

		try {
			await reorderGroups(parsed.data);
			return { success: true };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to reorder groups.'
			});
		}
	},

	reorderGroupReports: async ({ request }) => {
		const formData = await request.formData();
		const groupSlug = String(formData.get('groupSlug') ?? '').trim();
		const parsed = slugListSchema.safeParse(JSON.parse(String(formData.get('slugs') ?? '[]')));

		if (!groupSlug || !parsed.success) {
			return fail(400, { message: 'Invalid report order.' });
		}

		try {
			await reorderGroupReports(groupSlug, parsed.data);
			return { success: true };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to reorder reports.'
			});
		}
	},

	reorderStandaloneReports: async ({ request }) => {
		const formData = await request.formData();
		const parsed = slugListSchema.safeParse(JSON.parse(String(formData.get('slugs') ?? '[]')));

		if (!parsed.success) {
			return fail(400, { message: 'Invalid report order.' });
		}

		try {
			await reorderStandaloneReportOrder(parsed.data);
			return { success: true };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to reorder reports.'
			});
		}
	},

	deleteGroup: async ({ request }) => {
		const formData = await request.formData();
		const groupSlug = String(formData.get('groupSlug') ?? '').trim();

		if (!groupSlug) {
			return fail(400, { message: 'Group slug is required.' });
		}

		try {
			await deleteGroup(groupSlug);
			return { success: true };
		} catch (err) {
			return fail(500, {
				message: err instanceof Error ? err.message : 'Failed to delete group.'
			});
		}
	}
};
