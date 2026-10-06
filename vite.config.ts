// vite.config.ts — library-mode build for ESM + CJS + types
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
	plugins: [
		react(),
		dts({ include: ['src'], exclude: ['src/__tests__/**'], rollupTypes: true }),
	],
	build: {
		lib: {
			// index: everything, including the React hook and component (imports react).
			// core: the vanilla API only, for apps without React and for SSR.
			entry: { index: 'src/index.ts', core: 'src/core.ts' },
			formats: ['es', 'cjs'],
			fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'js' : 'cjs'}`,
		},
		rollupOptions: {
			// Only 'es' and 'cjs' formats are emitted — no UMD/IIFE — so no globals needed.
			external: ['react', 'react-dom', 'react/jsx-runtime'],
		},
	},
})
