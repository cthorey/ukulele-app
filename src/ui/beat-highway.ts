import { s } from './dom.ts';
import { STRINGS } from '../music/notes.ts';
import { t } from '../i18n.ts';
import type { Chord } from '../music/grip.ts';
import type { Grade } from '../music/beat-game.ts';

export interface Highway {
  el: SVGElement;
  /** Jedes Bild: Position in Schlägen, der gegriffene Akkord und – kurz vor dem Wechsel – der nächste. */
  update(beat: number, current: number, upcoming: number): void;
  mark(i: number, g: Grade): void;
}

/** Sichtbare Schläge rechts der Linie. */
const AHEAD = 7;

/**
 * Akkord-Spiel im Takt: links der Hals wie eine Tabulatur (oben die höchste Saite) mit dem Griff, der jetzt gilt; rechts
 * laufen die Saiten weiter, auf ihnen kommen die Akkorde als Bundzahlen je Saite heran. Erreicht ein Akkord den Hals,
 * wird angeschlagen; der Balken dahinter zeigt, wie lange er klingt. Gemessen wird in Bildschirmpixeln (`width`), damit
 * Schrift auf dem Handy so groß bleibt wie am Tablet.
 */
export function beatHighway(width: number, seq: Chord[], startBeats: number[], beatsPerChord: number, totalBeats: number, lefty: boolean): Highway {
  const n = STRINGS.length;
  const gap = n > 4 ? 28 : 38;
  const top = 44;
  const span = gap * (n - 1);
  const height = top + span + 30;
  let maxFret = 4;
  seq.forEach((c) => c.frets.forEach((f) => (maxFret = Math.max(maxFret, f))));
  const frets = maxFret;
  const x0 = 58;
  const openX = x0 - 22;
  const fw = Math.max(34, Math.min(72, (Math.min(width * 0.45, 330) - x0) / frets));
  const nowX = x0 + fw * frets + 18;
  const ppb = (width - nowX) / AHEAD;
  const yOf = (string: number) => top + (n - 1 - string) * gap;
  const fretX = (f: number) => x0 + fw * (f - 0.5);

  const svg = s('svg', {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    class: 'highway',
    role: 'img',
    'aria-label': t('Griffbrett'),
  });
  const g = lefty ? svg.appendChild(s('g', { transform: `matrix(-1 0 0 1 ${width} 0)` })) : svg;
  const text = (attrs: Record<string, string | number>, content: string) => {
    if (lefty) attrs.transform = `matrix(-1 0 0 1 ${2 * Number(attrs.x)} 0)`;
    return s('text', attrs, content);
  };

  // Hals
  g.appendChild(s('rect', { x: x0, y: top - 12, width: fw * frets + 4, height: span + 24, rx: 4, class: 'fb-wood' }));
  [3, 5, 7, 9].forEach((f) => {
    if (f <= frets) g.appendChild(s('circle', { cx: fretX(f), cy: top + span / 2, r: 5, class: 'fb-dot' }));
  });
  g.appendChild(s('rect', { x: x0 - 4, y: top - 12, width: 6, height: span + 24, class: 'fb-nut' }));
  for (let f = 1; f <= frets; f++) g.appendChild(s('rect', { x: x0 + fw * f - 1, y: top - 12, width: 2.5, height: span + 24, class: 'fb-fret' }));
  for (let f = 1; f <= frets; f++) g.appendChild(text({ x: fretX(f), y: height - 4, class: 'fb-num', 'text-anchor': 'middle' }, String(f)));
  for (let i = 0; i < n; i++) {
    g.appendChild(s('line', { x1: openX - 12, y1: yOf(i), x2: width, y2: yOf(i), class: 'fb-string' }));
    g.appendChild(text({ x: 2, y: yOf(i) + 5, class: 'fb-label' }, STRINGS[i].name));
  }
  const marks = g.appendChild(s('g', null));

  // Spur mit den heranlaufenden Akkorden, links an der Linie abgeschnitten
  const clipId = 'hw-clip';
  g.appendChild(s('defs', null, s('clipPath', { id: clipId }, s('rect', { x: nowX - 12, y: 0, width: width - nowX + 12, height }))));
  const lane = g.appendChild(s('g', { 'clip-path': `url(#${clipId})` }));
  const strip = lane.appendChild(s('g', null));
  for (let k = 0; k <= totalBeats; k++)
    strip.appendChild(s('line', { x1: k * ppb, y1: top - 16, x2: k * ppb, y2: top + span + 12, class: k % 4 === 0 ? 'hw-bar' : 'hw-beat' }));
  const events = seq.map((c, i) => {
    const x = startBeats[i] * ppb;
    const ev = strip.appendChild(s('g', { class: 'hw-event' }));
    c.frets.forEach((f, string) => {
      if (f < 0) return;
      ev.appendChild(s('rect', { x, y: yOf(string) - 5, width: beatsPerChord * ppb - 14, height: 10, rx: 5, class: 'hw-sustain' }));
    });
    c.frets.forEach((f, string) => {
      const y = yOf(string);
      if (f < 0) ev.appendChild(text({ x, y: y + 5, 'text-anchor': 'middle', class: 'hw-mute' }, '×'));
      else {
        ev.appendChild(s('circle', { cx: x, cy: y, r: gap > 28 ? 14 : 12, class: f === 0 ? 'hw-note open' : 'hw-note' }));
        ev.appendChild(text({ x, y: y + 5, 'text-anchor': 'middle', class: f === 0 ? 'hw-num open' : 'hw-num' }, String(f)));
      }
    });
    ev.appendChild(text({ x: x - 10, y: top - 20, class: 'hw-name' }, c.name));
    return ev;
  });
  g.appendChild(s('rect', { x: nowX - 2, y: top - 22, width: 4, height: span + 34, rx: 2, class: 'hw-now' }));

  const drawGrip = (c: Chord, kind: 'now' | 'next') => {
    c.frets.forEach((f, string) => {
      const y = yOf(string);
      if (f < 0) {
        if (kind === 'now') marks.appendChild(text({ x: openX, y: y + 5, 'text-anchor': 'middle', class: 'hw-mute' }, '×'));
        return;
      }
      if (f === 0) {
        if (kind === 'now') marks.appendChild(s('circle', { cx: openX, cy: y, r: 7, class: 'hw-open-mark' }));
        return;
      }
      marks.appendChild(s('circle', { cx: fretX(f), cy: y, r: kind === 'now' ? 12 : 11, class: `fb-mark ${kind}` }));
      const finger = c.fingers[string];
      if (finger) marks.appendChild(text({ x: fretX(f), y: y + 4.5, 'text-anchor': 'middle', class: `fb-mark-label ${kind}` }, String(finger)));
    });
  };

  let shown = '';
  return {
    el: svg,
    update(beat, current, upcoming) {
      strip.setAttribute('transform', `translate(${nowX - beat * ppb} 0)`);
      const key = current + '/' + upcoming;
      if (key === shown) return;
      shown = key;
      while (marks.firstChild) marks.removeChild(marks.firstChild);
      // der nächste Griff blass darunter, damit die Finger schon wissen, wohin
      if (upcoming >= 0 && upcoming !== current) drawGrip(seq[upcoming], 'next');
      if (current >= 0) drawGrip(seq[current], 'now');
      events.forEach((ev, i) => ev.classList.toggle('cur', i === current));
    },
    mark(i, gr) {
      events[i].classList.add(gr);
    },
  };
}
