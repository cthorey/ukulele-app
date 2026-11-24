/**
 * Akkord-Spiel im Takt: Die Akkorde laufen zum Klick auf eine Linie zu, gewechselt wird genau dort. Hier stehen Ablauf,
 * Bewertung je Akkord, Sterne und Tempo – ohne DOM und Audio, damit es sich testen lässt.
 */

export type Grade = 'perfect' | 'good' | 'late' | 'miss';

export const POINTS: Record<Grade, number> = { perfect: 3, good: 2, late: 1, miss: 0 };

/** Vorzählen: ein Takt Klicks, bevor der erste Akkord kommt. */
export const COUNT_IN = 4;
/** Akkordwechsel je Runde. */
export const CHANGES = 12;
/** So viele Schläge vor seinem Einsatz gilt ein Akkord schon (wer etwas früh wechselt, zählt mit). */
export const EARLY = 0.5;
/**
 * Der Lauscher meldet einen Akkord erst nach zwei passenden Messungen im 80-ms-Raster, dazu der Spitzenhalter: Im Mittel
 * kommt die Meldung so viel später als der Anschlag.
 */
export const DETECT_LAG = 0.17;

export const START_BPM = 60;
export const MIN_BPM = 40;
export const MAX_BPM = 120;
export const BPM_STEP = 5;

/** Reihenfolge der Akkorde: zwei wechseln sich ab, mehr kommen zufällig, aber nie zweimal derselbe hintereinander. */
export function sequence(chords: string[], count = CHANGES, rnd: () => number = Math.random): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    if (chords.length < 2) out.push(chords[0]);
    else if (chords.length === 2) out.push(chords[i % 2]);
    else {
      let next = out.length ? out[out.length - 1] : '';
      while (next === (out.length ? out[out.length - 1] : '')) next = chords[Math.floor(rnd() * chords.length)];
      out.push(next);
    }
  }
  return out;
}

/** Schlag, auf dem Akkord `i` einsetzt (der erste nach dem Vorzählen). */
export function startBeat(i: number, beatsPerChord: number): number {
  return COUNT_IN + i * beatsPerChord;
}

/**
 * Welcher Akkord gerade erwartet wird: ab EARLY Schlägen vor seinem Einsatz bis kurz vor dem nächsten. -1 beim Vorzählen,
 * `count` nach dem Ende.
 */
export function expectedIndex(beat: number, beatsPerChord: number, count = CHANGES): number {
  const i = Math.floor((beat - COUNT_IN + EARLY) / beatsPerChord);
  if (i < 0) return -1;
  return Math.min(i, count);
}

/** Bewertung nach Abstand zum Einsatz in Schlägen (negativ = zu früh). */
export function grade(offsetBeats: number): Grade {
  const a = Math.abs(offsetBeats);
  if (a <= 0.35) return 'perfect';
  if (a <= 1) return 'good';
  return 'late';
}

/** 0–3 Sterne nach dem Anteil der möglichen Punkte. */
export function starsFor(grades: Grade[]): number {
  if (!grades.length) return 0;
  let pts = 0;
  for (const g of grades) pts += POINTS[g];
  const ratio = pts / (grades.length * POINTS.perfect);
  return ratio >= 0.8 ? 3 : ratio >= 0.55 ? 2 : ratio >= 0.3 ? 1 : 0;
}

/** Tempo für die nächste Runde: bei drei Sternen etwas schneller, bei höchstens einem etwas langsamer. */
export function nextBpm(bpm: number, stars: number): number {
  if (stars >= 3) return Math.min(MAX_BPM, bpm + BPM_STEP);
  if (stars <= 1) return Math.max(MIN_BPM, bpm - BPM_STEP);
  return bpm;
}
