import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getYouTubeVideoId, youTubeEmbedUrl, isYouTubeVideoId } from '../shared/youtube.js';

const ID = 'qrEANarrvz0'; // a real video from src/data/media.js

test('extracts IDs from every supported URL form', () => {
  const cases = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=42s&list=PL123`,
    `https://m.youtube.com/watch?feature=share&v=${ID}`,
    `http://www.youtube.com/watch?v=${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc&t=10`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/embed/${ID}?start=30`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
    ID,
  ];
  for (const url of cases) assert.equal(getYouTubeVideoId(url), ID, url);
});

test('rejects anything that is not a YouTube video', () => {
  const bad = [
    '', null, undefined, 42, 'hello',
    'https://example.com/watch?v=qrEANarrvz0',
    'https://youtube.com.evil.com/watch?v=qrEANarrvz0',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=qrEANarrvz0toolong',
    'https://www.youtube.com/channel/UC123',
    'https://www.youtube.com/playlist?list=PL123',
    'javascript:alert(1)//youtu.be/qrEANarrvz0',
    'ftp://youtu.be/qrEANarrvz0',
    'https://youtu.be/',
  ];
  for (const url of bad) assert.equal(getYouTubeVideoId(url), null, String(url));
});

test('builds privacy-enhanced embed URLs only for valid IDs', () => {
  assert.match(youTubeEmbedUrl(ID), /^https:\/\/www\.youtube-nocookie\.com\/embed\/qrEANarrvz0\?/);
  assert.equal(youTubeEmbedUrl('../../evil'), null);
  assert.equal(isYouTubeVideoId('qrEANarrvz0'), true);
  assert.equal(isYouTubeVideoId('qrEANarrvz'), false);
});
