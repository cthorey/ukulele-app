import { h, clear, announce } from '../ui/dom.ts';
import { icon } from '../ui/icons.ts';
import { screen, button, ensureMic, praise, keepAwake, type View } from '../ui/screen.ts';
import { playableChord } from '../ui/chord-play.ts';
import { CHORDS, chord } from '../music/chords.ts';
import { audio, click, successSound } from '../audio/engine.ts';
import { listenForChord, type ChordListener } from '../audio/listen.ts';
import { load, save, markPracticed } from '../store.ts';
import { noteText, t } from '../i18n.ts';
import { instrument, notesOnly } from '../music/instrument.ts';
import {
  BPM_STEP,
  CHANGES,
  COUNT_IN,
  DETECT_LAG,
  MAX_BPM,
  MIN_BPM,
  START_BPM,
  expectedIndex,
  grade,
  nextBpm,
  sequence,
  starsFor,
  startBeat,
  type Grade,
} from '../music/beat-game.ts';

const SECONDS = 60;
/** Sichtbarer Ausschnitt der Spur in Schlägen; die Linie „jetzt“ steht bei einem Fünftel. */
const LANE_BEATS = 10;
const NOW_AT = 0.2;

type Mode = 'time' | 'beat';

/** E-Bass: Töne statt Akkorde, ausgeschrieben (im Französischen Do, Ré, Mi …). */
const shown = (name: string) => (notesOnly() ? noteText(name) : name);

function presetLabel(chords: string[]): string {
  return chords.length === 2 ? t('{a} und {b}', { a: shown(chords[0]), b: shown(chords[1]) }) : chords.map(shown).join(' · ');
}

const beatKey = (chords: string[], beatsPerChord: number) => chords.join('-') + '/' + beatsPerChord;

/** Wie spät das Kind den Klick hört: Ausgabe-Latenz des Geräts (Bluetooth deutlich mehr). */
function outputLag(): number {
  const c = audio() as AudioContext & { outputLatency?: number };
  const lag = (c.outputLatency || 0) + (c.baseLatency || 0);
  return lag > 0 && lag < 0.5 ? lag : 0;
}

function starRow(n: number): HTMLElement {
  return h('span', { class: 'song-stars' }, ...[1, 2, 3].map((i) => icon('star', `icon star ${i <= n ? 'on' : 'off'}`)));
}

export const game: View = (root) => {
  const PRESETS = instrument().game.map((chords) => ({ chords }));
  const bass = notesOnly();
  let selected = PRESETS[0].chords;
  let mode: Mode = 'time';
  let beatsPerChord = 4;
  let listener: ChordListener | null = null;
  let timer = 0;
  let raf = 0;
  let releaseWake: (() => void) | null = null;
  const lefty = load().settings.lefty;
  const area = h('div', { class: 'game-area' });

  const stop = () => {
    listener?.stop();
    listener = null;
    window.clearInterval(timer);
    cancelAnimationFrame(raf);
    releaseWake?.();
    releaseWake = null;
  };

  const savedBpm = () => {
    const rec = load().beatGame[beatKey(selected, beatsPerChord)];
    return rec ? rec.bpm : START_BPM;
  };

  const seg = <T,>(label: string, items: T[], text: (x: T) => string, isOn: (x: T) => boolean, pick: (x: T) => void) =>
    h(
      'div',
      { class: 'seg seg-wrap', role: 'group', 'aria-label': label },
      ...items.map((it) => button(text(it), () => pick(it), 'btn-seg', { 'aria-pressed': String(isOn(it)) })),
    );

  const setup = () => {
    stop();
    clear(area);
    const p = load();
    const best = p.bestHunt;
    const bpmShow = h('span', { class: 'bpm-value', 'aria-live': 'polite' }, t('{n} Schläge pro Minute', { n: savedBpm() }));
    const setBpm = (v: number) => {
      const bpm = Math.max(MIN_BPM, Math.min(MAX_BPM, v));
      const key = beatKey(selected, beatsPerChord);
      save((q) => (q.beatGame[key] = { bpm, stars: q.beatGame[key] ? q.beatGame[key].stars : 0 }));
      bpmShow.textContent = t('{n} Schläge pro Minute', { n: bpm });
    };
    const presetExtra = (chords: string[]) => {
      if (mode === 'time') return best[chords.join('-')] ? h('span', { class: 'best' }, ' ', t('Rekord: {n}', { n: best[chords.join('-')] })) : null;
      const rec = p.beatGame[beatKey(chords, beatsPerChord)];
      return rec && rec.stars ? h('span', { class: 'best' }, ' ', starRow(rec.stars)) : null;
    };
    area.appendChild(
      h(
        'div',
        { class: 'card game-setup' },
        h('h2', null, t('Spielart')),
        seg(t('Spielart'), ['time', 'beat'] as Mode[], (m) => (m === 'time' ? t('Auf Zeit') : t('Im Takt')), (m) => m === mode, (m) => {
          mode = m;
          setup();
        }),
        h('h2', null, bass ? t('Welche Töne?') : t('Welche Akkorde?')),
        h(
          'div',
          { class: 'preset-grid' },
          ...PRESETS.map((pr) =>
            button(
              h('span', null, h('span', null, presetLabel(pr.chords)), presetExtra(pr.chords)),
              () => {
                selected = pr.chords;
                setup();
              },
              'btn-seg',
              { 'aria-pressed': String(pr.chords === selected) },
            ),
          ),
        ),
        mode === 'beat'
          ? h(
              'div',
              null,
              h('h2', null, t('Wechsel')),
              seg(t('Wechsel'), [4, 2], (n) => t('alle {n} Schläge', { n }), (n) => n === beatsPerChord, (n) => {
                beatsPerChord = n;
                setup();
              }),
              h('h2', null, t('Tempo')),
              h(
                'div',
                { class: 'tempo-row' },
                button('−', () => setBpm(savedBpm() - BPM_STEP), 'btn-seg tempo-step', { 'aria-label': t('Langsamer') }),
                bpmShow,
                button('+', () => setBpm(savedBpm() + BPM_STEP), 'btn-seg tempo-step', { 'aria-label': t('Schneller') }),
              ),
            )
          : null,
        h(
          'p',
          null,
          mode === 'beat'
            ? bass
              ? t('Die Töne laufen zur Linie. Erst zählt der Klick vor, dann wechselst du genau dann, wenn ein Ton die Linie erreicht. Spielst du im Takt, wird es beim nächsten Mal etwas schneller.')
              : t('Die Akkorde laufen zur Linie. Erst zählt der Klick vor, dann wechselst du genau dann, wenn ein Akkord die Linie erreicht. Spielst du im Takt, wird es beim nächsten Mal etwas schneller.')
            : bass
            ? t('Spiel den Ton, der erscheint – ich höre zu und zähle mit. Du hast {n} Sekunden. Bei zwei Tönen wechselst du immer hin und her.', { n: SECONDS })
            : t('Spiel den Akkord, der erscheint – ich höre zu und zähle mit. Du hast {n} Sekunden. Bei zwei Akkorden wechselst du immer hin und her.', { n: SECONDS }),
        ),
        button(h('span', null, icon('play'), ' ', t('Start')), () => void (mode === 'beat' ? playBeat() : play()), 'btn-primary btn-play'),
      ),
    );
  };

  const play = async () => {
    const mic = await ensureMic();
    stop();
    releaseWake = keepAwake();
    clear(area);
    let score = 0;
    let idx = 0;
    let current = selected[0];
    const pick = () => {
      if (selected.length === 2) {
        idx = 1 - idx;
        return selected[idx];
      }
      let next = current;
      while (next === current) next = selected[Math.floor(Math.random() * selected.length)];
      return next;
    };
    const name = h('div', { class: 'chord-name huge' }, shown(current));
    const diag = h('div', { class: 'diagram-big' }, playableChord(chord(current), { lefty }));
    const scoreEl = h('div', { class: 'score', 'aria-live': 'polite' }, '0');
    const timeEl = h('div', { class: 'time' }, String(SECONDS));
    const ring = h('div', { class: 'time-ring' }, timeEl);
    const msg = h('div', { class: 'feedback' }, mic ? t('Los! Ich höre zu …') : bass ? t('Tippe auf „Geschafft“, wenn du den Ton gespielt hast.') : t('Tippe auf „Geschafft“, wenn du den Akkord gespielt hast.'));
    const hit = (heard: boolean) => {
      score++;
      scoreEl.textContent = String(score);
      if (heard) successSound();
      msg.textContent = praise();
      current = pick();
      name.textContent = shown(current);
      diag.replaceChild(playableChord(chord(current), { lefty }), diag.firstChild!);
      listener?.setExpected(current);
      announce(shown(current));
    };
    area.appendChild(
      h(
        'div',
        { class: 'game-run' },
        h('div', { class: 'card game-target' }, h('div', { class: 'card-label' }, t('Spiel')), name, diag),
        h(
          'div',
          { class: 'game-side' },
          h('div', { class: 'card stats' }, h('div', null, h('div', { class: 'card-label' }, t('Punkte')), scoreEl), ring),
          msg,
          button(h('span', null, icon('check'), ' ', t('Geschafft')), () => hit(false), mic ? '' : 'btn-primary'),
          button(t('Aufhören'), setup, ''),
        ),
      ),
    );
    if (mic)
      listener = await listenForChord(current, { onHit: () => hit(true) }).catch(() => null);
    const end = Date.now() + SECONDS * 1000;
    timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      timeEl.textContent = String(left);
      ring.style.setProperty('--p', String(left / SECONDS));
      if (left > 0) return;
      stop();
      const key = selected.join('-');
      const before = load().bestHunt[key] || 0;
      if (score > before) save((p) => (p.bestHunt[key] = score));
      markPracticed();
      successSound();
      clear(area);
      area.appendChild(
        h(
          'div',
          { class: 'card result' },
          h('div', { class: 'wait-title' }, score > before ? t('Neuer Rekord!') : t('Zeit um!')),
          h('div', { class: 'score huge' }, String(score)),
          h('p', null, score > before ? t('Vorher: {n}', { n: before }) : t('Dein Rekord: {n}', { n: before })),
          h('div', { class: 'row' }, button(t('Nochmal'), () => void play(), 'btn-primary'), button(bass ? t('Andere Töne') : t('Andere Akkorde'), setup)),
        ),
      );
    }, 250);
  };

  /** Im Takt: Akkorde laufen auf einer Spur zur Linie, der Klick gibt den Takt, jeder Wechsel wird bewertet. */
  const playBeat = async () => {
    const mic = await ensureMic();
    stop();
    releaseWake = keepAwake();
    clear(area);
    const bpm = savedBpm();
    const bpc = beatsPerChord;
    const beatDur = 60 / bpm;
    const seq = sequence(selected);
    const grades: (Grade | null)[] = seq.map(() => null);
    const totalBeats = startBeat(CHANGES, bpc);
    const ctx = audio();
    const t0 = ctx.currentTime + 0.4;
    const lag = outputLag();
    let scheduled = 0;
    let expected = -1;
    let shownIdx = -1;
    let points = 0;
    let finished = false;

    const beatNow = () => (audio().currentTime - t0) / beatDur;

    const strip = h('div', { class: 'beat-strip' });
    const lane = h('div', { class: 'beat-lane', 'aria-hidden': 'true' }, strip, h('div', { class: 'beat-now' }));
    const blocks = seq.map((c) =>
      h('div', { class: 'beat-block' }, h('span', { class: 'beat-chord' }, shown(c)), h('span', { class: 'beat-grade' })),
    );
    blocks.forEach((b) => strip.appendChild(b));
    const ticks: HTMLElement[] = [];
    for (let k = 0; k <= totalBeats; k++) {
      const tick = h('div', { class: k % 4 === 0 ? 'beat-tick bar' : 'beat-tick' });
      ticks.push(tick);
      strip.appendChild(tick);
    }
    let laidOutFor = 0;
    let pxPerBeat = 0;
    const layout = () => {
      const w = lane.clientWidth;
      if (!w || w === laidOutFor) return;
      laidOutFor = w;
      pxPerBeat = w / LANE_BEATS;
      blocks.forEach((b, i) => {
        b.style.left = startBeat(i, bpc) * pxPerBeat + 'px';
        b.style.width = bpc * pxPerBeat - 4 + 'px';
      });
      ticks.forEach((tick, k) => (tick.style.left = k * pxPerBeat + 'px'));
    };

    const label = h('div', { class: 'card-label' }, t('Gleich'));
    const name = h('div', { class: 'chord-name huge' }, shown(seq[0]));
    const diag = h('div', { class: 'diagram-big' }, playableChord(chord(seq[0]), { lefty }));
    const scoreEl = h('div', { class: 'score', 'aria-live': 'polite' }, '0');
    const countEl = h('div', { class: 'time' }, '0/' + CHANGES);
    const msg = h('div', { class: 'feedback' }, t('Hör auf den Klick: eins, zwei, drei, vier …'));

    const GRADE_TEXT: Record<Grade, string> = {
      perfect: t('Genau im Takt!'),
      good: t('Gut!'),
      late: t('Geschafft – etwas spät'),
      miss: '',
    };
    const judge = (i: number, g: Grade) => {
      grades[i] = g;
      points += g === 'perfect' ? 3 : g === 'good' ? 2 : g === 'late' ? 1 : 0;
      scoreEl.textContent = String(points);
      countEl.textContent = grades.filter((x) => x !== null).length + '/' + CHANGES;
      blocks[i].classList.add(g);
      (blocks[i].lastChild as HTMLElement).textContent = g === 'perfect' ? t('Im Takt') : g === 'good' ? t('Gut') : g === 'late' ? t('Spät') : '';
      if (g !== 'miss') msg.textContent = g === 'good' ? praise() : GRADE_TEXT[g];
    };
    const hit = (heard: boolean) => {
      if (finished || expected < 0 || expected >= CHANGES || grades[expected]) return;
      // Anschlag zurückrechnen: Erkennung braucht Zeit, und der Klick kommt beim Kind mit der Ausgabe-Latenz an
      const at = audio().currentTime - (heard ? DETECT_LAG : 0) - lag;
      judge(expected, grade((at - t0) / beatDur - startBeat(expected, bpc)));
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      stop();
      const all = grades.map((g) => g || 'miss');
      const stars = starsFor(all);
      const key = beatKey(selected, bpc);
      const before = load().beatGame[key];
      const next = nextBpm(bpm, stars);
      save((p) => (p.beatGame[key] = { bpm: next, stars: Math.max(stars, before ? before.stars : 0) }));
      markPracticed();
      successSound();
      const n = (g: Grade) => all.filter((x) => x === g).length;
      clear(area);
      area.appendChild(
        h(
          'div',
          { class: 'card result' },
          h('div', { class: 'wait-title' }, stars >= 3 ? t('Genau im Takt!') : stars >= 1 ? t('Gut gemacht!') : t('Weiter üben – langsamer klappt es besser.')),
          h('div', { class: 'result-stars' }, starRow(stars)),
          h('p', null, t('Im Takt: {a} · Gut: {b} · Etwas spät: {c}', { a: n('perfect'), b: n('good'), c: n('late') })),
          h(
            'p',
            null,
            next > bpm
              ? t('Nächstes Mal etwas schneller: {n} Schläge pro Minute.', { n: next })
              : next < bpm
              ? t('Nächstes Mal etwas langsamer: {n} Schläge pro Minute.', { n: next })
              : t('Nächstes Mal wieder {n} Schläge pro Minute.', { n: next }),
          ),
          h('div', { class: 'row' }, button(t('Nochmal'), () => void playBeat(), 'btn-primary'), button(bass ? t('Andere Töne') : t('Andere Akkorde'), setup)),
        ),
      );
    };

    const tick = () => {
      const horizon = audio().currentTime + 0.15;
      while (scheduled < totalBeats && t0 + scheduled * beatDur < horizon) {
        click(t0 + scheduled * beatDur, scheduled % 4 === 0, scheduled < COUNT_IN ? 0.5 : 0.35);
        scheduled++;
      }
      const beat = beatNow();
      const e = expectedIndex(beat, bpc);
      if (e !== expected) {
        if (expected >= 0 && expected < CHANGES && !grades[expected]) judge(expected, 'miss');
        expected = e;
        if (e >= 0 && e < CHANGES) listener?.setExpected(seq[e]);
      }
      if (beat >= totalBeats) finish();
    };

    const frame = () => {
      layout();
      const beat = beatNow();
      strip.style.transform = 'translateX(' + (NOW_AT * LANE_BEATS - beat) * pxPerBeat + 'px)';
      // ein Schlag vor dem Wechsel schon den nächsten Griff zeigen, damit die Finger sich bereit machen
      const s = Math.max(0, Math.min(CHANGES - 1, Math.floor((beat - COUNT_IN + 1) / bpc)));
      if (s !== shownIdx) {
        shownIdx = s;
        name.textContent = shown(seq[s]);
        diag.replaceChild(playableChord(chord(seq[s]), { lefty }), diag.firstChild!);
        announce(shown(seq[s]));
        blocks.forEach((b, i) => b.classList.toggle('next', i === s));
      }
      label.textContent = beat < startBeat(s, bpc) ? t('Gleich') : t('Spiel');
      if (beat < COUNT_IN) msg.textContent = beat < 0 ? t('Hör auf den Klick: eins, zwei, drei, vier …') : String(Math.floor(beat) + 1) + ' …';
      if (!finished) raf = requestAnimationFrame(frame);
    };

    area.appendChild(
      h(
        'div',
        { class: 'game-beat' },
        h('div', { class: 'card beat-card' }, lane),
        h(
          'div',
          { class: 'game-run' },
          h('div', { class: 'card game-target' }, label, name, diag),
          h(
            'div',
            { class: 'game-side' },
            h(
              'div',
              { class: 'card stats' },
              h('div', null, h('div', { class: 'card-label' }, t('Punkte')), scoreEl),
              h('div', null, h('div', { class: 'card-label' }, t('Wechsel')), countEl),
            ),
            msg,
            button(h('span', null, icon('check'), ' ', t('Geschafft')), () => hit(false), mic ? '' : 'btn-primary'),
            button(t('Aufhören'), setup, ''),
          ),
        ),
      ),
    );
    if (mic) listener = await listenForChord(seq[0], { onHit: () => hit(true) }).catch(() => null);
    timer = window.setInterval(tick, 25);
    tick();
    raf = requestAnimationFrame(frame);
  };

  screen(root, { title: bass ? t('Ton-Spiel') : t('Akkord-Spiel') }, area);
  setup();
  return stop;
};

export const ALL = CHORDS;
