import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	optimizeDeps: {
		// Pre-bundle icons used by lazily loaded routes (e.g. /report/.../print).
		include: ['@lucide/svelte/icons/printer']
	}
});
