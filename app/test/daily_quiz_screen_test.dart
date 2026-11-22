import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/screens/quiz.dart';
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/library.dart';
import 'package:sikhify/services/quiz.dart';
import 'package:sikhify/services/settings.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
    await Library.load();
    await I18n.instance.load();
    await Quiz.load();
    Settings.instance.language = 'en';
  });

  testWidgets('the Daily Quiz asks one question at a time, then shows the score', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.625;
    addTearDown(tester.view.reset);
    await tester.pumpWidget(const MaterialApp(home: DailyQuizScreen()));
    await tester.pumpAndSettle();

    final questions = Quiz.today();
    for (var i = 0; i < Quiz.perDay; i++) {
      expect(find.text('Question ${i + 1} / ${Quiz.perDay}'), findsOneWidget);
      expect(find.text(questions[i].question), findsOneWidget);
      // Only this question is on screen, not the next one.
      if (i + 1 < Quiz.perDay && questions[i + 1].question != questions[i].question) expect(find.text(questions[i + 1].question), findsNothing);
      await tester.tap(find.text(questions[i].options[questions[i].answer]).last);
      await tester.pumpAndSettle();
      expect(find.text('Shabaash! That’s right.'), findsOneWidget);
      await tester.tap(find.text(i + 1 < Quiz.perDay ? 'Next question' : 'See my score'));
      await tester.pumpAndSettle();
    }
    expect(find.text('${Quiz.perDay} / ${Quiz.perDay}'), findsOneWidget);
    expect(find.text('Come back tomorrow for 5 new questions.'), findsOneWidget);
    expect(Quiz.doneOn(DateTime.now()), isTrue);
  });
}
