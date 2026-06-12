<script lang="ts">
	import type { EvidenceMedia, Issue } from '$lib/types.js';
	import {
		detectMediaTypeFromFile,
		pendingItemToPreview,
		revokePendingPreview,
		type PendingEvidenceItem
	} from '$lib/evidence.js';
	import {
		validatePendingFile,
		validatePendingUrl
	} from '$lib/evidence-upload.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger
	} from '$lib/components/ui/select/index.js';
	import EvidenceLightbox from './EvidenceLightbox.svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import LinkIcon from '@lucide/svelte/icons/link';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import PlayIcon from '@lucide/svelte/icons/play';
	import { ui } from '$lib/ui-layout.js';

	let {
		issue = $bindable(),
		pending = $bindable<PendingEvidenceItem[]>([]),
		mode = 'issue',
		idPrefix = ''
	}: {
		issue?: Issue;
		pending?: PendingEvidenceItem[];
		mode?: 'issue' | 'pending';
		idPrefix?: string;
	} = $props();

	let uploading = $state(false);
	let addingUrl = $state(false);
	let evidenceUrl = $state('');
	let evidenceCaption = $state('');
	let uploadCaption = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);
	let urlType = $state<'image' | 'video' | 'auto'>('auto');
	let previewMedia = $state<EvidenceMedia | null>(null);
	let lightboxOpen = $state(false);

	const isPending = $derived(mode === 'pending');
	const attachedCount = $derived(
		isPending ? pending.length : (issue?.evidence_media?.length ?? 0)
	);

	function fieldId(name: string) {
		return `${idPrefix}${name}`;
	}

	function openPreview(media: EvidenceMedia) {
		previewMedia = media;
		lightboxOpen = true;
	}

	function queueFile() {
		const file = fileInput?.files?.[0];
		if (!file) {
			toast.error('Choose a file to upload');
			return;
		}

		const error = validatePendingFile(file);
		if (error) {
			toast.error(error);
			return;
		}

		const type = detectMediaTypeFromFile(file);
		if (!type) {
			toast.error('Could not determine media type');
			return;
		}

		pending = [
			...pending,
			{
				kind: 'file',
				id: crypto.randomUUID(),
				file,
				caption: uploadCaption.trim() || undefined,
				previewUrl: URL.createObjectURL(file),
				type
			}
		];

		uploadCaption = '';
		if (fileInput) fileInput.value = '';
		toast.success('File queued');
	}

	function queueUrl() {
		const url = evidenceUrl.trim();
		if (!url) {
			toast.error('Paste a URL first');
			return;
		}

		const result = validatePendingUrl(url, urlType);
		if ('error' in result) {
			toast.error(result.error);
			return;
		}

		pending = [
			...pending,
			{
				kind: 'url',
				id: crypto.randomUUID(),
				url,
				caption: evidenceCaption.trim() || undefined,
				type: result.type
			}
		];

		evidenceUrl = '';
		evidenceCaption = '';
		urlType = 'auto';
		toast.success('URL queued');
	}

	function removePending(id: string) {
		const item = pending.find((entry) => entry.id === id);
		if (item) revokePendingPreview(item);
		pending = pending.filter((entry) => entry.id !== id);
	}
</script>

<div class="{ui.section} rounded-lg border border-border {ui.cardPadding}">
	<div class="flex items-center justify-between {ui.grid}">
		<div>
			<h4 class="text-sm font-semibold">Evidence Media</h4>
			<p class="text-xs text-muted-foreground">
				{#if isPending}
					Attach files or URLs now — they upload when you click Add Bug.
				{:else}
					Upload files or paste image/video URLs.
				{/if}
			</p>
		</div>
		<span class="text-xs text-muted-foreground">{attachedCount} attached</span>
	</div>

	{#if isPending && pending.length > 0}
		<div class="grid grid-cols-2 {ui.grid} sm:grid-cols-3">
			{#each pending as item (item.id)}
				{@const media = pendingItemToPreview(item)}
				<div class="group relative overflow-hidden rounded-md border border-border">
					<button type="button" class="block w-full" onclick={() => openPreview(media)}>
						{#if media.type === 'image'}
							<img
								src={media.src}
								alt={media.caption ?? 'Evidence'}
								class="aspect-video w-full object-cover"
							/>
						{:else}
							<div class="flex aspect-video items-center justify-center bg-black/60">
								<PlayIcon class="size-8 text-white" />
							</div>
						{/if}
					</button>

					<Button
						type="button"
						size="icon-sm"
						variant="destructive"
						class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
						onclick={() => removePending(item.id)}
					>
						<Trash2Icon class="size-3.5" />
					</Button>

					{#if media.caption}
						<p class="truncate px-2 py-1 text-[11px] text-muted-foreground">{media.caption}</p>
					{/if}
				</div>
			{/each}
		</div>
	{:else if !isPending && attachedCount > 0}
		<div class="grid grid-cols-2 {ui.grid} sm:grid-cols-3">
			{#each issue?.evidence_media ?? [] as media (media.src)}
				<div class="group relative overflow-hidden rounded-md border border-border">
					<button type="button" class="block w-full" onclick={() => openPreview(media)}>
						{#if media.type === 'image'}
							<img
								src={media.src}
								alt={media.caption ?? 'Evidence'}
								class="aspect-video w-full object-cover"
							/>
						{:else}
							<div class="flex aspect-video items-center justify-center bg-black/60">
								<PlayIcon class="size-8 text-white" />
							</div>
						{/if}
					</button>

					<form
						method="POST"
						action="?/removeEvidence"
						class="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
						use:enhance={() => {
							return async ({ result, update }) => {
								try {
									await update();
									if (result.type === 'success' && issue) {
										const issueId = issue.id;
										const report = (result.data as { report?: { issues: Issue[] } })?.report;
										const updated = report?.issues.find((item) => item.id === issueId);
										if (updated) issue = updated;
										toast.success('Evidence removed');
									} else if (result.type === 'failure') {
										toast.error(
											(result.data as { message?: string })?.message ??
												'Failed to remove evidence'
										);
									} else if (result.type === 'error') {
										toast.error('An unexpected error occurred while removing evidence');
									}
								} catch {
									toast.error('An unexpected error occurred while removing evidence');
								}
							};
						}}
					>
						<input type="hidden" name="id" value={issue?.id} />
						<input type="hidden" name="src" value={media.src} />
						<Button type="submit" size="icon-sm" variant="destructive">
							<Trash2Icon class="size-3.5" />
						</Button>
					</form>

					{#if media.caption}
						<p class="truncate px-2 py-1 text-[11px] text-muted-foreground">{media.caption}</p>
					{/if}
				</div>
			{/each}
		</div>
	{:else}
		<p class="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
			{#if isPending}
				No media queued yet.
			{:else}
				No media attached yet.
			{/if}
		</p>
	{/if}

	{#if isPending}
		<div class="grid {ui.grid} rounded-md border border-border/60 {ui.cardPadding}">
			<div class={ui.field}>
				<Label for={fieldId('evidence-file')} class={ui.label}>Upload file</Label>
				<Input
					bind:ref={fileInput}
					id={fieldId('evidence-file')}
					type="file"
					class={ui.input}
					accept="image/*,video/*"
				/>
			</div>
			<div class={ui.field}>
				<Label for={fieldId('upload-caption')} class={ui.label}>Caption (optional)</Label>
				<Input
					id={fieldId('upload-caption')}
					class={ui.input}
					placeholder="Short description"
					bind:value={uploadCaption}
				/>
			</div>
			<Button type="button" size="sm" onclick={queueFile}>
				<UploadIcon class="size-4" />
				Queue file
			</Button>
		</div>

		<div class="grid {ui.grid} rounded-md border border-border/60 {ui.cardPadding}">
			<div class={ui.field}>
				<Label for={fieldId('evidence-url')} class={ui.label}>Paste URL</Label>
				<Input
					id={fieldId('evidence-url')}
					type="url"
					class={ui.input}
					placeholder="https://..."
					bind:value={evidenceUrl}
				/>
			</div>
			<div class="grid {ui.grid} sm:grid-cols-2">
				<div class={ui.field}>
					<Label class={ui.label}>Media type</Label>
					<Select
						type="single"
						value={urlType}
						onValueChange={(value) => {
							if (value) urlType = value as typeof urlType;
						}}
					>
						<SelectTrigger class={ui.selectTrigger}>
							{urlType === 'auto' ? 'Auto-detect' : urlType}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="auto">Auto-detect</SelectItem>
							<SelectItem value="image">Image</SelectItem>
							<SelectItem value="video">Video</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div class={ui.field}>
					<Label for={fieldId('url-caption')} class={ui.label}>Caption (optional)</Label>
					<Input id={fieldId('url-caption')} class={ui.input} bind:value={evidenceCaption} />
				</div>
			</div>
			<Button type="button" size="sm" variant="outline" onclick={queueUrl}>
				<LinkIcon class="size-4" />
				Queue URL
			</Button>
		</div>
	{:else}
		<form
			method="POST"
			action="?/uploadEvidence"
			enctype="multipart/form-data"
			class="grid {ui.grid} rounded-md border border-border/60 {ui.cardPadding}"
			use:enhance={() => {
				uploading = true;
				return async ({ result, update }) => {
					try {
						await update();
						if (result.type === 'success' && issue) {
							const issueId = issue.id;
							const report = (result.data as { report?: { issues: Issue[] } })?.report;
							const updated = report?.issues.find((item) => item.id === issueId);
							if (updated) issue = updated;
							toast.success('Evidence uploaded');
						} else if (result.type === 'failure') {
							toast.error(
								(result.data as { message?: string })?.message ?? 'Failed to upload evidence'
							);
						} else if (result.type === 'error') {
							toast.error('An unexpected error occurred while uploading evidence');
						}
					} finally {
						uploading = false;
					}
				};
			}}
		>
			<input type="hidden" name="id" value={issue?.id} />
			<div class={ui.field}>
				<Label for={fieldId('evidence-file')} class={ui.label}>Upload file</Label>
				<Input
					id={fieldId('evidence-file')}
					name="file"
					type="file"
					class={ui.input}
					accept="image/*,video/*"
					required
				/>
			</div>
			<div class={ui.field}>
				<Label for={fieldId('upload-caption')} class={ui.label}>Caption (optional)</Label>
				<Input
					id={fieldId('upload-caption')}
					name="caption"
					class={ui.input}
					placeholder="Short description"
				/>
			</div>
			<Button type="submit" size="sm" disabled={uploading}>
				<UploadIcon class="size-4" />
				{uploading ? 'Uploading...' : 'Upload'}
			</Button>
		</form>

		<form
			method="POST"
			action="?/addEvidenceUrl"
			class="grid {ui.grid} rounded-md border border-border/60 {ui.cardPadding}"
			use:enhance={() => {
				addingUrl = true;
				return async ({ result, update }) => {
					try {
						await update();
						if (result.type === 'success' && issue) {
							const issueId = issue.id;
							const report = (result.data as { report?: { issues: Issue[] } })?.report;
							const updated = report?.issues.find((item) => item.id === issueId);
							if (updated) issue = updated;
							evidenceUrl = '';
							evidenceCaption = '';
							urlType = 'auto';
							toast.success('Evidence link added');
						} else if (result.type === 'failure') {
							toast.error(
								(result.data as { message?: string })?.message ?? 'Failed to add evidence URL'
							);
						} else if (result.type === 'error') {
							toast.error('An unexpected error occurred while adding the evidence URL');
						}
					} finally {
						addingUrl = false;
					}
				};
			}}
		>
			<input type="hidden" name="id" value={issue?.id} />
			{#if urlType !== 'auto'}
				<input type="hidden" name="type" value={urlType} />
			{/if}
			<div class={ui.field}>
				<Label for={fieldId('evidence-url')} class={ui.label}>Paste URL</Label>
				<Input
					id={fieldId('evidence-url')}
					name="url"
					type="url"
					class={ui.input}
					placeholder="https://..."
					bind:value={evidenceUrl}
					required
				/>
			</div>
			<div class="grid {ui.grid} sm:grid-cols-2">
				<div class={ui.field}>
					<Label class={ui.label}>Media type</Label>
					<Select
						type="single"
						value={urlType}
						onValueChange={(value) => {
							if (value) urlType = value as typeof urlType;
						}}
					>
						<SelectTrigger class={ui.selectTrigger}>
							{urlType === 'auto' ? 'Auto-detect' : urlType}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="auto">Auto-detect</SelectItem>
							<SelectItem value="image">Image</SelectItem>
							<SelectItem value="video">Video</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<div class={ui.field}>
					<Label for={fieldId('url-caption')} class={ui.label}>Caption (optional)</Label>
					<Input id={fieldId('url-caption')} name="caption" class={ui.input} bind:value={evidenceCaption} />
				</div>
			</div>
			<Button type="submit" size="sm" variant="outline" disabled={addingUrl}>
				<LinkIcon class="size-4" />
				{addingUrl ? 'Adding...' : 'Add URL'}
			</Button>
		</form>
	{/if}
</div>

<EvidenceLightbox bind:media={previewMedia} bind:open={lightboxOpen} />
