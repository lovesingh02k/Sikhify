import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/library.dart';
import 'package:sikhify/services/settings.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
    await Library.load();
    await I18n.instance.load();
  });

  test('English by default; Punjabi and Hindi change screen words', () {
    Settings.instance.language = 'en';
    expect(tr('Home'), 'Home');
    Settings.instance.language = 'pa';
    expect(tr('Daily Hukamnama'), 'ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ');
    Settings.instance.language = 'hi';
    expect(tr('Daily Hukamnama'), 'आज का हुकमनामा');
    expect(tr('A word with no translation'), 'A word with no translation');
  });

  test('lessons, Gurus, history, FAQ and Rehat Maryada use the website translations', () {
    final lib = Library.instance;
    Settings.instance.language = 'pa';
    final lesson = I18n.instance.lesson(lib.lesson('what-is-sikhism')!);
    expect(lesson.title, 'ਸਿੱਖ ਧਰਮ ਕੀ ਹੈ?');
    expect(lesson.sections.first.paragraphs.first, contains('ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ'));
    expect(I18n.instance.guru(lib.guru('guru-nanak-dev-ji')!).name, 'ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ');
    final event = I18n.instance.history(((lib.history['events'] as List).first as Map).cast<String, dynamic>());
    expect(event['title'], 'ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ ਦਾ ਪ੍ਰਕਾਸ਼');
    final faq = I18n.instance.faq(((lib.faq['items'] as List).first as Map).cast<String, dynamic>());
    expect(faq['q'], 'ਸਿੱਖ ਧਰਮ ਕੀ ਹੈ?');
    final rehat = I18n.instance.rehat(((lib.rehat['sections'] as List).first as Map).cast<String, dynamic>());
    expect(rehat['title'], startsWith('ਰਹਿਤ ਮਰਯਾਦਾ'));
    Settings.instance.language = 'hi';
    expect(I18n.instance.lesson(lib.lesson('what-is-sikhism')!).title, isNot('What is Sikhism?'));
    Settings.instance.language = 'en';
    expect(I18n.instance.lesson(lib.lesson('what-is-sikhism')!).title, 'What is Sikhism?');
  });

  test('bookmarks and theme are saved', () {
    final s = Settings.instance;
    s.toggleBookmark(const Bookmark('ang', '1', 'Ang 1'));
    expect(s.isBookmarked('ang', '1'), isTrue);
    s.toggleBookmark(const Bookmark('ang', '1', 'Ang 1'));
    expect(s.isBookmarked('ang', '1'), isFalse);
  });
}
