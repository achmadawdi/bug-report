<script lang="ts">
	import type { FilterState, Severity } from '$lib/types.js';
	import { SEVERITIES, SEVERITY_STYLES, STATUSES, STATUS_LABELS, FILTER_VIEWS, FILTER_VIEW_LABELS } from '$lib/constants.js';
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
		onClearSearch,
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
		onClearSearch: () => void;
		onClearFilters: () => void;
	} = $props();

	const totalCount = $derived(
		Object.values(severityCounts).reduce((acc, count) => acc + count, 0)
	);
	const filtersActive = $derived(isFiltersActive(filters));
	const searchActive = $derived(Boolean(filters.search.trim()));

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

<div class="sticky top-0 z-20 sm:top-4">
	<Card
		class={cn(
			ui.cardPanel,
			'border-border/60 bg-card/85 shadow-sm backdrop-blur-md'
		)}
	>
		<CardContent class="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
			<!-- Row 1: search + actions -->
			<div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
				<div class="relative min-w-0 w-full sm:max-w-none sm:min-w-[12rem] sm:flex-1">
					<SearchIcon
						class="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground/70"
					/>
					<Input
						bind:ref={searchInput}
						class="h-8 bg-background/40 border-border-subtle pl-8 pr-8 text-sm focus-visible:ring-primary-muted/30 focus-visible:border-primary/40"
						placeholder="Search bugs… (/)"
						bind:value={filters.search}
					/>
					{#if searchActive}
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							class="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
							aria-label="Clear search"
							onclick={onClearSearch}
						>
							<XIcon class="size-3.5" />
						</Button>
					{/if}
				</div>

				<div class="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
					<span
						class="inline-flex h-8 shrink-0 items-center rounded-lg border border-border-subtle bg-secondary/40 px-2.5 text-xs text-muted-foreground sm:px-3"
					>
						<span class="font-semibold text-foreground">{filteredCount}</span>/{issueTotal}
					</span>

					{#if filtersActive}
						<Button
							size="sm"
							variant="ghost"
							class="h-8 px-2.5 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
							onclick={onClearFilters}
						>
							<XIcon class="size-3.5" />
							<span class="hidden sm:inline">Clear</span>
						</Button>
					{/if}

					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline" size="sm" class="h-8 border-border-subtle bg-background/40 hover:bg-muted/40 px-3 text-xs transition-colors">
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

					<Button size="sm" class="h-8 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm px-3 text-xs font-semibold" onclick={onAdd}>
						<PlusIcon class="size-3.5" />
						Add Bug
					</Button>
				</div>
			</div>

			<!-- Row 2: view toggle -->
			<div class="flex items-center gap-1 rounded-lg border border-border-subtle bg-secondary/20 p-1">
				{#each FILTER_VIEWS as view}
					<Button
						size="sm"
						variant="ghost"
						class={cn(
							"h-7 flex-1 px-2 text-xs rounded-md transition-all duration-200",
							filters.view === view
								? "bg-primary-surface border border-primary-muted/20 text-primary font-semibold shadow-sm"
								: "text-muted-foreground hover:text-foreground hover:bg-muted/20"
						)}
						onclick={() => (filters.view = view)}
					>
						{FILTER_VIEW_LABELS[view]}
					</Button>
				{/each}
			</div>

			<!-- Row 3: severity chips + dropdown filters -->
			<div class="flex flex-col gap-2 lg:flex-row lg:items-center">
				<div
					class="flex min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth snap-x sm:gap-2 sm:flex-1"
				>
					<Button
						size="sm"
						variant="outline"
						class={cn(
							"h-8 min-w-0 shrink-0 sm:flex-1 px-2.5 text-xs transition-all border-border-subtle",
							filters.severity === 'all'
								? "bg-primary-surface border-primary-muted/25 text-primary font-semibold shadow-sm"
								: "bg-background/40 text-muted-foreground hover:bg-muted/40 hover:text-foreground"
						)}
						onclick={() => (filters.severity = 'all')}
					>
						<span class="truncate">All</span>
						<span class="ml-1 shrink-0 tabular-nums opacity-70">{totalCount}</span>
					</Button>
					{#each SEVERITIES as severity}
						{@const isSelected = filters.severity === severity}
						<Button
							size="sm"
							variant="outline"
							class={cn(
								"h-8 min-w-0 shrink-0 sm:flex-1 px-2.5 text-xs transition-all border-border-subtle",
								isSelected
									? severity === 'Critical'
										? "border-severity-critical/50 bg-severity-critical/15 text-severity-critical font-semibold shadow-sm"
										: severity === 'High'
											? "border-severity-high/50 bg-severity-high/15 text-severity-high font-semibold shadow-sm"
											: severity === 'Medium'
												? "border-severity-medium/50 bg-severity-medium/15 text-severity-medium font-semibold shadow-sm"
												: "border-severity-low/50 bg-severity-low/15 text-severity-low font-semibold shadow-sm"
									: SEVERITY_STYLES[severity].badge
							)}
							onclick={() => (filters.severity = severity)}
						>
							<span class="truncate">{severity}</span>
							<span class="ml-1 shrink-0 tabular-nums opacity-70">{severityCounts[severity]}</span>
						</Button>
					{/each}
				</div>

				<div class="grid w-full grid-cols-3 gap-1.5 sm:gap-2 lg:w-80 lg:shrink-0">
					<Select
						type="single"
						value={filters.area}
						onValueChange={(value) => {
							if (value) filters.area = value;
						}}
					>
						<SelectTrigger class="h-8 w-full min-w-0 bg-background/40 border-border-subtle hover:bg-muted/30 hover:text-foreground px-2.5 text-xs transition-colors">
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
						<SelectTrigger class="h-8 w-full min-w-0 bg-background/40 border-border-subtle hover:bg-muted/30 hover:text-foreground px-2.5 text-xs transition-colors">
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
						<SelectTrigger class="h-8 w-full min-w-0 bg-background/40 border-border-subtle hover:bg-muted/30 hover:text-foreground px-2.5 text-xs transition-colors">
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
			</div>
		</CardContent>
	</Card>
</div>
