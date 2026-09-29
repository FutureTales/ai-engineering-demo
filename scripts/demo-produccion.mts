/**
 * Definition-of-done check + screenshots: runs the hotel case END TO END in
 * production with a real browser, then verifies the pre-proposal in /panel.
 *
 *   pnpm tsx scripts/demo-produccion.mts [baseUrl] [outDir]
 *
 * Costs one real conversation (~US$ 0.05). The panel login uses a magic link
 * generated with the admin API (no email is sent).
 */
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createAdminClient } from "../lib/supabase/admin";

config({ path: ".env.local", quiet: true });
const base = process.argv[2] ?? "https://innova-copilot.vercel.app";
const out = process.argv[3] ?? "docs/img/demo";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const t0 = Date.now();
const log: Record<string, unknown> = { base, startedAt: new Date().toISOString() };

await page.goto(`${base}/copilot`);
await page.getByRole("button", { name: "Hotel con filas en el check-in" }).click();
await page.getByText(/Espera en el pico/).waitFor({ timeout: 120_000 });
await page.getByText("Línea de trabajo:").first().waitFor({ timeout: 120_000 });
await page.getByText("Bajo el capó").first().waitFor({ timeout: 120_000 });
log.firstAnswerSeconds = Math.round((Date.now() - t0) / 1000);
const answer = await page.locator("ol li").nth(1).innerText();
log.classified = /process_design/.test(answer);
log.citesCatalog = (await page.locator('a[href*="data/catalog/servicios/"]').count()) > 0;
log.simulationChart = await page.getByText(/Espera en el pico/).isVisible();

await page.getByText("Catálogo consultado").first().scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(out, "01-busqueda-y-respuesta.png") });
await page.getByText(/Espera en el pico/).scrollIntoViewIfNeeded();
await page.mouse.wheel(0, -150);
await page.screenshot({ path: path.join(out, "02-simulacion.png") });

await page
  .getByLabel("Mensaje")
  .fill("Sí, guárdala por favor. Soy Marcela Pérez, del Hotel Brisas de Getsemaní.");
await page.getByRole("button", { name: "Enviar" }).click();
await page.getByRole("button", { name: "Sí, guardar" }).waitFor({ timeout: 120_000 });
await page.getByRole("button", { name: "Sí, guardar" }).scrollIntoViewIfNeeded();
await page.screenshot({ path: path.join(out, "03-aprobacion.png") });
await page.getByRole("button", { name: "Sí, guardar" }).click();
const card = page.getByText("Pre-propuesta · Hotel Brisas de Getsemaní");
await card.waitFor({ timeout: 120_000 });
await card.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await page.screenshot({ path: path.join(out, "04-pre-propuesta.png") });
log.savedBadge = await page.getByText("Guardada").first().isVisible();

// Panel: the request must be there.
const { data, error } = await createAdminClient().auth.admin.generateLink({
  type: "magiclink",
  email: (process.env.STAFF_EMAILS ?? "").split(",")[0],
});
if (error) throw error;
await page.goto(`${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=/panel`);
await page.getByText("Panel del centro").waitFor();
const firstRow = await page.locator("main ul li").first().innerText();
log.panelFirstRow = firstRow.replace(/\s+/g, " ");
log.inPanel = /Hotel Brisas de Getsemaní/.test(firstRow) && !/\(demo\)/.test(firstRow);
await page.screenshot({ path: path.join(out, "05-panel.png") });
await page.goto(`${base}/panel/salud`);
await page.getByText("Salud del asistente").first().waitFor();
await page.waitForTimeout(1500);
await page.screenshot({ path: path.join(out, "06-salud.png"), fullPage: true });

await browser.close();
log.totalSeconds = Math.round((Date.now() - t0) / 1000);
console.log(log);
writeFileSync(path.join(out, "resultado.json"), JSON.stringify(log, null, 2) + "\n");
