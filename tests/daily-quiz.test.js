/* The website's Daily Quiz: its questions come from the app, and shared links open on the website. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const bank = JSON.parse(fs.readFileSync(new URL('../frontend/src/data/quizBank.json', import.meta.url), 'utf8'));
globalThis.localStorage = { store: {}, getItem(k) { return k in this.store ? this.store[k] : null; }, setItem(k, v) { this.store[k] = String(v); } };
globalThis.window = {};
const quiz = await import('../frontend/src/utils/dailyQuiz.js');
const loaded = await quiz.loadBank();

test('every question is there in English, Punjabi and Hindi, with the same answer position', () => {
  assert.ok(bank.questions.length > 120);
  for (const q of bank.questions) {
    for (const l of ['en', 'pa', 'hi']) {
      assert.ok(q[l] && q[l].q && q[l].o.length >= 3, `${q.id} ${l}`);
      assert.equal(q[l].a, q.en.a, `${q.id}: answer position in ${l}`);
      assert.equal(q[l].o.length, q.en.o.length, `${q.id}: options in ${l}`);
    }
  }
});

test('five a day, the same all day, new ones the next day', () => {
  const mon = quiz.todayIds(loaded, new Date(2026, 10, 23));
  assert.equal(mon.length, 5);
  assert.deepEqual(quiz.todayIds(loaded, new Date(2026, 10, 23, 20)), mon);
  const tue = quiz.todayIds(loaded, new Date(2026, 10, 24));
  assert.equal(tue.filter((id) => mon.includes(id)).length, 0);
});

test('a quiz shared from the website links to the website page, not the app path', () => {
  const t = quiz.wordsFor(loaded, 'pa');
  const qs = mon5().map((e) => quiz.questionIn(e, 'pa'));
  const text = quiz.scoreText(t, qs, qs.map((q) => q.a), 5, 3);
  assert.match(text, /https:\/\/www\.sikhify\.in\/daily-quiz\?q=/);
  assert.doesNotMatch(text, /sikhify\.in\/quiz\?/, 'the app opens /quiz links');
  assert.match(text, /ਸਿੱਖੀਫ਼ਾਈ ਰੋਜ਼ਾਨਾ ਕੁਇਜ਼|Sikhify Daily Quiz|ਕੁਇਜ਼/);
  assert.match(quiz.questionText(t, qs[0]), /daily-quiz\?q=/);
});

test('screen words are translated', () => {
  assert.notEqual(quiz.wordsFor(loaded, 'pa')('Next question'), 'Next question');
  assert.notEqual(quiz.wordsFor(loaded, 'hi')('See my score'), 'See my score');
  assert.equal(quiz.wordsFor(loaded, 'en')('Next question'), 'Next question');
});

function mon5() { return quiz.todayIds(loaded, new Date(2026, 10, 23)).map((id) => loaded.byId.get(id)); }
