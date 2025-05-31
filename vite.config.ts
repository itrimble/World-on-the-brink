import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: { // Optional: configure dev server
  //   port: 3000,
  //   open: true,
  // },
  build: {
    outDir: 'dist', // Default output directory
    sourcemap: true, // Optional: generate source maps for production build
  },
  // resolve: { // Optional: if aliases or other resolve options are needed
  //   alias: {
  //     '@': '/src', // Example alias
  //   },
  // },
});
