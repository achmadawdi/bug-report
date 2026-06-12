<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
</script>

<div class="{ui.pageShell} {ui.pageStack}">
	<!-- Report header -->
	<header class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
			<Skeleton class="size-10 shrink-0 rounded-lg sm:size-11" />
			<div class="min-w-0 space-y-2">
				<Skeleton class="h-3 w-24" />
				<Skeleton class="h-7 w-64 max-w-full sm:h-8" />
			</div>
		</div>
		<Skeleton class="h-14 w-36 shrink-0 rounded-lg" />
	</header>

	<!-- Metadata card -->
	<Card class={ui.cardPanel}>
		<div class="{ui.cardPadding} flex items-start justify-between gap-4">
			<div class="grid min-w-0 flex-1 {ui.gridLg} sm:grid-cols-2 xl:grid-cols-4">
				{#each Array.from({ length: 4 }) as _, index (index)}
					<div class="flex {ui.grid}">
						<Skeleton class="size-8 shrink-0 rounded-md" />
						<div class="min-w-0 flex-1 space-y-2">
							<Skeleton class="h-3 w-16" />
							<Skeleton class="h-4 w-28" />
						</div>
					</div>
				{/each}
			</div>
			<Skeleton class="h-8 w-14 shrink-0 rounded-md" />
		</div>
		<div class="border-t border-border/60 {ui.cardPadding}">
			<div class="flex {ui.grid}">
				<Skeleton class="size-8 shrink-0 rounded-md" />
				<div class="min-w-0 flex-1 space-y-2">
					<Skeleton class="h-3 w-12" />
					<Skeleton class="h-4 w-full" />
				</div>
			</div>
		</div>
	</Card>

	<div class="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
		<!-- Sidebar -->
		<aside class="space-y-4">
			{#each Array.from({ length: 3 }) as _, index (index)}
				<Card class={ui.cardPanel}>
					<div class={ui.cardHeader}>
						<Skeleton class="h-4 w-32" />
					</div>
					<div class="space-y-3 {ui.cardContent}">
						{#each Array.from({ length: index === 0 ? 4 : 2 }) as __, row (row)}
							<Skeleton class="h-16 w-full rounded-md" />
						{/each}
					</div>
				</Card>
			{/each}
		</aside>

		<!-- Main -->
		<main class="flex flex-col gap-4">
			<Card class={ui.cardPanel}>
				<div class="space-y-3 {ui.cardPadding}">
					<Skeleton class="h-8 w-full rounded-lg" />
					<div class="flex flex-col gap-2 lg:flex-row lg:items-center">
						<div class="flex flex-1 gap-2">
							{#each Array.from({ length: 5 }) as __, chip (chip)}
								<Skeleton class="h-8 flex-1 rounded-md" />
							{/each}
						</div>
						<div class="grid w-full grid-cols-3 {ui.grid} lg:w-80 lg:shrink-0">
							{#each Array.from({ length: 3 }) as __, select (select)}
								<Skeleton class="h-8 rounded-lg" />
							{/each}
						</div>
					</div>
				</div>
			</Card>

			<section class="grid {ui.grid}">
				{#each Array.from({ length: 5 }) as __, card (card)}
					<Card class={ui.cardPanel}>
						<div class="flex {ui.gridLg} {ui.cardPadding}">
							<div class="flex min-w-0 flex-1 flex-col gap-2">
								<Skeleton class="h-3 w-16" />
								<Skeleton class="h-5 w-3/4 max-w-md" />
								<div class={ui.badgeRow}>
									<Skeleton class="h-5 w-16 rounded-md" />
									<Skeleton class="h-5 w-20 rounded-md" />
									<Skeleton class="h-5 w-24 rounded-md" />
								</div>
								<Skeleton class="h-4 w-full" />
								<Skeleton class="h-4 w-5/6" />
							</div>
							<Skeleton class="hidden h-24 w-32 shrink-0 rounded-md sm:block md:w-40" />
						</div>
					</Card>
				{/each}
			</section>
		</main>
	</div>

	<Skeleton class="h-4 w-96 max-w-full" />
</div>
