import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	const legacyShortReport = pathname.match(/^\/p\/([^/]+)(\/.*)?$/);
	if (legacyShortReport) {
		const suffix = legacyShortReport[2] ?? '';
		throw redirect(301, `/report/${legacyShortReport[1]}${suffix}${search}`);
	}

	const legacyProject = pathname.match(/^\/project\/([^/]+)(\/.*)?$/);
	if (legacyProject) {
		const suffix = legacyProject[2] ?? '';
		throw redirect(301, `/report/${legacyProject[1]}${suffix}${search}`);
	}

	const legacyGroup = pathname.match(/^\/g\/([^/]+)$/);
	if (legacyGroup) {
		throw redirect(301, `/group/${legacyGroup[1]}${search}`);
	}

	return resolve(event);
};
