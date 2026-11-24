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

test('Lied mit Hals: Melodie läuft mit Silben auf den Saiten heran, die Akkorde dahinter, Akkorde als Griffe, zurück zu den Karten', async ({ page }) => {
  await page.goto('#/lied/row-row');
  await page.getByRole('button', { name: 'Hals: Melodie + Akkorde' }).click();
  await expect(page.locator('.hw-stage .highway')).toBeVisible();
  await expect(page.locator('.hw-stage .hw-name.syl').first()).toHaveText('Row,');
  await expect(page.locator('.hw-stage .hw-chord').first()).toHaveText('C');
  await expect(page.locator('.now-card')).toBeHidden();
  await page.getByRole('button', { name: 'Hals: Akkorde' }).click();
  await expect(page.locator('.hw-stage .hw-name').first()).toHaveText('C');
  // jeder Anschlag der Begleitung eine Spalte: beim Wechsel mit Bundzahlen, danach als Anschlagbalken
  expect(await page.locator('.hw-stage .hw-strum').count()).toBeGreaterThan(10);
  await page.reload();
  // die Wahl bleibt gespeichert
  await expect(page.getByRole('button', { name: 'Hals: Akkorde' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Karten' }).click();
  await expect(page.locator('.now-card')).toBeVisible();
  await expect(page.locator('.hw-stage')).toBeHidden();
});

test('Blues: beim Akkorde-Begleiten laufen die zwölf Takte als Griffe auf den Saiten heran', async ({ page }) => {
  await page.goto('#/blues');
  await expect(page.locator('.highway')).toHaveCount(0);
  await page.getByRole('button', { name: 'Akkorde · leicht' }).click();
  await expect(page.locator('.beat-card .highway')).toBeVisible();
  // jeder Anschlag des Schlagmusters in zwölf Takten, zweimal hintereinander für die Wiederholung
  expect(await page.locator('.beat-card .hw-event').count()).toBeGreaterThanOrEqual(2 * 12 * 4);
  await expect(page.locator('.beat-card .hw-arrow').first()).toHaveText('↓');
});

test('Lied mit Hals: läuft ohne Anhalten durch, auch wenn vorher „Wartet auf mich“ gewählt war', async ({ page }) => {
  await page.goto('#/lied/row-row');
  await page.getByRole('button', { name: 'Wartet auf mich' }).click();
  await page.getByRole('button', { name: 'Hals: Akkorde' }).click();
  await expect(page.getByRole('button', { name: 'Wartet auf mich' })).toBeHidden();
  await page.locator('.btn-play').click();
  await page.getByRole('button', { name: 'Ohne Mikrofon' }).click();
  // Einzähler und erster Akkordwechsel vorbei: kein „Spiel jetzt …“, das Lied läuft
  await page.waitForTimeout(6000);
  await expect(page.locator('.wait-title')).toHaveCount(0);
  await expect(page.locator('.btn-play')).toContainText('Pause');
  // zurück zu den Karten: „Wartet auf mich“ ist wieder da
  await page.getByRole('button', { name: 'Karten' }).click();
  await expect(page.getByRole('button', { name: 'Wartet auf mich' })).toBeVisible();
});
