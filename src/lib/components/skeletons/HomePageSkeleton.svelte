<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Card, CardContent } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
</script>

<div class="{ui.pageShell} min-h-[calc(100vh-2.5rem)] {ui.pageStack}">
	<div class="space-y-4 py-4 sm:py-6">
		<div class="flex flex-col items-center text-center">
			<div class="flex items-center justify-center gap-2.5">
				<Skeleton class="size-6 shrink-0 rounded-md sm:size-7" />
				<Skeleton class="h-8 w-44 sm:h-9 sm:w-52" />
			</div>
			<Skeleton class="mt-2 h-4 w-72 max-w-full" />
		</div>

		<div class="mx-auto flex w-full max-w-2xl items-center gap-2">
			<Skeleton class="h-10 min-w-0 flex-1 rounded-lg" />
			<Skeleton class="h-10 w-16 shrink-0 rounded-lg" />
		</div>
	</div>

	<div class="grid w-full grid-cols-1 {ui.gridLg}">
		<Card class="gap-0 overflow-hidden border-border bg-card/25 py-0 shadow-sm backdrop-blur-md">
			<CardContent class="p-0">
				<div class="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
					<Skeleton class="h-4 w-36" />
					<Skeleton class="h-8 w-24 rounded-md" />
				</div>
				<div class="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(18rem,1fr))]">
					{#each Array.from({ length: 2 }) as _, index (index)}
						<Card class="gap-0 border-border/60 bg-card/45 py-0">
							<div class="flex flex-col gap-2 px-3 py-4">
								<div class="flex items-start gap-2.5">
									<Skeleton class="size-9 shrink-0 rounded-md" />
									<div class="min-w-0 flex-1 space-y-1.5">
										<Skeleton class="h-4 w-full" />
										<Skeleton class="h-3 w-24" />
									</div>
								</div>
								<div class="flex flex-col gap-2 border-t border-border/40 pt-2">
									<div class="flex flex-wrap gap-2">
										<Skeleton class="h-5 w-16 rounded-md" />
										<Skeleton class="h-5 w-14 rounded-md" />
									</div>
									<Skeleton class="h-1.5 w-full rounded-full" />
								</div>
							</div>
						</Card>
					{/each}
				</div>
			</CardContent>
		</Card>

		<Card
			class="flex min-h-[8.75rem] items-center justify-center border-dashed border-border-strong/30 bg-card/25 py-0 backdrop-blur-md"
		>
			<CardContent class="flex flex-col items-center gap-4 p-4">
				<Skeleton class="size-10 rounded-lg" />
				<Skeleton class="h-4 w-20" />
			</CardContent>
		</Card>
	</div>
</div>
