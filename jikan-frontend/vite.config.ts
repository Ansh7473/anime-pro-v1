import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:3001',
                changeOrigin: true,
            },
            '/consumet': {
                target: 'https://api.consumet.org',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/consumet/, ''),
                secure: false,
            }
        }
    }
})