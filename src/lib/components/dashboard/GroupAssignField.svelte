<script lang="ts">
	import type { ProjectGroupSummary } from '$lib/server/store.js';
	import { CREATE_NEW_GROUP } from '$lib/groups.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import { ui } from '$lib/ui-layout.js';

	let {
		id = 'group',
		groups = [],
		groupSlug = $bindable(''),
		newGroupName = $bindable('')
	}: {
		id?: string;
		groups?: ProjectGroupSummary[];
		groupSlug?: string;
		newGroupName?: string;
	} = $props();

	let creatingNew = $state(false);

	const selectValue = $derived(
		creatingNew || newGroupName.trim() ? CREATE_NEW_GROUP : groupSlug || 'none'
	);

	const showCreateInput = $derived(selectValue === CREATE_NEW_GROUP);

	const selectLabel = $derived(
		selectValue === 'none'
			? 'No group'
			: selectValue === CREATE_NEW_GROUP
				? 'Create new group'
				: (groups.find((group) => group.slug === selectValue)?.title ?? selectValue)
	);

	function handleSelectChange(value: string | undefined) {
		const next = value ?? 'none';

		if (next === CREATE_NEW_GROUP) {
			creatingNew = true;
			groupSlug = '';
			return;
		}

		creatingNew = false;
		newGroupName = '';

		if (next === 'none') {
			groupSlug = '';
			return;
		}

		groupSlug = next;
	}
</script>

<div class={ui.field}>
	<Label for="{id}-select" class={ui.label}>Project group</Label>
	<Select type="single" value={selectValue} onValueChange={handleSelectChange}>
		<SelectTrigger id="{id}-select" class={ui.selectTrigger}>
			{selectLabel}
		</SelectTrigger>
		<SelectContent>
			<SelectItem value="none">No group</SelectItem>
			{#each groups as group (group.slug)}
				<SelectItem value={group.slug}>{group.title}</SelectItem>
			{/each}
			<SelectItem value={CREATE_NEW_GROUP}>Create new group…</SelectItem>
		</SelectContent>
	</Select>

	{#if showCreateInput}
		<Input
			id="{id}-name"
			name="new_group_name"
			class={ui.input}
			placeholder="e.g. Defense Challenge"
			bind:value={newGroupName}
		/>
	{:else}
		<input type="hidden" name="new_group_name" value="" />
	{/if}

	<input type="hidden" name="group_slug" value={groupSlug || 'none'} />
</div>
