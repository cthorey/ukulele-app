import { test, expect } from './fixtures.ts';

test('Akkord-Spiel im Takt ohne Mikrofon: Tempo wählen, Tippen auf „Geschafft“ wird bewertet', async ({ page }) => {
  await page.goto('#/spiel');
  await page.getByRole('button', { name: 'Im Takt' }).click();
  await expect(page.getByText('60 Schläge pro Minute')).toBeVisible();
  await page.getByRole('button', { name: 'Schneller' }).click();
  await expect(page.getByText('65 Schläge pro Minute')).toBeVisible();
  await page.getByRole('button', { name: 'Langsamer' }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: 'Ohne Mikrofon' }).click();
  await expect(page.locator('.hw-event')).toHaveCount(12);
  // beim Vorzählen zählt Tippen noch nicht
  await page.getByRole('button', { name: 'Geschafft' }).click();
  await expect(page.locator('.hw-event.perfect, .hw-event.good, .hw-event.late')).toHaveCount(0);
  await expect(page.locator('.highway')).toBeVisible();
  // Griff des ersten Akkords (C: A-Saite, 3. Bund) liegt schon auf dem Hals
  await expect(page.locator('.highway .fb-mark.now')).toHaveCount(1, { timeout: 6000 });
  // der Griff erscheint einen Schlag vor dem Einsatz; kurz danach ist der erste Akkord dran
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Geschafft' }).click();
  await expect(page.locator('.hw-event').first()).toHaveClass(/perfect|good|late/);
  await expect(page.locator('.stats .score')).not.toHaveText('0');
});
