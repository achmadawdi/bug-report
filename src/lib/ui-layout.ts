/** Shared spacing and layout tokens for consistent UI across pages. */
export const ui = {
	pageShell: 'mx-auto max-w-7xl px-4 py-8 md:px-6',
	pageShellNarrow: 'mx-auto max-w-4xl px-4 py-8 md:px-6',
	pageStack: 'flex flex-col gap-6',
	cardPanel: 'gap-0 border-border bg-card py-0',
	cardPadding: 'p-4',
	cardHeader: 'px-4 py-3',
	cardContent: 'px-4 pb-4 pt-0',
	field: 'space-y-2',
	section: 'space-y-4',
	formSections: 'space-y-6',
	grid: 'gap-3',
	gridLg: 'gap-4',
	iconTile: 'flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10',
	iconTileIcon: 'size-4 text-primary',
	overlayHeader: 'shrink-0 space-y-1 border-b border-border/60 px-6 py-5 pr-14',
	overlayBody: 'flex-1 space-y-6 overflow-y-auto px-6 py-5',
	overlayFooter:
		'shrink-0 flex-row justify-end gap-2 border-t border-border/60 bg-muted/20 px-6 py-4',
	label: 'text-xs font-medium text-muted-foreground',
	sectionTitle: 'text-xs font-semibold tracking-wide text-muted-foreground uppercase',
	input: 'h-9 bg-background',
	textarea: 'min-h-20 resize-y bg-background leading-relaxed',
	textareaSm: 'min-h-16 resize-y bg-background leading-relaxed',
	selectTrigger: 'h-9 w-full bg-background',
	controlSm: 'h-8',
	badgeRow: 'flex flex-wrap items-center gap-2'
} as const;
