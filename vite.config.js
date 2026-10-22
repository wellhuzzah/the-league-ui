import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
	plugins: [react()],
	server: {
		host: true,
		port: 5174,
		strictPort: true,
		allowedHosts: ['theleague.letsfriggen.party'],
		// Mirrors Caddy: strip /api and send to uvicorn, which listens on 127.0.0.1 only
		proxy: {
			'/api': {
				target: 'http://127.0.0.1:8001',
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},
})