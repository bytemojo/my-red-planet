import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: './',
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        astronautQuiz: fileURLToPath(new URL('./astronaut-quiz.html', import.meta.url)),
      },
    },
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
