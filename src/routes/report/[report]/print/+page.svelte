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
</script>

<svelte:head>
	<title>{data.report.report.title} · PDF Export</title>
</svelte:head>

<!-- Printable content always uses light, high-contrast colors (WYSIWYG for PDF). -->
<div class="print-shell min-h-screen bg-white text-zinc-900">
	<div class="no-print sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-4 py-4 text-foreground backdrop-blur md:px-6">
		<div>
			<p class="font-semibold">Print Preview</p>
			<p class="text-sm text-muted-foreground">
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

	<article class="print-container mx-auto max-w-4xl px-4 py-8 md:px-6">
		<header class="mb-8 border-b border-zinc-300 pb-6 text-zinc-700">
			<p class="text-sm uppercase tracking-wide text-zinc-500">{displayText(data.report.report.type)}</p>
			<h1 class="mt-1 text-3xl font-bold text-zinc-900">{displayText(data.report.report.title)}</h1>
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
				<p class="mt-3 text-sm text-zinc-600">
					<strong>Scope:</strong> {displayText(data.report.testing_session.test_scope)}
				</p>
			{/if}
		</header>

		<section class="mb-8">
			<h2 class="mb-3 text-lg font-semibold text-zinc-900">Summary</h2>
			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="border-b border-zinc-300 text-left text-zinc-600">
						<th class="py-2 pr-4">Severity</th>
						<th class="py-2 pr-4">Count</th>
						<th class="py-2">Status</th>
						<th class="py-2">Count</th>
					</tr>
				</thead>
				<tbody>
					{#each SEVERITIES as severity, index}
						{@const status = STATUSES[index]}
						<tr class="border-b border-zinc-200 text-zinc-700">
							<td class="py-2 pr-4">
								<span class="inline-block rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase {severityPrintStyles[severity]}">
									{severity}
								</span>
							</td>
							<td class="py-2 pr-4 font-semibold tabular-nums">{data.report.summary.by_severity[severity]}</td>
							<td class="py-2 pr-4">
								<span class="inline-block rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase {statusPrintStyles[status]}">
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
			<h2 class="text-lg font-semibold text-zinc-900">Issues ({data.issues.length})</h2>

			{#each data.issues as issue (issue.id)}
				<div class="issue-block rounded-lg border border-zinc-300 bg-white p-5 text-zinc-900 shadow-sm">
					<div class="mb-3 flex flex-wrap items-center gap-2 text-xs">
						<span class="rounded border border-zinc-300 bg-zinc-100 px-2 py-0.5 font-mono text-zinc-800">{issue.id}</span>
						<span class="rounded px-2 py-0.5 font-semibold {severityPrintStyles[issue.severity]}">{issue.severity}</span>
						<span class="rounded px-2 py-0.5 font-semibold {statusPrintStyles[issue.status]}">{STATUS_LABELS[issue.status]}</span>
						<span class="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700">{issue.area}</span>
						<span class="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-zinc-700">{issue.category}</span>
					</div>

					<h3 class="mb-2 text-lg font-semibold text-zinc-900">{displayText(issue.title)}</h3>

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

		:global(html),
		:global(body),
		:global(main),
		:global(main > div),
		:global(.min-h-screen) {
			margin: 0 !important;
			padding: 0 !important;
			display: block !important;
			height: auto !important;
			min-height: 0 !important;
			position: static !important;
			overflow: visible !important;
		}

		:global(html),
		:global(body) {
			background: white !important;
			color: #18181b !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		:global(main),
		:global(main > div),
		:global(.min-h-screen) {
			background: transparent !important;
			color: inherit !important;
		}

		.no-print {
			display: none !important;
		}

		.print-shell {
			background: white !important;
			color: #18181b !important;
			padding: 0 !important;
			display: block !important;
			height: auto !important;
			min-height: 0 !important;
			overflow: visible !important;
			-webkit-print-color-adjust: exact !important;
			print-color-adjust: exact !important;
		}

		.print-container {
			padding: 1.5cm 1.2cm !important;
			-webkit-box-decoration-break: clone;
			box-decoration-break: clone;
			max-width: none !important;
			display: block !important;
			overflow: visible !important;
		}

		.issue-block {
			break-before: page;
			page-break-before: always;
			break-inside: avoid;
			page-break-inside: avoid;
		}
	}
</style>
