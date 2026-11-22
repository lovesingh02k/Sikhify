// Talks to the real sikhify.in API: run with `flutter test --tags live` (skipped by default).
@Tags(['live'])
library;

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sikhify/services/site_api.dart';

void main() {
  test('media, festivals and Gurdwaras load and parse', () async {
    HttpOverrides.global = null; // flutter_test blocks real network calls; this test needs them
    final api = SiteApi.instance;
    final media = await api.media();
    expect(media.artists, isNotEmpty);
    expect(media.artists.expand((a) => a.videos), isNotEmpty);
    final upcoming = await api.upcomingFestivals();
    expect(upcoming, isNotEmpty);
    expect(upcoming.first.start, isNotNull);
    final all = await api.allFestivals();
    expect(all.where((f) => f.start != null), isNotEmpty, reason: 'calendar dates parse');
    final page = await api.gurdwaras();
    expect(page.items, isNotEmpty);
    expect(page.items.where((g) => g.image != null), isNotEmpty, reason: 'historic Gurdwaras have photos');
    final one = await api.gurdwara(page.items.first.url);
    expect(one.name, page.items.first.name);
    final found = await api.gurdwaras(q: 'Amritsar');
    expect(found.items, isNotEmpty);
    final fest = await api.festival(upcoming.first.slug);
    expect(fest.title, isNotEmpty);
    // ignore: avoid_print
    print('${media.artists.length} artists; next festival ${upcoming.first.title} ${upcoming.first.start} '
        '(${upcoming.first.guruArt}); ${all.length} in calendar, ${all.where((f) => f.start != null).length} dated; '
        '${page.total} historic Gurdwaras; first: ${one.name} (${one.place}); detail festival start ${fest.start}');
  }, timeout: const Timeout(Duration(minutes: 2)));

  test('homepage banners and upcoming events load and parse', () async {
    HttpOverrides.global = null;
    final banners = await SiteApi.instance.homeBanners();
    final events = await SiteApi.instance.upcomingEvents();
    for (final b in banners) {
      expect(b.title, isNotEmpty);
      expect(b.picture, isNotEmpty);
    }
    expect(events.every((e) => e.date != null), isTrue);
    // ignore: avoid_print
    print('${banners.length} banners: ${banners.map((b) => b.picture).toList()}; ${events.length} events: ${events.map((e) => e.title).toList()}');
  }, timeout: const Timeout(Duration(minutes: 2)));
}
