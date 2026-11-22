import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/services/settings.dart';
import 'package:sikhify/services/site_api.dart';
import 'package:sikhify/widgets/home_banners.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
  });

  test('an uploaded banner gets a full image address and plain wording', () {
    final b = HomeBanner.fromJson({
      'id': 2,
      'title': 'Gurpurab *Sri Guru Nanak Dev Ji*',
      'description': '🙏 **Lakh lakh vadhaiyan**\n\n📅 **Date:** 24 November',
      'observance': null,
      'options': {},
      'image': {'url': '/uploads/2026/11/a.webp', 'alt': 'Gurpurab'},
      'youtubeId': null,
      'cta': null,
    });
    expect(b.picture, 'https://www.sikhify.in/uploads/2026/11/a.webp');
    expect(b.title, 'Gurpurab Sri Guru Nanak Dev Ji');
    expect(b.description, '🙏 Lakh lakh vadhaiyan\n\n📅 Date: 24 November');
    expect(b.ctaUrl, isNull);
  });

  test('a video banner shows its poster; a festival banner shows the Guru Sahib', () {
    final video = HomeBanner.fromJson({'id': 3, 'title': 'Kirtan', 'youtubeId': 'abc12345678', 'cta': {'label': 'More', 'url': '/media'}});
    expect(video.picture, 'https://i.ytimg.com/vi/abc12345678/hqdefault.jpg');
    expect(video.ctaLabel, 'More');
    final festival = HomeBanner.fromJson({
      'id': 4,
      'title': 'Parkash Purab',
      'observance': {'slug': 'parkash-purab-guru-nanak-dev-ji', 'title': 'Parkash Purab', 'relatedGuru': 'guru-nanak-dev-ji', 'start': '2026-11-24', 'daysUntil': 6},
    });
    expect(festival.observance?.start, DateTime(2026, 11, 24));
    expect(festival.picture, 'assets/images/gurus/guru-nanak-dev-ji.webp');
  });

  test('an event says how soon it is', () {
    final now = DateTime(2026, 11, 18, 23, 30);
    expect(EventRow.whenLabel(DateTime(2026, 11, 18), now), 'Today');
    expect(EventRow.whenLabel(DateTime(2026, 11, 19), now), 'Tomorrow');
    expect(EventRow.whenLabel(DateTime(2026, 11, 24), now), 'in 6 days');
  });

  testWidgets('no banners take no space', (tester) async {
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: HomeBanners(future: Future.value(const <HomeBanner>[])))));
    await tester.pump();
    expect(find.byType(PageView), findsNothing);
  });

  testWidgets('an event row shows its date, day and place', (tester) async {
    final event = Entry.fromJson({
      'type': 'event',
      'slug': 'prakash-utsav',
      'title': 'Prakash Utsav',
      'date': '2026-11-24',
      'city': 'Bhilai',
      'fields': {'venue': 'Gurdwara Sri Guru Ramdas Ji'},
      'url': '/events/prakash-utsav',
    });
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: EventRow(event: event))));
    expect(find.text('24'), findsOneWidget);
    expect(find.text('NOV'), findsOneWidget);
    expect(find.text('Prakash Utsav'), findsOneWidget);
    expect(find.textContaining('Tuesday'), findsOneWidget);
    expect(find.text('Gurdwara Sri Guru Ramdas Ji, Bhilai'), findsOneWidget);
  });
}
