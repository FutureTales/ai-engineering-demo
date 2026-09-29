/**
 * Screenshots for docs and slides, taken with Playwright.
 *
 *   pnpm tsx scripts/screenshots.ts <baseUrl> <outDir> [--chat]
 *
 * --chat sends the hotel case in /copilot and captures the answer with the
 * "Bajo el capó" panel open (costs one real API call in live mode).
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [base = "http://localhost:3000", outDir = "docs/img"] = process.argv
  .slice(2)
  .filter((a) => !a.startsWith("--"));
const withChat = process.argv.includes("--chat");

async function main() {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mobile.goto(base, { waitUntil: "networkidle" });
  await mobile.screenshot({ path: path.join(outDir, "landing-movil.png"), fullPage: true });

  if (withChat) {
    const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
    await page.goto(`${base}/copilot`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Hotel con filas en el check-in" }).click();
    await page.getByText("Bajo el capó").first().waitFor({ timeout: 120_000 });
    await page.getByText("Bajo el capó").first().click();
    await page.screenshot({ path: path.join(outDir, "chat-hotel.png"), fullPage: true });
    console.log(await page.locator("details").first().innerText());
  }
  await browser.close();
  console.log(`screenshots saved in ${outDir}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
