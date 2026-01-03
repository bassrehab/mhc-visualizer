import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Embed library build
  if (mode === 'embed') {
    return {
      plugins: [react(), tailwindcss()],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/embed.tsx'),
          name: 'ManifoldDial',
          fileName: 'embed',
          formats: ['umd', 'es'],
        },
        rollupOptions: {
          external: [],
          output: {
            globals: {},
            assetFileNames: 'embed.[ext]',
            exports: 'named',
          },
        },
        outDir: 'dist-embed',
        cssCodeSplit: false,
      },
    }
  }

  // Default: full app build
  return {
    plugins: [react(), tailwindcss()],
    base: '/mhc-visualizer/',
  }
})
