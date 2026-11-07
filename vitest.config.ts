import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['src/**/*.test.ts'],
    // Dates in podaci.json are local Zagreb time; pin the zone so date tests are stable.
    env: { TZ: 'Europe/Zagreb' },
  },
})
