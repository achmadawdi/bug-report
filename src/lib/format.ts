export const EMPTY_DISPLAY = '—';

export function displayText(value: string | undefined | null): string {
	if (value === undefined || value === null || value.trim() === '') {
		return EMPTY_DISPLAY;
	}
	return value;
}

export function displayList(values: string[] | undefined | null): string[] {
	if (!values || values.length === 0) {
		return [EMPTY_DISPLAY];
	}
	return values;
}

export function displayNumber(value: number | undefined | null): string {
	if (value === undefined || value === null || Number.isNaN(value)) {
		return EMPTY_DISPLAY;
	}
	return String(value);
}

export function displayCount(value: number | undefined | null): string {
	if (value === undefined || value === null || value === 0) {
		return EMPTY_DISPLAY;
	}
	return String(value);
}
