/**
 * Verify the staff panel end to end WITHOUT sending an email: the admin API
 * generates a magic-link token, and a real browser opens /auth/confirm with it.
 *   pnpm tsx scripts/e2e-panel-login.mts [baseUrl]
 */
import { chromium } from "@playwright/test";
import { config } from "dotenv";
import { createAdminClient } from "../lib/supabase/admin";
config({ path: ".env.local", quiet: true });

const base = process.argv[2] ?? "http://localhost:3000";
const email = (process.env.STAFF_EMAILS ?? "").split(",")[0];
const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto(`${base}/panel`);
console.log("1. anonymous /panel ->", new URL(page.url()).pathname);

const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
if (error) throw error;
await page.goto(`${base}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=/panel`);
console.log("2. after magic link ->", new URL(page.url()).pathname);
await page.getByText("Panel del centro").waitFor();
const rows = await page.locator("main ul li a").count();
console.log("3. requests visible to staff (RLS):", rows);
console.log(
  "4. KPI texts:",
  (await page.locator("main section").first().innerText()).replace(/\s+/g, " ").slice(0, 220),
);
await page.getByText("Hotel Brisas de Getsemaní").first().click();
await page.getByText("Inversión (catálogo)").waitFor();
console.log("5. detail page ->", new URL(page.url()).pathname.replace(/[0-9a-f-]{36}/, ":id"));
await page.screenshot({ path: "docs/img/paso-08/panel-detalle.png", fullPage: true });
await page.goto(`${base}/panel`);
await page.screenshot({ path: "docs/img/paso-08/panel.png", fullPage: true });
await browser.close();
