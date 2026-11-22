import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/services/live_kirtan.dart';
import 'package:sikhify/services/settings.dart';
import 'package:sikhify/widgets/live_kirtan_card.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
    LiveKirtan.status.value = LiveStatus.off;
  });

  Widget app(Widget child) => MaterialApp(home: Scaffold(body: child));

  test('reconnecting waits longer each time, up to 30 seconds', () {
    expect([for (var i = 1; i <= 7; i++) LiveKirtan.retryDelay(i).inSeconds], [2, 4, 8, 16, 30, 30, 30]);
  });

  test('data saver picks the lower quality stream', () {
    expect(LiveKirtan.url, LiveKirtan.normalUrl);
    Settings.instance.liveDataSaver = true;
    expect(LiveKirtan.url, LiveKirtan.dataSaverUrl);
  });

  testWidgets('the card follows the broadcast', (tester) async {
    await tester.pumpWidget(app(const LiveKirtanCard()));
    expect(find.text('LIVE'), findsOneWidget);
    expect(find.text('Live Kirtan'), findsOneWidget);
    expect(find.text('Tap to listen'), findsOneWidget);
    expect(find.byIcon(Icons.play_arrow_rounded), findsOneWidget);

    LiveKirtan.status.value = LiveStatus.playing;
    await tester.pump();
    expect(find.text('Playing live'), findsOneWidget);
    expect(find.byIcon(Icons.pause_rounded), findsOneWidget);

    LiveKirtan.status.value = LiveStatus.reconnecting;
    await tester.pump();
    expect(find.text('Reconnecting…'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    LiveKirtan.status.value = LiveStatus.failed;
    await tester.pump();
    expect(find.textContaining('Check your internet'), findsOneWidget);
  });

  testWidgets('choosing data saver is remembered', (tester) async {
    await tester.pumpWidget(app(const LiveKirtanCard()));
    await tester.tap(find.text('Data saver'));
    await tester.pump();
    expect(Settings.instance.liveDataSaver, isTrue);
  });

  testWidgets('the compact card leaves out the quality choice', (tester) async {
    await tester.pumpWidget(app(const LiveKirtanCard(compact: true)));
    expect(find.text('Data saver'), findsNothing);
  });
}
