import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/library.dart';
import 'package:sikhify/services/settings.dart';
import 'package:sikhify/widgets/gurbani_pages.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
    await Library.load();
    await I18n.instance.load();
    Settings.instance.language = 'en';
  });

  Future<void> pumpJapji(WidgetTester tester, {int initialLine = 0}) async {
    tester.view.physicalSize = const Size(1080, 2160);
    tester.view.devicePixelRatio = 2.625;
    addTearDown(tester.view.reset);
    final lines = Library.instance.bundledText('japji-sahib')!;
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(body: GurbaniPages(lines: lines, initialLine: initialLine, footer: const SizedBox(height: 60, child: Text('the end')))),
    ));
    await tester.pumpAndSettle();
  }

  testWidgets('Japji Sahib splits into pages that turn, without overflowing', (tester) async {
    await pumpJapji(tester);
    final label = find.textContaining('Page 1 / ');
    expect(label, findsOneWidget);
    final pages = int.parse((tester.widget<Text>(label).data!).split('/ ').last);
    expect(pages, greaterThan(5));

    await tester.fling(find.byType(PageView), const Offset(-300, 0), 2000);
    await tester.pumpAndSettle();
    expect(find.textContaining('Page 2 / $pages'), findsOneWidget);

    await tester.tap(find.byTooltip('Next page'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Page 3 / $pages'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('bigger text makes more pages, and the same line stays in view', (tester) async {
    Settings.instance.fontScale = 1.0;
    await pumpJapji(tester, initialLine: 40);
    final before = tester.widget<Text>(find.textContaining('Page ')).data!;
    final pagesBefore = int.parse(before.split('/ ').last);

    Settings.instance.fontScale = 1.6;
    await tester.pumpAndSettle();
    final after = tester.widget<Text>(find.textContaining('Page ')).data!;
    expect(int.parse(after.split('/ ').last), greaterThan(pagesBefore));
    expect(int.parse(after.split(' ')[1]), greaterThan(1)); // not thrown back to page 1
    Settings.instance.fontScale = 1.0;
  });

  testWidgets('tapping the page number opens any page the reader types', (tester) async {
    await pumpJapji(tester);
    final pages = int.parse((tester.widget<Text>(find.textContaining('Page 1 / ')).data!).split('/ ').last);
    await tester.tap(find.textContaining('Page 1 / '));
    await tester.pumpAndSettle();
    expect(find.text('Go to page'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '${pages + 5}');
    await tester.tap(find.text('Go'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Enter a number from 1 to $pages'), findsOneWidget, reason: 'a page that does not exist is refused');

    await tester.enterText(find.byType(TextField), '5');
    await tester.tap(find.text('Go'));
    await tester.pumpAndSettle();
    expect(find.textContaining('Page 5 / $pages'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
