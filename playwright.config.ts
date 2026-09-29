import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run the app in AI_MODE=mock with every API key blanked out:
 * they prove the demo's plan B works with no network and no credentials.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:3200", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "pnpm dev --port 3200",
    url: "http://localhost:3200",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      AI_MODE: "mock",
      ANTHROPIC_API_KEY: "",
      VOYAGE_API_KEY: "",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
