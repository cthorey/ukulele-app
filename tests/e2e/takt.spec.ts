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
  await expect(page.locator('.beat-block')).toHaveCount(12);
  // beim Vorzählen zählt Tippen noch nicht
  await page.getByRole('button', { name: 'Geschafft' }).click();
  await expect(page.locator('.beat-block.perfect, .beat-block.good, .beat-block.late')).toHaveCount(0);
  await expect(page.locator('.game-target .card-label')).toHaveText('Spiel', { timeout: 8000 });
  await page.getByRole('button', { name: 'Geschafft' }).click();
  await expect(page.locator('.beat-block').first()).toHaveClass(/perfect|good|late/);
  await expect(page.locator('.stats .score')).not.toHaveText('0');
});
