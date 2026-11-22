// Talks to the real BaniDB API: run with `flutter test --tags live` (skipped by default).
@Tags(['live'])
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sikhify/services/banidb.dart';

void main() {

  test('search, shabad, Ang, a whole Bani and the Hukamnama load and parse', () async {
    HttpOverrides.global = null; // flutter_test blocks real network calls; this test needs them
    final db = BaniDb.instance;
    final hits = await db.search('ਸਨਕ', 0);
    expect(hits, isNotEmpty);
    expect(hits.first.line.gurmukhi, isNotEmpty);
    final shabad = await db.shabad(hits.first.shabadId);
    expect(shabad.lines, isNotEmpty);
    final ang = await db.ang(1);
    expect(ang.lines.length, greaterThan(10));
    expect(ang.lines[2].english, isNotNull);
    final sukhmani = await db.bani(31);
    expect(sukhmani.length, greaterThan(1000));
    expect(sukhmani.where((l) => l.punjabi != null), isNotEmpty);
    final h = await db.hukamnama(BaniDb.todayInIndia());
    expect(h.lines, isNotEmpty);
    expect(h.opening, isNotEmpty);
    expect(h.audioUrl, startsWith('https://hs.sgpc.net/hukamnamaaudio/SGPCNET'));
    // ignore: avoid_print
    print('Hukamnama ${h.date}: Ang ${h.ang}, ${h.writer} — ${h.opening.first.gurmukhi}');
  }, timeout: const Timeout(Duration(minutes: 2)));
}
