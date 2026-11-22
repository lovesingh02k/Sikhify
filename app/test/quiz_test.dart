import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
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
}
