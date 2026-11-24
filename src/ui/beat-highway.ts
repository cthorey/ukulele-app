import { s } from './dom.ts';
import { STRINGS } from '../music/notes.ts';
import { t } from '../i18n.ts';
import type { Chord } from '../music/grip.ts';

/** Ein Ereignis auf der Spur: ein Griff (alle Saiten) oder ein einzelner Ton (eine Saite). */
export interface HwEvent {
  beat: number;
  dur: number;
  /** über der Spalte: Akkordname oder Silbe */
  label: string;
  /** Bund je Saite, -1 = nicht gespielt */
  frets: number[];
  fingers?: number[];
  /** einzelner Ton: nicht gespielte Saiten bekommen kein ×, auf dem Hals keine leeren Ringe */
  single?: boolean;
}

export interface HighwayOptions {
  width: number;
  lefty: boolean;
  /** Schläge je Takt (Taktstriche) und wo der erste Takt beginnt (Auftakt) */
  meter?: number;
  barOffset?: number;
  /** wiederholt sich alle so viele Schläge (12-Takt-Blues) */
  loop?: number;
  /** sichtbare Schläge rechts der Linie – höchstens, auf schmalen Bildschirmen weniger */
  ahead?: number;
  /** so viele Pixel braucht ein Schlag mindestens (Melodie: Silben dürfen sich nicht überlappen) */
  minBeatPx?: number;
}

export interface Highway {
  el: SVGElement;
  /** Jedes Bild: Position in Schlägen. */
  update(beat: number): void;
  mark(i: number, cls: string): void;
}

export function chordEvent(c: Chord, beat: number, dur: number, label = c.name): HwEvent {
  return { beat, dur, label, frets: c.frets, fingers: c.fingers };
}

export function noteEvent(string: number, fret: number, beat: number, dur: number, label: string): HwEvent {
  const frets = STRINGS.map((_, i) => (i === string ? fret : -1));
  return { beat, dur, label, frets, single: true };
}

/** Index des Ereignisses, das bei `beat` klingt (das letzte, das schon begonnen hat), sonst -1. */
export function eventIndexAt(events: HwEvent[], beat: number): number {
  let idx = -1;
  for (let i = 0; i < events.length; i++) {
    if (events[i].beat <= beat + 1e-6) idx = i;
    else break;
  }
  return idx;
}

/**
 * Hals mit Spur: links der Hals wie eine Tabulatur (oben die höchste Saite) mit dem Griff oder Ton, der jetzt gilt; rechts
 * laufen die Saiten weiter, auf ihnen kommen Griffe und Töne als Bundzahlen heran. Erreicht ein Ereignis den Hals, wird
 * gespielt; der Balken dahinter zeigt, wie lange es klingt. Einen Schlag vorher erscheint das Nächste blass auf dem Hals.
 * Gemessen wird in Bildschirmpixeln (`width`), damit Schrift auf dem Handy so groß bleibt wie am Tablet.
 */
export function beatHighway(events: HwEvent[], opts: HighwayOptions): Highway {
  const width = opts.width;
  const lefty = opts.lefty;
  const meter = opts.meter || 4;
  const barOffset = opts.barOffset || 0;
  const loop = opts.loop || 0;
  const n = STRINGS.length;
  const gap = n > 4 ? 28 : 38;
  const top = 44;
  const span = gap * (n - 1);
  const height = top + span + 30;
  let maxFret = 4;
  events.forEach((e) => e.frets.forEach((f) => (maxFret = Math.max(maxFret, f))));
  const frets = Math.min(maxFret, 12);
  const x0 = 58;
  const openX = x0 - 22;
  const fw = Math.max(20, Math.min(72, (Math.min(width * 0.45, 330) - x0) / frets));
  const nowX = x0 + fw * frets + 18;
  const ppb = Math.max((width - nowX) / (opts.ahead || 7), Math.min(opts.minBeatPx || 0, (width - nowX) / 2.5));
  const yOf = (string: number) => top + (n - 1 - string) * gap;
  const fretX = (f: number) => x0 + fw * (f - 0.5);
  const r = gap > 28 ? 14 : 12;
  const end = events.reduce((m, e) => Math.max(m, e.beat + e.dur), 0);

  const svg = s('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'highway', role: 'img', 'aria-label': t('Griffbrett') });
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
  if (frets >= 12) {
    g.appendChild(s('circle', { cx: fretX(12), cy: top + span / 2 - gap, r: 5, class: 'fb-dot' }));
    g.appendChild(s('circle', { cx: fretX(12), cy: top + span / 2 + gap, r: 5, class: 'fb-dot' }));
  }
  g.appendChild(s('rect', { x: x0 - 4, y: top - 12, width: 6, height: span + 24, class: 'fb-nut' }));
  for (let f = 1; f <= frets; f++) g.appendChild(s('rect', { x: x0 + fw * f - 1, y: top - 12, width: 2.5, height: span + 24, class: 'fb-fret' }));
  for (let f = 1; f <= frets; f++) g.appendChild(text({ x: fretX(f), y: height - 4, class: 'fb-num', 'text-anchor': 'middle' }, String(f)));
  for (let i = 0; i < n; i++) {
    g.appendChild(s('line', { x1: openX - 12, y1: yOf(i), x2: width, y2: yOf(i), class: 'fb-string' }));
    g.appendChild(text({ x: 2, y: yOf(i) + 5, class: 'fb-label' }, STRINGS[i].name));
  }
  const marks = g.appendChild(s('g', null));

  // Spur, links an der Linie abgeschnitten; bei Wiederholung zweimal hintereinander, damit die Naht nicht auffällt
  const clipId = 'hw-clip';
  g.appendChild(s('defs', null, s('clipPath', { id: clipId }, s('rect', { x: nowX - r, y: 0, width: width - nowX + r, height }))));
  const lane = g.appendChild(s('g', { 'clip-path': `url(#${clipId})` }));
  const strip = lane.appendChild(s('g', null));
  const copies = loop ? 2 : 1;
  const lastBeat = loop ? loop * 2 : Math.ceil(end);
  for (let k = Math.floor(barOffset % meter) - meter; k <= lastBeat; k++) {
    if (k < 0) continue;
    const bar = (((k - barOffset) % meter) + meter) % meter === 0;
    strip.appendChild(s('line', { x1: k * ppb, y1: top - 16, x2: k * ppb, y2: top + span + 12, class: bar ? 'hw-bar' : 'hw-beat' }));
  }
  const groups: SVGElement[][] = events.map(() => []);
  for (let c = 0; c < copies; c++)
    events.forEach((e, i) => {
      const x = (e.beat + c * loop) * ppb;
      const ev = strip.appendChild(s('g', { class: 'hw-event' }));
      groups[i].push(ev);
      e.frets.forEach((f, string) => {
        if (f < 0) return;
        ev.appendChild(s('rect', { x, y: yOf(string) - 5, width: Math.max(r, e.dur * ppb - 14), height: 10, rx: 5, class: 'hw-sustain' }));
      });
      e.frets.forEach((f, string) => {
        const y = yOf(string);
        if (f < 0) {
          if (!e.single) ev.appendChild(text({ x, y: y + 5, 'text-anchor': 'middle', class: 'hw-mute' }, '×'));
          return;
        }
        ev.appendChild(s('circle', { cx: x, cy: y, r, class: f === 0 ? 'hw-note open' : 'hw-note' }));
        ev.appendChild(text({ x, y: y + 5, 'text-anchor': 'middle', class: f === 0 ? 'hw-num open' : 'hw-num' }, String(f)));
      });
      if (e.label) ev.appendChild(text({ x: x - (e.single ? 0 : 10), y: top - 20, 'text-anchor': e.single ? 'middle' : 'start', class: e.single ? 'hw-name syl' : 'hw-name' }, e.label));
    });
  g.appendChild(s('rect', { x: nowX - 2, y: top - 22, width: 4, height: span + 34, rx: 2, class: 'hw-now' }));

  const drawGrip = (e: HwEvent, kind: 'now' | 'next') => {
    e.frets.forEach((f, string) => {
      const y = yOf(string);
      if (f < 0) {
        if (kind === 'now' && !e.single) marks.appendChild(text({ x: openX, y: y + 5, 'text-anchor': 'middle', class: 'hw-mute' }, '×'));
        return;
      }
      if (f === 0) {
        marks.appendChild(s('circle', { cx: openX, cy: y, r: 7, class: kind === 'now' ? 'hw-open-mark' : 'hw-open-mark next' }));
        return;
      }
      if (f > frets) return;
      marks.appendChild(s('circle', { cx: fretX(f), cy: y, r: kind === 'now' ? 12 : 11, class: `fb-mark ${kind}` }));
      const finger = e.fingers ? e.fingers[string] : 0;
      const lbl = finger ? String(finger) : e.single ? String(f) : '';
      if (lbl) marks.appendChild(text({ x: fretX(f), y: y + 4.5, 'text-anchor': 'middle', class: `fb-mark-label ${kind}` }, lbl));
    });
  };

  let shown = '';
  return {
    el: svg,
    update(beatIn) {
      const beat = loop && beatIn >= 0 ? beatIn % loop : beatIn;
      strip.setAttribute('transform', `translate(${nowX - beat * ppb} 0)`);
      const cur = eventIndexAt(events, beat);
      let nxt = loop ? (cur + 1) % events.length : cur + 1;
      const nextBeat = nxt < events.length ? events[nxt].beat + (loop && nxt <= cur ? loop : 0) : Infinity;
      if (nextBeat - beat > 1) nxt = -1;
      // ein einzelner Ton gilt nur, solange er klingt; danach ist der Hals leer, bis der nächste kommt
      const live = cur >= 0 && (!events[cur].single || beat < events[cur].beat + events[cur].dur) ? cur : -1;
      const key = live + '/' + nxt;
      if (key === shown) return;
      shown = key;
      while (marks.firstChild) marks.removeChild(marks.firstChild);
      if (nxt >= 0 && nxt !== live) drawGrip(events[nxt], 'next');
      if (live >= 0) drawGrip(events[live], 'now');
      groups.forEach((gs, i) => gs.forEach((ev) => ev.classList.toggle('cur', i === live)));
    },
    mark(i, cls) {
      groups[i].forEach((ev) => ev.classList.add(cls));
    },
  };
}
