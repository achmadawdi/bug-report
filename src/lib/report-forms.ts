import type { SubmitFunction } from '@sveltejs/kit';
import { getContext } from 'svelte';
import { applyReportPaneForm } from '$lib/report-host.js';
import { reportPath } from '$lib/routes.js';
import type { ActionData } from '../routes/report/[report]/$types.js';

export const REPORT_SLUG_KEY = Symbol('reportSlug');

export function getReportSlugContext(): string {
	const slug = getContext<string>(REPORT_SLUG_KEY);
	if (!slug) {
		throw new Error('Report slug context is missing — form must render inside ReportDashboard');
	}
	return slug;
}

export function reportFormAction(slug: string, action: string): string {
	const normalized = action.startsWith('?/') ? action : `?/${action}`;
	return `${reportPath(slug)}${normalized}`;
}

type EnhanceReportFormOptions = {
	onSubmit?: () => void;
	onSuccess?: (data: ActionData) => void | Promise<void>;
	onFailure?: (data: ActionData) => void | Promise<void>;
	onError?: () => void | Promise<void>;
	onFinally?: () => void;
};

export function enhanceReportForm(
	slug: string,
	options: EnhanceReportFormOptions = {}
): SubmitFunction {
	return () => {
		options.onSubmit?.();
		return async ({ result }) => {
			try {
				if (result.type === 'success' || result.type === 'failure') {
					const data = result.data as ActionData;
					applyReportPaneForm(slug, data);
					if (result.type === 'success') {
						await options.onSuccess?.(data);
					} else {
						await options.onFailure?.(data);
					}
				} else if (result.type === 'error') {
					await options.onError?.();
				}
			} finally {
				options.onFinally?.();
			}
		};
	};
}
