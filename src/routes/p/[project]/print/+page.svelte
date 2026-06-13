<script lang="ts">
	import { onMount } from 'svelte';
	import { SEVERITIES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import { isFiltersActive } from '$lib/filters.js';
	import { displayDate, displayNumber, displayText } from '$lib/format.js';
	import IssueFieldsDisplay from '$lib/components/dashboard/IssueFieldsDisplay.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import PrinterIcon from '@lucide/svelte/icons/printer';

	let { data } = $props();

	onMount(() => {
		const timer = window.setTimeout(() => window.print(), 300);
		return () => window.clearTimeout(timer);
	});
</script>

<svelte:head>
	<title>{data.report.report.title} · PDF Export</title>
</svelte:head>

<div class="print-shell min-h-screen bg-white text-zinc-900">
	<div class="no-print sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-4 backdrop-blur md:px-6">
		<div>
			<p class="font-semibold">Print Preview</p>
			<p class="text-sm text-zinc-500">
				{data.issues.length} issue{data.issues.length === 1 ? '' : 's'}
				{#if isFiltersActive(data.filters)}(filtered){/if}
			</p>
		</div>
		<Button onclick={() => window.print()}>
			<PrinterIcon class="size-4" />
			Print / Save as PDF
		</Button>
	</div>

	<article class="mx-auto max-w-4xl px-4 py-8 md:px-6">
		<header class="mb-8 border-b border-zinc-200 pb-6">
			<p class="text-sm uppercase tracking-wide text-zinc-500">{displayText(data.report.report.type)}</p>
			<h1 class="mt-1 text-3xl font-bold">{displayText(data.report.report.title)}</h1>
			<div class="mt-4 grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
				<p>
					<strong>Minecraft edition:</strong>
					{displayText(data.report.testing_session.minecraft_edition)}
				</p>
				<p>
					<strong>Game version tested:</strong>
					{displayText(data.report.testing_session.game_version_tested)}
				</p>
				<p>
					<strong>Test date:</strong>
					{displayDate(data.report.testing_session.test_date)}
				</p>
				<p>
					<strong>Testers:</strong>
					{displayNumber(data.report.testing_session.tester_count)} ·
					{displayText(data.report.testing_session.device_type)}
				</p>
				<p><strong>Release:</strong> {displayText(data.report.report.version)}</p>
				<p>
					<strong>Tester version:</strong>
					{displayText(data.report.testing_session.tester_version)}
				</p>
				<p>
					<strong>Education level:</strong>
					{displayText(data.report.testing_session.tester_education_level)}
				</p>
				{#if data.report.testing_session.environment}
					<p>
						<strong>Environment:</strong>
						{displayText(data.report.testing_session.environment)}
					</p>
				{/if}
				<p><strong>Source file:</strong> {displayText(data.report.report.source_file)}</p>
			</div>
			<p class="mt-3 text-sm text-zinc-600">
				<strong>Scope:</strong> {displayText(data.report.testing_session.test_scope)}
			</p>
		</header>

		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold">Summary</h2>
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-zinc-200 text-left">
						<th class="py-2 pr-4">Severity</th>
						<th class="py-2 pr-4">Count</th>
						<th class="py-2">Status</th>
						<th class="py-2">Count</th>
					</tr>
				</thead>
				<tbody>
					{#each SEVERITIES as severity, index}
						<tr class="border-b border-zinc-100">
							<td class="py-2 pr-4 font-medium">{severity}</td>
							<td class="py-2 pr-4">{data.report.summary.by_severity[severity]}</td>
							<td class="py-2 pr-4 font-medium">{STATUS_LABELS[STATUSES[index]]}</td>
							<td class="py-2">{data.report.summary.by_status[STATUSES[index]]}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="space-y-6">
			<h2 class="text-lg font-semibold">Issues ({data.issues.length})</h2>

			{#each data.issues as issue (issue.id)}
				<div class="issue-block rounded-lg border border-zinc-200 p-5">
					<div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
						<span class="rounded-md bg-zinc-100 px-2 py-1 font-mono">{issue.id}</span>
						<span class="rounded-md bg-zinc-100 px-2 py-1">{issue.severity}</span>
						<span class="rounded-md bg-zinc-100 px-2 py-1">{STATUS_LABELS[issue.status]}</span>
						<span class="rounded-md bg-zinc-100 px-2 py-1">{issue.area}</span>
						<span class="rounded-md bg-zinc-100 px-2 py-1">{issue.category}</span>
					</div>

					<h3 class="text-lg font-semibold">{displayText(issue.title)}</h3>

					<IssueFieldsDisplay {issue} variant="print" />
				</div>
			{/each}
		</section>
	</article>
</div>

<style>
	@media print {
		:global(body) {
			background: white !important;
			color: #18181b !important;
		}

		.no-print {
			display: none !important;
		}

		.print-shell {
			padding: 0;
		}

		.issue-block {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
