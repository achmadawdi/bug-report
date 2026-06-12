<script lang="ts">
	import type { Issue } from '$lib/types.js';
	import { mergeAreas } from '$lib/areas.js';
	import { SEVERITIES, STATUSES, STATUS_LABELS } from '$lib/constants.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import { EMPTY_DISPLAY } from '$lib/format.js';
	import { ui } from '$lib/ui-layout.js';

	export type IssueFormDraft = Omit<Issue, 'id' | 'evidence_media'>;

	let {
		draft = $bindable(),
		areas,
		formId,
		mode = 'edit',
		idPrefix = ''
	}: {
		draft: IssueFormDraft;
		areas: string[];
		formId?: string;
		mode?: 'add' | 'edit';
		idPrefix?: string;
	} = $props();

	const areaOptions = $derived(mergeAreas(areas));
	const isAdd = $derived(mode === 'add');

	function listToText(values: string[] | undefined) {
		return (values ?? []).join('\n');
	}

	function parseListInput(value: string): string[] {
		return value
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);
	}

	function fieldId(name: string) {
		return `${idPrefix}${name}`;
	}
</script>

<section class={ui.section}>
	<h3 class={ui.sectionTitle}>Issue</h3>

	<div class="grid {ui.grid} sm:grid-cols-2">
		<div class="{ui.field} sm:col-span-2">
			<Label for={fieldId('title')} class={ui.label}>Title</Label>
			<Input
				id={fieldId('title')}
				name="title"
				form={formId}
				class={ui.input}
				bind:value={draft.title}
				required
			/>
		</div>
		<div class="{ui.field} sm:col-span-2">
			<Label for={fieldId('category')} class={ui.label}>Category</Label>
			<Input
				id={fieldId('category')}
				name="category"
				form={formId}
				class={ui.input}
				bind:value={draft.category}
				required
			/>
		</div>
	</div>
</section>

<section class={ui.section}>
	<h3 class={ui.sectionTitle}>Classification</h3>

	<div class="grid {ui.grid} sm:grid-cols-2">
		<div class={ui.field}>
			<Label class={ui.label}>Area</Label>
			<Select
				type="single"
				value={draft.area}
				onValueChange={(value) => {
					if (value) draft.area = value;
				}}
			>
				<SelectTrigger class={ui.selectTrigger}>{draft.area}</SelectTrigger>
				<SelectContent>
					{#each areaOptions as area}
						<SelectItem value={area}>{area}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
			<input type="hidden" name="area" form={formId} value={draft.area} />
		</div>

		<div class={ui.field}>
			<Label class={ui.label}>Status</Label>
			<Select
				type="single"
				value={draft.status}
				onValueChange={(value) => {
					if (value) draft.status = value as Issue['status'];
				}}
			>
				<SelectTrigger class={ui.selectTrigger}>
					{STATUS_LABELS[draft.status]}
				</SelectTrigger>
				<SelectContent>
					{#each STATUSES as status}
						<SelectItem value={status}>{STATUS_LABELS[status]}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
			<input type="hidden" name="status" form={formId} value={draft.status} />
		</div>

		<div class={ui.field}>
			<Label class={ui.label}>Severity</Label>
			<Select
				type="single"
				value={draft.severity}
				onValueChange={(value) => {
					if (value) draft.severity = value as Issue['severity'];
				}}
			>
				<SelectTrigger class={ui.selectTrigger}>{draft.severity}</SelectTrigger>
				<SelectContent>
					{#each SEVERITIES as severity}
						<SelectItem value={severity}>{severity}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
			<input type="hidden" name="severity" form={formId} value={draft.severity} />
		</div>
	</div>
</section>

<section class={ui.section}>
	<h3 class={ui.sectionTitle}>Findings</h3>

	<div class={ui.field}>
		<Label for={fieldId('finding')} class={ui.label}>Findings (one per line)</Label>
		<Textarea
			id={fieldId('finding')}
			name="finding"
			form={formId}
			rows={3}
			class={ui.textarea}
			placeholder={isAdd ? undefined : EMPTY_DISPLAY}
			required={isAdd}
			value={listToText(draft.finding)}
			oninput={(event: Event) => {
				draft.finding = parseListInput((event.currentTarget as HTMLTextAreaElement).value);
			}}
		/>
	</div>

	<div class={ui.field}>
		<Label for={fieldId('expected_result')} class={ui.label}>Expected Result (one per line)</Label>
		<Textarea
			id={fieldId('expected_result')}
			name="expected_result"
			form={formId}
			rows={3}
			class={ui.textarea}
			placeholder={isAdd ? undefined : EMPTY_DISPLAY}
			required={isAdd}
			value={listToText(draft.expected_result)}
			oninput={(event: Event) => {
				draft.expected_result = parseListInput((event.currentTarget as HTMLTextAreaElement).value);
			}}
		/>
	</div>
</section>

<section class={ui.section}>
	<h3 class={ui.sectionTitle}>Additional Details</h3>

	<div class="grid {ui.grid} sm:grid-cols-2">
		<div class={ui.field}>
			<Label for={fieldId('evidence')} class={ui.label}>Evidence</Label>
			<Input
				id={fieldId('evidence')}
				name="evidence"
				form={formId}
				class={ui.input}
				placeholder={EMPTY_DISPLAY}
				bind:value={draft.evidence}
			/>
		</div>

		<div class={ui.field}>
			<Label for={fieldId('reason')} class={ui.label}>Reason</Label>
			<Input
				id={fieldId('reason')}
				name="reason"
				form={formId}
				class={ui.input}
				placeholder={EMPTY_DISPLAY}
				bind:value={draft.reason}
			/>
		</div>
	</div>

	<div class={ui.field}>
		<Label for={fieldId('suggested_text_or_behavior')} class={ui.label}>
			Suggested Text / Behavior
		</Label>
		<Textarea
			id={fieldId('suggested_text_or_behavior')}
			name="suggested_text_or_behavior"
			form={formId}
			rows={2}
			class={ui.textareaSm}
			placeholder={EMPTY_DISPLAY}
			value={listToText(draft.suggested_text_or_behavior)}
			oninput={(event: Event) => {
				draft.suggested_text_or_behavior = parseListInput(
					(event.currentTarget as HTMLTextAreaElement).value
				);
			}}
		/>
	</div>

	<div class={ui.field}>
		<Label for={fieldId('notes')} class={ui.label}>Notes</Label>
		<Textarea
			id={fieldId('notes')}
			name="notes"
			form={formId}
			rows={2}
			class={ui.textareaSm}
			placeholder={EMPTY_DISPLAY}
			bind:value={draft.notes}
		/>
	</div>
</section>
