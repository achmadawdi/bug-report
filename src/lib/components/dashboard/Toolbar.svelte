<script lang="ts">
	import type { FilterState, Severity } from '$lib/types.js';
	import { SEVERITIES, SEVERITY_STYLES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import { isFiltersActive } from '$lib/filters.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuTrigger
	} from '$lib/components/ui/dropdown-menu/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
	import { cn } from '$lib/utils.js';
	import SearchIcon from '@lucide/svelte/icons/search';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import XIcon from '@lucide/svelte/icons/x';

	let {
		filters = $bindable(),
		areas,
		severityCounts,
		filteredCount,
		totalCount: issueTotal,
		searchInput = $bindable(),
		onExportJson,
		onExportPdf,
		onAdd,
		onClearFilters
	}: {
		filters: FilterState;
		areas: string[];
		severityCounts: Record<Severity, number>;
		filteredCount: number;
		totalCount: number;
		searchInput?: HTMLInputElement | null;
		onExportJson: () => void;
		onExportPdf: () => void;
		onAdd: () => void;
		onClearFilters: () => void;
	} = $props();

	const totalCount = $derived(
		Object.values(severityCounts).reduce((acc, count) => acc + count, 0)
	);
	const filtersActive = $derived(isFiltersActive(filters));

	const sortLabel = $derived(
		filters.sort === 'id-asc'
			? 'ID ↑'
			: filters.sort === 'id-desc'
				? 'ID ↓'
				: filters.sort === 'severity'
					? 'Severity'
					: filters.sort === 'level'
						? 'Level'
						: 'Status'
	);
</script>

<div class="sticky top-4 z-20">
	<Card
		class={cn(
			ui.cardPanel,
			'border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80'
		)}
	>
		<CardContent class="space-y-3 {ui.cardPadding}">
			<!-- Row 1: search + count + actions -->
			<div class="flex flex-wrap items-center gap-2">
				<div class="relative min-w-[200px] flex-1">
					<SearchIcon
						class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
					/>
					<Input
						bind:ref={searchInput}
						class="h-8 bg-background pl-8 text-sm"
						placeholder="Search bugs… (/)"
						bind:value={filters.search}
					/>
				</div>

				<span
					class="hidden h-8 shrink-0 items-center rounded-md border border-border bg-secondary px-2 text-xs text-muted-foreground sm:inline-flex"
				>
					<span class="font-semibold text-foreground">{filteredCount}</span>/{issueTotal}
				</span>

				{#if filtersActive}
					<Button
						size="sm"
						variant="ghost"
						class="h-8 px-2 text-xs"
						onclick={onClearFilters}
					>
						<XIcon class="size-3.5" />
						<span class="hidden sm:inline">Clear</span>
					</Button>
				{/if}

				<div class="ml-auto flex shrink-0 items-center gap-2">
					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="sm" class="h-8">
									<DownloadIcon class="size-3.5" />
									<span class="hidden sm:inline">Export</span>
									<ChevronDownIcon class="size-3.5" />
								</Button>
							{/snippet}
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onclick={onExportJson}>
								<DownloadIcon class="size-4" />
								Export JSON
							</DropdownMenuItem>
							<DropdownMenuItem onclick={onExportPdf}>
								<FileTextIcon class="size-4" />
								Export PDF
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button size="sm" class="h-8" onclick={onAdd}>
						<PlusIcon class="size-3.5" />
						Add Bug
					</Button>
				</div>
			</div>

			<!-- Row 2: severity chips + dropdown filters -->
			<div class="flex flex-col gap-2 lg:flex-row lg:items-center">
				<div class="flex min-w-0 flex-1 items-center gap-2">
					<Button
						size="sm"
						variant={filters.severity === 'all' ? 'default' : 'outline'}
						class="h-8 min-w-0 flex-1 px-2 text-xs"
						onclick={() => (filters.severity = 'all')}
					>
						<span class="truncate">All</span>
						<span class="ml-1 shrink-0 tabular-nums opacity-70">{totalCount}</span>
					</Button>
					{#each SEVERITIES as severity}
						<Button
							size="sm"
							variant={filters.severity === severity ? 'default' : 'outline'}
							class="h-8 min-w-0 flex-1 px-2 text-xs {filters.severity === severity
								? ''
								: SEVERITY_STYLES[severity].badge}"
							onclick={() => (filters.severity = severity)}
						>
							<span class="truncate">{severity}</span>
							<span class="ml-1 shrink-0 tabular-nums opacity-70">{severityCounts[severity]}</span>
						</Button>
					{/each}
				</div>

				<div class="grid w-full grid-cols-3 {ui.grid} lg:w-80 lg:shrink-0">
					<Select
						type="single"
						value={filters.area}
						onValueChange={(value) => {
							if (value) filters.area = value;
						}}
					>
						<SelectTrigger class="h-8 w-full min-w-0 bg-background px-2 text-xs">
							<span class="truncate">{filters.area === 'all' ? 'All areas' : filters.area}</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All areas</SelectItem>
							{#each areas as area}
								<SelectItem value={area}>{area}</SelectItem>
							{/each}
						</SelectContent>
					</Select>

					<Select
						type="single"
						value={filters.status}
						onValueChange={(value) => {
							if (value) filters.status = value as FilterState['status'];
						}}
					>
						<SelectTrigger class="h-8 w-full min-w-0 bg-background px-2 text-xs">
							<span class="truncate">
								{filters.status === 'all' ? 'All statuses' : STATUS_LABELS[filters.status]}
							</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							{#each STATUSES as status}
								<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
							{/each}
						</SelectContent>
					</Select>

					<Select
						type="single"
						value={filters.sort}
						onValueChange={(value) => {
							if (value) filters.sort = value as FilterState['sort'];
						}}
					>
						<SelectTrigger class="h-8 w-full min-w-0 bg-background px-2 text-xs">
							<span class="truncate">{sortLabel}</span>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="id-asc">ID: Ascending</SelectItem>
							<SelectItem value="id-desc">ID: Descending</SelectItem>
							<SelectItem value="severity">Severity: Critical First</SelectItem>
							<SelectItem value="level">Level Order</SelectItem>
							<SelectItem value="status">Status</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<p class="text-xs text-muted-foreground sm:hidden">
					{filteredCount}/{issueTotal}
					{#if filtersActive}
						· filtered
					{/if}
				</p>
			</div>
		</CardContent>
	</Card>
</div>
