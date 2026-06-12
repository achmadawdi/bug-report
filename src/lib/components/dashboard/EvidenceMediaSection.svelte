<script lang="ts">
	import type { EvidenceMedia, Issue } from '$lib/types.js';
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

	let { issue = $bindable() }: { issue: Issue } = $props();

	let uploading = $state(false);
	let addingUrl = $state(false);
	let evidenceUrl = $state('');
	let evidenceCaption = $state('');
	let urlType = $state<'image' | 'video' | 'auto'>('auto');
	let previewMedia = $state<EvidenceMedia | null>(null);
	let lightboxOpen = $state(false);

	function openPreview(media: EvidenceMedia) {
		previewMedia = media;
		lightboxOpen = true;
	}
</script>

<div class="space-y-4 rounded-lg border border-border p-4">
	<div class="flex items-center justify-between gap-3">
		<div>
			<h4 class="text-sm font-semibold">Evidence Media</h4>
			<p class="text-xs text-muted-foreground">Upload files or paste image/video URLs.</p>
		</div>
		<span class="text-xs text-muted-foreground">
			{issue.evidence_media?.length ?? 0} attached
		</span>
	</div>

	{#if (issue.evidence_media?.length ?? 0) > 0}
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			{#each issue.evidence_media ?? [] as media (media.src)}
				<div class="group relative overflow-hidden rounded-md border border-border">
					<button
						type="button"
						class="block w-full"
						onclick={() => openPreview(media)}
					>
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
									if (result.type === 'success') {
										const report = (result.data as { report?: { issues: Issue[] } })?.report;
										const updated = report?.issues.find((item) => item.id === issue.id);
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
						<input type="hidden" name="id" value={issue.id} />
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
			No media attached yet.
		</p>
	{/if}

	<form
		method="POST"
		action="?/uploadEvidence"
		enctype="multipart/form-data"
		class="grid gap-3 rounded-md border border-border/60 p-3"
		use:enhance={() => {
			uploading = true;
			return async ({ result, update }) => {
				try {
					await update();
					if (result.type === 'success') {
						const report = (result.data as { report?: { issues: Issue[] } })?.report;
						const updated = report?.issues.find((item) => item.id === issue.id);
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
		<input type="hidden" name="id" value={issue.id} />
		<div class="space-y-1.5">
			<Label for="evidence-file">Upload file</Label>
			<Input id="evidence-file" name="file" type="file" accept="image/*,video/*" required />
		</div>
		<div class="space-y-1.5">
			<Label for="upload-caption">Caption (optional)</Label>
			<Input id="upload-caption" name="caption" placeholder="Short description" />
		</div>
		<Button type="submit" size="sm" disabled={uploading}>
			<UploadIcon class="size-4" />
			{uploading ? 'Uploading...' : 'Upload'}
		</Button>
	</form>

	<form
		method="POST"
		action="?/addEvidenceUrl"
		class="grid gap-3 rounded-md border border-border/60 p-3"
		use:enhance={() => {
			addingUrl = true;
			return async ({ result, update }) => {
				try {
					await update();
					if (result.type === 'success') {
						const report = (result.data as { report?: { issues: Issue[] } })?.report;
						const updated = report?.issues.find((item) => item.id === issue.id);
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
		<input type="hidden" name="id" value={issue.id} />
		{#if urlType !== 'auto'}
			<input type="hidden" name="type" value={urlType} />
		{/if}
		<div class="space-y-1.5">
			<Label for="evidence-url">Paste URL</Label>
			<Input
				id="evidence-url"
				name="url"
				type="url"
				placeholder="https://..."
				bind:value={evidenceUrl}
				required
			/>
		</div>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="space-y-1.5">
				<Label>Media type</Label>
				<Select
					type="single"
					value={urlType}
					onValueChange={(value) => {
						if (value) urlType = value as typeof urlType;
					}}
				>
					<SelectTrigger class="w-full">
						{urlType === 'auto' ? 'Auto-detect' : urlType}
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="auto">Auto-detect</SelectItem>
						<SelectItem value="image">Image</SelectItem>
						<SelectItem value="video">Video</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div class="space-y-1.5">
				<Label for="url-caption">Caption (optional)</Label>
				<Input id="url-caption" name="caption" bind:value={evidenceCaption} />
			</div>
		</div>
		<Button type="submit" size="sm" variant="outline" disabled={addingUrl}>
			<LinkIcon class="size-4" />
			{addingUrl ? 'Adding...' : 'Add URL'}
		</Button>
	</form>
</div>

<EvidenceLightbox bind:media={previewMedia} bind:open={lightboxOpen} />
