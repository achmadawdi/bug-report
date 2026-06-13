<script lang="ts">
	import { onMount } from 'svelte';
	import { SEVERITIES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import { isFiltersActive } from '$lib/filters.js';
	import { displayDate, displayNumber, displayText } from '$lib/format.js';
	import IssueFieldsDisplay from '$lib/components/dashboard/IssueFieldsDisplay.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import { mode } from 'mode-watcher';

	let { data } = $props();
	const isDarkPDF = $derived(mode.current === 'dark');

	onMount(() => {
		const timer = window.setTimeout(() => window.print(), 300);
		return () => window.clearTimeout(timer);
	});

	const severityPrintStyles: Record<string, string> = {
		Critical: 'bg-rose-50 text-rose-800 border border-rose-200',
		High: 'bg-orange-50 text-orange-800 border border-orange-200',
		Medium: 'bg-amber-50 text-amber-800 border border-amber-200',
		Low: 'bg-green-50 text-green-800 border border-green-200'
	};

	const statusPrintStyles: Record<string, string> = {
		open: 'bg-red-50 text-red-800 border border-red-200',
		in_progress: 'bg-blue-50 text-blue-800 border border-blue-200',
		fixed: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
		wont_fix: 'bg-zinc-100 text-zinc-600 border border-zinc-300'
	};

	const severityDarkPrintStyles: Record<string, string> = {
		Critical: 'bg-rose-950/40 text-rose-300 border border-rose-900/40',
		High: 'bg-orange-950/40 text-orange-300 border border-orange-900/40',
		Medium: 'bg-amber-950/40 text-amber-300 border border-amber-900/40',
		Low: 'bg-green-950/40 text-green-300 border border-green-900/40'
	};

	const statusDarkPrintStyles: Record<string, string> = {
		open: 'bg-red-950/40 text-red-300 border border-red-900/40',
		in_progress: 'bg-blue-950/40 text-blue-300 border border-blue-900/40',
		fixed: 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40',
		wont_fix: 'bg-zinc-800 text-zinc-400 border border-zinc-700'
	};
</script>

<svelte:head>
	<title>{data.report.report.title} · PDF Export</title>
</svelte:head>

<svelte:body class:dark-print={isDarkPDF} />

<div class="print-shell min-h-screen transition-colors duration-200 {isDarkPDF ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'}">
	<div class="no-print sticky top-0 z-10 flex items-center justify-between border-b px-4 py-4 backdrop-blur md:px-6 {isDarkPDF ? 'border-zinc-800 bg-zinc-950/95 text-zinc-100' : 'border-zinc-300 bg-white/95 text-zinc-900'}">
		<div>
			<p class="font-semibold">Print Preview</p>
			<p class="text-sm text-zinc-500">
				{data.issues.length} issue{data.issues.length === 1 ? '' : 's'}
				{#if isFiltersActive(data.filters)}(filtered){/if}
			</p>
		</div>
		<div class="flex items-center gap-3">
			<Button onclick={() => window.print()} class="h-8">
				<PrinterIcon class="size-4 mr-1.5" />
				Print / PDF
			</Button>
		</div>
	</div>

	<article class="mx-auto max-w-4xl px-4 py-8 md:px-6 print-container">
		<header class="mb-8 border-b pb-6 {isDarkPDF ? 'border-zinc-800 text-zinc-400' : 'border-zinc-300 text-zinc-700'}">
			<p class="text-sm uppercase tracking-wide text-zinc-500">{displayText(data.report.report.type)}</p>
			<h1 class="mt-1 text-3xl font-bold {isDarkPDF ? 'text-zinc-100' : 'text-zinc-900'}">{displayText(data.report.report.title)}</h1>
			<div class="mt-4 grid gap-2 text-sm sm:grid-cols-2 {isDarkPDF ? 'text-zinc-300' : 'text-zinc-700'}">
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
					<strong>Tester level:</strong>
					{displayText(data.report.testing_session.tester_level)}
				</p>
				{#if data.report.testing_session.environment}
					<p>
						<strong>Environment:</strong>
						{displayText(data.report.testing_session.environment)}
					</p>
				{/if}
				{#if data.report.report.source_file}
					<p><strong>Source file:</strong> {displayText(data.report.report.source_file)}</p>
				{/if}
			</div>
			{#if data.report.testing_session.test_scope}
				<p class="mt-3 text-sm {isDarkPDF ? 'text-zinc-400' : 'text-zinc-600'}">
					<strong>Scope:</strong> {displayText(data.report.testing_session.test_scope)}
				</p>
			{/if}
		</header>

		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold {isDarkPDF ? 'text-zinc-100' : 'text-zinc-900'}">Summary</h2>
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b text-left {isDarkPDF ? 'border-zinc-800 text-zinc-400' : 'border-zinc-300 text-zinc-600'}">
						<th class="py-2 pr-4">Severity</th>
						<th class="py-2 pr-4">Count</th>
						<th class="py-2">Status</th>
						<th class="py-2">Count</th>
					</tr>
				</thead>
				<tbody>
					{#each SEVERITIES as severity, index}
						{@const status = STATUSES[index]}
						<tr class="border-b {isDarkPDF ? 'border-zinc-900 text-zinc-300' : 'border-zinc-200 text-zinc-700'}">
							<td class="py-2 pr-4">
								<span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase {isDarkPDF ? severityDarkPrintStyles[severity] : severityPrintStyles[severity]}">
									{severity}
								</span>
							</td>
							<td class="py-2 pr-4 font-semibold tabular-nums">{data.report.summary.by_severity[severity]}</td>
							<td class="py-2 pr-4">
								<span class="inline-block px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase {isDarkPDF ? statusDarkPrintStyles[status] : statusPrintStyles[status]}">
									{STATUS_LABELS[status]}
								</span>
							</td>
							<td class="py-2 font-semibold tabular-nums">{data.report.summary.by_status[status]}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</section>

		<section class="space-y-6">
			<h2 class="text-lg font-semibold {isDarkPDF ? 'text-zinc-100' : 'text-zinc-900'}">Issues ({data.issues.length})</h2>

			{#each data.issues as issue (issue.id)}
				<div class="issue-block rounded-lg border p-5 shadow-sm {isDarkPDF ? 'border-zinc-850 bg-zinc-900/40 text-zinc-100' : 'border-zinc-300 bg-white text-zinc-900'}">
					<div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
						<span class="rounded px-2 py-0.5 font-mono {isDarkPDF ? 'bg-zinc-800 border border-zinc-700 text-zinc-350' : 'bg-zinc-100 border border-zinc-300 text-zinc-800'}">{issue.id}</span>
						<span class="rounded px-2 py-0.5 font-semibold {isDarkPDF ? severityDarkPrintStyles[issue.severity] : severityPrintStyles[issue.severity]}">{issue.severity}</span>
						<span class="rounded px-2 py-0.5 font-semibold {isDarkPDF ? statusDarkPrintStyles[issue.status] : statusPrintStyles[issue.status]}">{STATUS_LABELS[issue.status]}</span>
						<span class="rounded border px-2 py-0.5 {isDarkPDF ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}">{issue.area}</span>
						<span class="rounded border px-2 py-0.5 {isDarkPDF ? 'bg-zinc-800 border-zinc-700 text-zinc-300' : 'bg-zinc-50 border-zinc-200 text-zinc-700'}">{issue.category}</span>
					</div>

					<h3 class="text-lg font-semibold mb-2 {isDarkPDF ? 'text-zinc-100' : 'text-zinc-900'}">{displayText(issue.title)}</h3>

					<IssueFieldsDisplay {issue} variant="print" />
				</div>
			{/each}
		</section>
	</article>
</div>

<style>
	@media print {
		@page {
			margin: 0 !important;
		}

		:global(html), :global(body) {
			margin: 0 !important;
			padding: 0 !important;
			background: white !important;
			color: #18181b !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		:global(html.dark), :global(html:has(body.dark-print)), :global(body.dark-print) {
			background: #09090b !important;
			color: #f4f4f5 !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		.no-print {
			display: none !important;
		}

		.print-shell {
			padding: 0 !important;
		}

		.print-container {
			padding: 1.5cm 1.2cm !important;
			-webkit-box-decoration-break: clone;
			box-decoration-break: clone;
			max-width: none !important;
		}

		.issue-block {
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
