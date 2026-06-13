<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
</script>

<div class="{ui.pageShell} {ui.pageStack}">
	<nav class="flex min-w-0 items-center gap-1.5">
		<Skeleton class="h-4 w-28" />
		<Skeleton class="size-3.5 shrink-0 rounded-sm" />
		<Skeleton class="h-4 w-40" />
	</nav>

	<Card class="gap-0 border-border bg-card/25 py-0 shadow-sm backdrop-blur-md">
		<CardContent class="flex flex-wrap items-center gap-2 p-3">
			<div class="flex flex-wrap items-center gap-1">
				{#each Array.from({ length: 2 }) as _, index (index)}
					<Skeleton class="h-8 w-36 rounded-md" />
				{/each}
			</div>
			<div class="ml-auto flex items-center gap-1">
				<Skeleton class="size-8 rounded-md" />
				<Skeleton class="size-8 rounded-md" />
			</div>
		</CardContent>
	</Card>

	<Card class="gap-0 overflow-hidden border-border bg-card/25 py-0 shadow-sm backdrop-blur-md">
		<CardContent class="flex flex-col gap-0 p-0">
			<div class="px-4 py-4 md:px-6 md:py-6">
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
			</div>

			<div class="border-t border-border/60">
				<div class="@container px-4 py-3 md:px-6 md:py-4">
					<div
						class="flex flex-col gap-3 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-4"
					>
					<div class="grid grid-cols-2 gap-x-4 gap-y-3 @sm:grid-cols-4 @sm:gap-x-3 @3xl:inline-grid @3xl:w-auto @3xl:gap-x-5">
						{#each Array.from({ length: 4 }) as _, index (index)}
							<div class="flex min-w-0 gap-2.5">
								<Skeleton class="size-8 shrink-0 rounded-md" />
								<div class="min-w-0 space-y-2">
									<Skeleton class="h-3 w-16" />
									<Skeleton class="h-4 w-28" />
								</div>
							</div>
						{/each}
					</div>
					<div
						class="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3 @3xl:border-t-0 @3xl:pt-0 @3xl:shrink-0 @3xl:justify-end"
					>
						<Skeleton class="h-8 w-full rounded-lg @sm:w-52" />
						<Skeleton class="h-8 w-20 rounded-md" />
						<Skeleton class="h-8 w-14 rounded-md" />
					</div>
				</div>
			</div>

				<div class="border-t border-border/60 p-4">
					<div class="flex gap-3">
						<Skeleton class="size-8 shrink-0 rounded-md" />
						<div class="min-w-0 flex-1 space-y-2">
							<Skeleton class="h-3 w-20" />
							<Skeleton class="h-4 w-36" />
						</div>
					</div>
				</div>
			</div>

			<div
				class="grid gap-4 border-t border-border/60 px-3 py-3 md:px-6 md:py-4 md:pb-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-6"
			>
				<aside class="order-2 space-y-3 xl:order-none xl:space-y-4">
					{#each Array.from({ length: 2 }) as _, index (index)}
						<Card class="{ui.cardPanel} border-border/60 bg-card/45 shadow-sm backdrop-blur-md">
							<div class="{ui.cardHeader} py-2.5 xl:py-3">
								<Skeleton class="h-4 w-32" />
							</div>
							<div class="space-y-3 {ui.cardContent}">
								{#each Array.from({ length: index === 0 ? 2 : 1 }) as __, row (row)}
									<Skeleton class="h-12 w-full rounded-md" />
								{/each}
							</div>
						</Card>
					{/each}
					<Card class="{ui.cardPanel} hidden border-border/60 bg-card/45 shadow-sm backdrop-blur-md xl:block">
						<div class={ui.cardHeader}>
							<Skeleton class="h-4 w-32" />
						</div>
						<div class="space-y-3 {ui.cardContent}">
							{#each Array.from({ length: 3 }) as __, row (row)}
								<Skeleton class="h-16 w-full rounded-md" />
							{/each}
						</div>
					</Card>
				</aside>

				<main class="order-1 flex flex-col gap-3 md:gap-4 xl:order-none">
					<Card class="{ui.cardPanel} border-border/60 bg-card/45 shadow-sm backdrop-blur-md">
						<div class="space-y-2.5 p-3 sm:space-y-3 sm:p-4">
							<Skeleton class="h-8 w-full rounded-lg" />
							<Skeleton class="h-8 w-full rounded-lg sm:w-3/5" />
							<div class="flex gap-1.5 overflow-hidden">
								{#each Array.from({ length: 5 }) as __, chip (chip)}
									<Skeleton class="h-8 w-14 shrink-0 rounded-md" />
								{/each}
							</div>
							<div class="grid grid-cols-3 gap-1.5 sm:gap-2">
								{#each Array.from({ length: 3 }) as __, select (select)}
									<Skeleton class="h-8 rounded-lg" />
								{/each}
							</div>
						</div>
					</Card>

					<section class="grid {ui.grid}">
						{#each Array.from({ length: 4 }) as __, card (card)}
							<Card class="{ui.cardPanel} border-border/50 bg-card/65 shadow-sm backdrop-blur-md">
								<div class="flex flex-col gap-2 {ui.cardPadding}">
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0 flex-1 space-y-2">
											<Skeleton class="h-3 w-16" />
											<Skeleton class="h-5 w-3/4 max-w-md" />
										</div>
										<Skeleton class="size-4 shrink-0 rounded-sm" />
									</div>
									<div class={ui.badgeRow}>
										<Skeleton class="h-5 w-16 rounded-md" />
										<Skeleton class="h-5 w-20 rounded-md" />
										<Skeleton class="h-5 w-24 rounded-md" />
									</div>
									<Skeleton class="h-4 w-full" />
									<Skeleton class="h-4 w-5/6" />
								</div>
							</Card>
						{/each}
					</section>
				</main>
			</div>
		</CardContent>
	</Card>

	<Skeleton class="h-4 w-96 max-w-full" />
</div>
