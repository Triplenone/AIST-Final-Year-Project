import path from 'path';
import { defineConfig } from '@playwright/test';

const demoFolder = process.env.DEMO_RECORDING_DIR ?? 'demo-recordings';
const outputDir = path.resolve(__dirname, '..', 'docs', 'demo records', demoFolder);

export default defineConfig({
  testDir: './tests/ui',
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8000',
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  outputDir
});
