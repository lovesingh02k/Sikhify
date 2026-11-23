// The Daily Quiz's questions and screen words in English, Punjabi and Hindi, for the website
// (frontend/src/data/quizBank.json). The website plays these same questions, so a quiz shared
// from either one lists the same question ids.
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/quiz.dart';

const quizLanguages = ['en', 'pa', 'hi'];
const websiteBankPath = '../frontend/src/data/quizBank.json';

/// The quiz screen's words that the website shows too.
const quizUiWords = [
  'Daily Quiz', '5 new questions every day — on the Gurus, Sikh history, Gurbani and Sikh life.', 'Question', 'Next question', 'See my score',
  'Shabaash! That’s right.', 'Good try! The answer is', 'Perfect! Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!', 'Very good! Keep learning.',
  'Good effort — you’ll know these next time.', 'Streak', 'day', 'days', 'Come back tomorrow for 5 new questions.', 'Share my score', 'Ask a friend',
  'Your friend got', 'Can you beat them?', 'A friend sent you this question. Can you answer it?', 'You beat your friend!', 'A tie with your friend!',
  'Your friend wins this time.', 'Play today’s Daily Quiz', 'Sikhify Daily Quiz', 'Can you answer today’s questions?', 'Can you answer this?',
  'Quiz from a friend', 'Quiz language',
];

/// {questions: [{id, en: {q, o, a, d}, pa: {...}, hi: {...}}], ui: {en: {...}, pa: {...}, hi: {...}}}
Map<String, Object?> quizBankForWebsite() {
  final banks = {for (final l in quizLanguages) l: {for (final q in Quiz.bank(l)) q.id: q}};
  Map<String, Object?> one(String l, String id) {
    final q = banks[l]![id]!;
    return {'q': q.question, 'o': q.options, 'a': q.answer, if (q.detail != null && q.detail!.isNotEmpty) 'd': q.detail};
  }
  return {
    'about': 'Generated from the Sikhify app (app/test/quiz_bank_export.dart). Do not edit by hand: run `flutter test --tags export` in app/.',
    'questions': [
      for (final id in banks['en']!.keys) {'id': id, for (final l in quizLanguages) l: one(l, id)},
    ],
    'ui': {for (final l in quizLanguages) l: I18n.instance.inLanguage(l, () => {for (final w in quizUiWords) w: tr(w)})},
  };
}
