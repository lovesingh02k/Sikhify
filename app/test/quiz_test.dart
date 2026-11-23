import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/library.dart';
import 'package:sikhify/services/quiz.dart';
import 'package:sikhify/services/settings.dart';

import 'quiz_bank_export.dart';

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

  test('the bank is large, and every question has one right answer among distinct options', () {
    final bank = Quiz.bank();
    expect(bank.length, greaterThan(120));
    expect(bank.map((q) => q.id).toSet().length, bank.length);
    for (final q in bank) {
      expect(q.options.length, inInclusiveRange(3, 4), reason: q.id);
      expect(q.options.toSet().length, q.options.length, reason: q.id);
      expect(q.answer, inInclusiveRange(0, q.options.length - 1), reason: q.id);
    }
    // No "where did it happen?" question names its own answer in the event's title.
    for (final q in bank.where((q) => q.id.startsWith('event-place'))) {
      final place = q.options[q.answer].split(RegExp(r'[,(]')).first.trim().toLowerCase();
      expect(q.detail!.toLowerCase().contains(place), isFalse, reason: q.id);
    }
  });

  test('five a day, the same all day, and new ones the next day; answers and streak are kept', () {
    final mon = DateTime(2026, 11, 16), tue = DateTime(2026, 11, 17);
    final a = Quiz.today(mon);
    expect(a.length, Quiz.perDay);
    expect(Quiz.today(mon).map((q) => q.id), a.map((q) => q.id));
    final b = Quiz.today(tue);
    expect(b.map((q) => q.id).toSet().intersection(a.map((q) => q.id).toSet()), isEmpty);

    expect(Quiz.doneOn(mon), isFalse);
    for (var i = 0; i < Quiz.perDay; i++) {
      Quiz.answer(i, a[i].answer, mon);
    }
    expect(Quiz.doneOn(mon), isTrue);
    expect(Quiz.streak(tue), 1); // Monday done, Tuesday not yet
    for (var i = 0; i < Quiz.perDay; i++) {
      Quiz.answer(i, 0, tue);
    }
    expect(Quiz.streak(tue), 2);
  });

  test('questions follow the language', () {
    Settings.instance.language = 'pa';
    final pa = Quiz.bank().firstWhere((q) => q.id == 'guru-order-1');
    expect(pa.options[pa.answer], 'ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ');
    Settings.instance.language = 'en';
  });

  test('every question has the same options and answer position in English, Punjabi and Hindi', () {
    final en = Quiz.bank('en');
    for (final l in ['pa', 'hi']) {
      final other = {for (final q in Quiz.bank(l)) q.id: q};
      for (final q in en) {
        expect(other[q.id], isNotNull, reason: '${q.id} in $l');
        expect(other[q.id]!.options.length, q.options.length, reason: '${q.id} in $l');
        expect(other[q.id]!.answer, q.answer, reason: 'switching language must keep the same answer: ${q.id} in $l');
      }
    }
  });

  test('the quiz language changes the questions without changing the app language', () {
    Settings.instance.language = 'en';
    Settings.instance.quizLanguage = 'pa';
    expect(Quiz.bank().firstWhere((q) => q.id == 'guru-order-1').options, contains('ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ'));
    expect(tr('Home'), 'Home');
    Settings.instance.quizLanguage = null;
    expect(Quiz.bank().firstWhere((q) => q.id == 'guru-order-1').options, contains('Guru Nanak Dev Ji'));
  });

  test("the website's copy of the questions is up to date (run: flutter test --tags export)", () {
    final file = File(websiteBankPath);
    expect(file.existsSync(), isTrue);
    expect(jsonDecode(file.readAsStringSync()), jsonDecode(jsonEncode(quizBankForWebsite())));
    for (final l in ['pa', 'hi']) {
      final ui = (quizBankForWebsite()['ui'] as Map)[l] as Map;
      for (final w in quizUiWords) {
        expect(ui[w], isNot(w), reason: '"$w" has no $l translation');
      }
    }
  });
}
