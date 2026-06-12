<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Card } from '$lib/components/ui/card/index.js';
	import { ui } from '$lib/ui-layout.js';
</script>

<div
	class="{ui.pageShellNarrow} flex min-h-[calc(100vh-2.5rem)] flex-col items-center justify-center {ui.pageStack}"
>
	<div class="{ui.field} flex w-full flex-col items-center text-center">
		<Skeleton class="h-8 w-48" />
		<Skeleton class="h-4 w-72 max-w-full" />
	</div>

	<div class="grid w-full {ui.grid} sm:grid-cols-2">
		{#each Array.from({ length: 4 }) as _, index (index)}
			<Card class="h-full min-h-[131px] border-border bg-card">
				<div class="flex {ui.gridLg} {ui.cardPadding}">
					<Skeleton class="size-10 shrink-0 rounded-lg" />
					<div class="flex min-w-0 flex-1 flex-col {ui.gridLg}">
						<div class="space-y-2">
							<Skeleton class="h-3 w-24" />
							<Skeleton class="h-5 w-full" />
							<Skeleton class="h-3 w-32" />
						</div>
						<div class={ui.badgeRow}>
							<Skeleton class="h-5 w-20 rounded-full" />
							<Skeleton class="h-5 w-16 rounded-full" />
						</div>
					</div>
				</div>
			</Card>
		{/each}
	</div>
</div>
