import { test, expect } from './fixtures.ts';

// Das künstliche Mikrofon spielt jede Sekunde einen C-Akkord (tools/make-wav.ts).

test('„Prüf mich!“ erkennt einen echten C-Akkord', async ({ page }) => {
  await page.goto('#/akkord/C');
  await page.getByRole('button', { name: /Prüf mich/ }).click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await expect(page.locator('.feedback.good')).toContainText('schönes C', { timeout: 10000 });
});

test('„Prüf mich!“ lobt kein F, wenn C klingt', async ({ page }) => {
  await page.goto('#/akkord/F');
  await page.getByRole('button', { name: /Prüf mich/ }).click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await page.waitForTimeout(5000);
  await expect(page.locator('.feedback.good')).toHaveCount(0);
});

test('„Wartet auf mich“ geht weiter, sobald der Akkord klingt', async ({ page }) => {
  await page.goto('#/lied/row-row');
  await page.getByRole('button', { name: 'Wartet auf mich' }).click();
  await page.locator('.btn-play').click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await expect(page.locator('.wait-title')).toContainText('Spiel jetzt C');
  // ohne Tippen: das Mikrofon hört C und das Lied startet
  await expect(page.locator('.syl.now .syl-text')).toHaveText('Row,', { timeout: 10000 });
});

test('Akkord-Spiel zählt erkannte Akkorde', async ({ page }) => {
  await page.goto('#/spiel');
  await page.getByRole('button', { name: /C · F · G7/ }).click();
  await page.getByRole('button', { name: /C und F/ }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await expect(page.locator('.score').first()).toHaveText('1', { timeout: 10000 });
  await expect(page.locator('.game-target .chord-name')).toHaveText('F');
});

test('Akkord-Spiel im Takt: erst vorzählen, dann bewertet das Mikrofon den ersten Wechsel', async ({ page }) => {
  await page.goto('#/spiel');
  await page.getByRole('button', { name: 'Im Takt' }).click();
  await page.getByRole('button', { name: /C und Am/ }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await expect(page.locator('.hw-event')).toHaveCount(12);
  // vier Klicks bei 60 Schlägen pro Minute, dann hört das Mikrofon das C
  await expect(page.locator('.hw-event').first()).toHaveClass(/perfect|good|late/, { timeout: 12000 });
  await page.getByRole('button', { name: 'Aufhören' }).click();
  await expect(page.getByRole('button', { name: 'Im Takt' })).toHaveAttribute('aria-pressed', 'true');
});

test('Lied mit Hals: das Mikrofon bewertet jeden Anschlag, C zählt, G7 nicht', async ({ page }) => {
  await page.goto('#/lied/am-weihnachtsbaum');
  await page.getByRole('button', { name: 'Läuft durch' }).click();
  await page.getByRole('button', { name: 'Hals: Akkorde' }).click();
  await page.locator('.btn-play').click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await expect(page.locator('.hw-score')).toContainText('getroffen');
  await expect(page.locator('.hw-stage .hw-event.hit').first()).toBeAttached({ timeout: 12000 });
  // bei G7 (ab Schlag 8) hört das Mikrofon nur C: diese Anschläge gelten als verpasst
  await expect(page.locator('.hw-stage .hw-event.miss').first()).toBeAttached({ timeout: 15000 });
});

test('Blues: Akkorde begleiten – das Mikrofon hört das C im ersten Takt', async ({ page }) => {
  await page.goto('#/blues');
  await page.getByRole('button', { name: 'Akkorde · leicht' }).click();
  await page.getByRole('button', { name: 'Schnell' }).click();
  await page.getByRole('button', { name: /Ich höre zu/ }).click();
  await page.getByRole('button', { name: 'Ja, hör zu!' }).click();
  await page.getByRole('button', { name: /Start/ }).click();
  await expect(page.locator('.feedback')).toContainText('1 Akkord erkannt', { timeout: 12000 });
  await page.getByRole('button', { name: /Stopp/ }).click();
  await expect(page.locator('.feedback')).toContainText('Geschafft');
});
