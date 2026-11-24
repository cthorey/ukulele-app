import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNT_IN, EARLY, MAX_BPM, MIN_BPM, expectedIndex, grade, nextBpm, sequence, starsFor, startBeat } from '../../src/music/beat-game.ts';

test('Reihenfolge: zwei Akkorde im Wechsel, mehr zufällig ohne Wiederholung', () => {
  assert.deepEqual(sequence(['C', 'Am'], 4), ['C', 'Am', 'C', 'Am']);
  let seed = 0;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const s = sequence(['C', 'Am', 'F', 'G7'], 50, rnd);
  assert.equal(s.length, 50);
  for (let i = 1; i < s.length; i++) assert.ok(s[i] !== s[i - 1]);
});

test('Erwarteter Akkord: Vorzählen, etwas früher wechseln zählt, nach dem Ende vorbei', () => {
  assert.equal(expectedIndex(0, 4), -1);
  assert.equal(expectedIndex(COUNT_IN - EARLY - 0.01, 4), -1);
  assert.equal(expectedIndex(COUNT_IN - EARLY, 4), 0);
  assert.equal(expectedIndex(startBeat(1, 4) - 0.6, 4), 0);
  assert.equal(expectedIndex(startBeat(1, 4) - 0.4, 4), 1);
  assert.equal(expectedIndex(startBeat(3, 2), 2), 3);
  assert.equal(expectedIndex(startBeat(12, 4), 4, 12), 12);
});

test('Bewertung nach Abstand zum Einsatz', () => {
  assert.equal(grade(0), 'perfect');
  assert.equal(grade(-0.3), 'perfect');
  assert.equal(grade(0.6), 'good');
  assert.equal(grade(2.5), 'late');
});

test('Sterne und Tempo', () => {
  assert.equal(starsFor([]), 0);
  assert.equal(starsFor(['perfect', 'perfect', 'good']), 3);
  assert.equal(starsFor(['good', 'good', 'late']), 2);
  assert.equal(starsFor(['miss', 'miss', 'late']), 0);
  assert.equal(nextBpm(60, 3), 65);
  assert.equal(nextBpm(60, 2), 60);
  assert.equal(nextBpm(60, 1), 55);
  assert.equal(nextBpm(MAX_BPM, 3), MAX_BPM);
  assert.equal(nextBpm(MIN_BPM, 0), MIN_BPM);
});
