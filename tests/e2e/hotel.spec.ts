import { expect, test } from "@playwright/test";

test("landing → hotel chat → simulation chart → approved pre-proposal (mock mode)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Innova Copilot" })).toBeVisible();
  await expect(page.getByText("Demo educativa.")).toBeVisible();

  await page.getByRole("link", { name: "Probar el copiloto" }).click();
  await page.getByRole("button", { name: "Hotel con filas en el check-in" }).click();

  // The agent searched the catalog and ran the deterministic simulation.
  await expect(page.getByText("Catálogo consultado")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Espera en el pico/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Línea de trabajo:").first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: /Simulación de operaciones/ }).first()).toBeVisible();

  // Regression: nothing may overflow horizontally (it once pushed the mobile layout to 972 px).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  // The user asks to save; the UI asks for approval before the tool runs.
  await page
    .getByLabel("Mensaje")
    .fill("Sí, guárdala por favor. Soy Marcela Pérez, del Hotel Brisas de Getsemaní.");
  await page.getByRole("button", { name: "Enviar" }).click();
  await page.getByRole("button", { name: "Sí, guardar" }).click({ timeout: 60_000 });

  await expect(page.getByText("Pre-propuesta · Hotel Brisas de Getsemaní")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/COP 8\.000\.000 – 25\.000\.000/).first()).toBeVisible();
});

test("basic accessibility: labeled input, lang and landmarks", async ({ page }) => {
  await page.goto("/copilot");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByLabel("Mensaje")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});
