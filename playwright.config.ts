import { defineConfig } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT || 3100);
export default defineConfig({
  testDir: "./tests/browser", fullyParallel: false, workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}`, browserName: "chromium" },
  webServer: { command: `npm run start -- --hostname 127.0.0.1 --port ${port}`, url: `http://127.0.0.1:${port}`, reuseExistingServer: false, timeout: 60000 },
});
