<script lang="ts">
	import { browser } from '$app/environment';
	import { updateReportPaneData } from '$lib/report-host.js';
	import { markRouteDataReady } from '$lib/preload.js';
	import { buildReportHref } from '$lib/report-navigation.js';
	import { parseReportSlug } from '$lib/routes.js';
	import { filtersToSearchParams } from '$lib/filters.js';

	let { data } = $props();

	$effect.pre(() => {
		updateReportPaneData(data.reportSlug, data);

		let search = '';
		if (browser && parseReportSlug(window.location.pathname) === data.reportSlug) {
			search = window.location.search;
		} else {
			const params = filtersToSearchParams(data.initialFilters).toString();
			search = params ? `?${params}` : '';
		}
		markRouteDataReady(buildReportHref(data.reportSlug, search));
	});
</script>
