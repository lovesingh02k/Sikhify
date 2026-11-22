import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/models.dart';
import 'package:sikhify/screens/quiz.dart';
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/library.dart';
import 'package:sikhify/services/links.dart';
import 'package:sikhify/services/quiz.dart';
import 'package:sikhify/services/script.dart';
import 'package:sikhify/services/settings.dart';
import 'package:sikhify/widgets/gurbani_view.dart';

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

  test('Gurmukhi → Hindi letters matches BaniDB (ੴ kept, tippi, addak)', () {
    expect(toDevanagari('ੴ ਸਤਿ ਨਾਮੁ ਕਰਤਾ ਪੁਰਖੁ'), 'ੴ सति नामु करता पुरखु');
    expect(toDevanagari('ਸੈਭੰ ਗੁਰ ਪ੍ਰਸਾਦਿ ॥'), 'सैभं गुर प्रसादि ॥');
    expect(toDevanagari('ਪੱਤ'), 'पत्त');
  });

  test('live BaniDB lines get the Hindi meaning (now under "sts") and BaniDB’s Hindi letters', () {
    final line = GurbaniLine.fromBaniDb({
      'verse': {'unicode': 'ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥'},
      'translation': {
        'hi': {'ss': '', 'sts': 'निरंकार सृष्टि की रचना से पहले सत्य था'},
      },
      'transliteration': {'hindi': 'आदि सचु जुगादि सचु ॥'},
    });
    expect(line.hindi, 'निरंकार सृष्टि की रचना से पहले सत्य था');
    expect(line.devanagari, 'आदि सचु जुगादि सचु ॥');
  });

  testWidgets('"Hindi only" shows the Gurbani in Hindi letters with the Hindi meaning, without the Gurmukhi', (tester) async {
    const line = GurbaniLine(gurmukhi: 'ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥', translit: 'aadh sach', hindi: 'सत्य था', english: 'True in the beginning');
    final s = Settings.instance;
    s.readInHindi();
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: LineTile(line: line, settings: s))));
    expect(find.text('आदि सचु जुगादि सचु ॥'), findsOneWidget);
    expect(find.text('सत्य था'), findsOneWidget);
    expect(find.text('ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥'), findsNothing);
    expect(find.text('True in the beginning'), findsNothing);

    s.gurbaniScript = 'both';
    await tester.pumpWidget(MaterialApp(home: Scaffold(body: LineTile(line: line, settings: s))));
    expect(find.text('ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥'), findsOneWidget);
    expect(find.text('आदि सचु जुगादि सचु ॥'), findsOneWidget);
    s.gurbaniScript = 'gurmukhi';
  });

  test('sharing the quiz: the score and today’s questions, but never the answers', () {
    final qs = Quiz.today(DateTime(2026, 12, 1));
    final answers = [for (final (i, q) in qs.indexed) i == 2 ? (q.answer + 1) % q.options.length : q.answer];
    final text = shareScoreText(score: 4, questions: qs, answers: answers, streak: 3);
    expect(text, contains('4/5 ✅✅❌✅✅'));
    expect(text, contains('🔥'));
    for (final q in qs) {
      expect(text, contains(q.question));
    }
    final one = shareQuestionText(qs.first);
    expect(one, contains('A) ${qs.first.options[0]}'));
    expect(one.toLowerCase(), isNot(contains('answer:')));

    // The shared link opens the very same questions (and the friend's score) in the app.
    final link = RegExp(r'https://www\.sikhify\.in/quiz\?\S+').firstMatch(text)!.group(0)!;
    final parsed = Links.parseQuiz(Uri.parse(link))!;
    expect(parsed.ids, qs.map((q) => q.id).toList());
    expect(parsed.score, 4);
    expect(Quiz.byIds(parsed.ids).map((q) => q.question), qs.map((q) => q.question));
    // The website's "Open in the app" button uses sikhify://quiz?…
    expect(Links.parseQuiz(Uri.parse('sikhify://quiz?q=${qs.first.id}'))!.ids, [qs.first.id]);
    expect(Links.parseQuiz(Uri.parse('https://www.sikhify.in/gurbani')), isNull);
  });
}
