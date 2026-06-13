export type LinkedTextPart =
	| { type: 'text'; value: string }
	| { type: 'link'; label: string; href: string };

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;
const BARE_URL_RE = /https?:\/\/[^\s<>\[\]"']+/g;

function normalizeHref(href: string): string | null {
	const trimmed = href.trim();
	try {
		const url = new URL(trimmed);
		if (url.protocol === 'http:' || url.protocol === 'https:') {
			return url.href;
		}
	} catch {
		return null;
	}
	return null;
}

function trimTrailingPunctuation(url: string): string {
	return url.replace(/[.,;:!?)]+$/g, '');
}

function parseBareUrls(text: string): LinkedTextPart[] {
	const parts: LinkedTextPart[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(BARE_URL_RE)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			parts.push({ type: 'text', value: text.slice(lastIndex, index) });
		}

		const raw = match[0];
		const href = normalizeHref(trimTrailingPunctuation(raw));
		if (href) {
			parts.push({ type: 'link', label: href, href });
			lastIndex = index + raw.length;
		} else {
			parts.push({ type: 'text', value: raw });
			lastIndex = index + raw.length;
		}
	}

	if (lastIndex < text.length) {
		parts.push({ type: 'text', value: text.slice(lastIndex) });
	}

	if (parts.length === 0 && text) {
		parts.push({ type: 'text', value: text });
	}

	return parts;
}

export function parseLinkedText(input: string): LinkedTextPart[] {
	if (!input) return [];

	const parts: LinkedTextPart[] = [];
	let lastIndex = 0;

	for (const match of input.matchAll(MARKDOWN_LINK_RE)) {
		const index = match.index ?? 0;
		if (index > lastIndex) {
			parts.push(...parseBareUrls(input.slice(lastIndex, index)));
		}

		const label = match[1];
		const href = normalizeHref(match[2]);
		if (href) {
			parts.push({ type: 'link', label, href });
		} else {
			parts.push({ type: 'text', value: match[0] });
		}

		lastIndex = index + match[0].length;
	}

	if (lastIndex < input.length) {
		parts.push(...parseBareUrls(input.slice(lastIndex)));
	}

	return parts.length > 0 ? parts : [{ type: 'text', value: input }];
}
