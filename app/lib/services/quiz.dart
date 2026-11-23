import 'dart:convert';
import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

import '../models.dart';
import 'i18n.dart';
import 'library.dart';
import 'settings.dart';

/// One multiple-choice question. [answer] is the index of the right option.
class QuizQuestion {
  const QuizQuestion(this.id, this.question, this.options, this.answer, {this.detail});
  final String id;
  final String question;
  final List<String> options;
  final int answer;

  /// A line under the question (e.g. the event being asked about).
  final String? detail;

  Map<String, Object?> toJson() => {'id': id, 'q': question, 'o': options, 'a': answer, 'd': detail};
  factory QuizQuestion.fromJson(Map<String, dynamic> j) =>
      QuizQuestion('${j['id']}', '${j['q']}', (j['o'] as List).map((x) => '$x').toList(), (j['a'] as num).toInt(), detail: j['d'] as String?);
}

/// An answer option: its English text (used to choose and order the options) and the text shown.
typedef _Opt = ({String en, String text});
_Opt _o(String en, String text) => (en: en, text: text);

/// The questions everyone knows the Kids section by.
const kidsBasics = [
  ('Who was the first Sikh Guru?', ['Guru Nanak Dev Ji', 'Guru Gobind Singh Ji', 'Guru Arjan Dev Ji'], 0),
  ('How many Gurus were there in human form?', ['Five', 'Ten', 'Twelve'], 1),
  ('Who is the Guru of the Sikhs today?', ['Guru Har Krishan Ji', 'Sri Guru Granth Sahib Ji', 'Guru Tegh Bahadur Ji'], 1),
  ('Which Guru created the Khalsa on Vaisakhi in 1699?', ['Guru Ram Das Ji', 'Guru Gobind Singh Ji', 'Guru Angad Dev Ji'], 1),
  ('In which city is Sri Harmandir Sahib (the Golden Temple)?', ['Amritsar', 'Delhi', 'Patna'], 0),
  ('What is the free community kitchen at a Gurdwara called?', ['Sangat', 'Langar', 'Kirtan'], 1),
  ('Which of these is one of the Five Ks?', ['Kara', 'Kitab', 'Kursi'], 0),
  ('What does “Vand Chhakna” mean?', ['Sleeping early', 'Sharing with others', 'Singing loudly'], 1),
];

/// The Daily Quiz: five questions a day, answered one at a time, never the same five twice until
/// every question has come up. Questions are built from the app's own checked content (the Gurus,
/// Sikh history, Learn, the Banis) plus quizzes the Sikhify team publishes for children.
class Quiz {
  Quiz._();
  static const perDay = 5;

  /* ------------------------------------------------------------------ the question bank */

  /// The language the quiz is played in: its own choice, else the app's.
  static String get language => Settings.instance.quizLanguage ?? Settings.instance.language;

  /// Every question, in the quiz's language (or [lang]). Each has a stable id, and its options are always
  /// in the same order, so a day's quiz looks the same however often it is opened.
  /// The website's Daily Quiz uses these same questions (exported by test/export_quiz_bank_test.dart).
  static List<QuizQuestion> bank([String? lang]) => I18n.instance.inLanguage(lang ?? language, _bank);

  static List<QuizQuestion> _bank() {
    final lib = Library.instance;
    final i18n = I18n.instance;
    final out = <QuizQuestion>[];
    // Every choice (which questions, which wrong answers, their order) is made on the English text, and only
    // the words shown are translated: a question has the same options in the same order in every language.

    // Built-in basics.
    for (final (i, (q, options, right)) in kidsBasics.indexed) {
      out.add(_make('basic-$i', tr(q), _o(options[right], tr(options[right])), [for (final (j, o) in options.indexed) if (j != right) _o(o, tr(o))]));
    }

    // The Ten Gurus: order, birthplace, lifetime.
    final gurusEn = lib.gurus;
    final gurus = gurusEn.map(i18n.guru).toList();
    for (final (k, g) in gurus.indexed) {
      final en = gurusEn[k];
      final others = [for (var j = 0; j < gurus.length; j++) if (j != k) j];
      out.add(_make('guru-order-${g.number}', tr('Who was the {n} Guru?').replaceAll('{n}', tr(_ordinals[g.number - 1])), _o(en.name, g.name),
          [for (final j in others) _o(gurusEn[j].name, gurus[j].name)]));
      out.add(_make('guru-life-${g.number}', tr('When did {name} live?').replaceAll('{name}', g.name), _o(en.lifespan, g.lifespan),
          [for (final j in others) _o(gurusEn[j].lifespan, gurus[j].lifespan)]));
      final place = _primary(g.birthplace);
      out.add(_make('guru-born-${g.number}', tr('Which Guru was born at {place}?').replaceAll('{place}', place), _o(en.name, g.name),
          [for (final j in others) if (!_samePlace(gurusEn[j].birthplace, en.birthplace)) _o(gurusEn[j].name, gurus[j].name)]));
    }

    // Sikh history: the year and the place of an event (only clear, single answers).
    final eventsEn = ((lib.history['events'] ?? []) as List)
        .map((e) => (e as Map).cast<String, dynamic>())
        .where((e) => !const {'1947', '1984'}.contains('${e['year']}'))
        .toList();
    final events = eventsEn.map(i18n.history).toList();
    bool plainYear(Object? y) => RegExp(r'^\d{4}$').hasMatch('$y');
    for (final (k, e) in eventsEn.indexed) {
      if (!plainYear(e['year'])) continue;
      final year = '${e['year']}';
      final years = eventsEn.map((x) => '${x['year']}').where((y) => plainYear(y) && y != year).toSet();
      out.add(_make('event-year-${e['id']}', tr('In which year did this happen?'), _o(year, year), [for (final y in years) _o(y, y)], detail: '${events[k]['title']}'));
    }
    const vague = {'Punjab', 'South Asia and beyond', 'Amritsar and Delhi', 'Dera Baba Nanak – Kartarpur'};
    String placeOf(Map<String, dynamic> e) => '${e['location'] ?? ''}';
    String shownPlace(int j) => placeOf(events[j]).isEmpty ? placeOf(eventsEn[j]) : placeOf(events[j]);
    for (final (k, e) in eventsEn.indexed) {
      final loc = placeOf(e);
      if (loc.isEmpty || vague.contains(loc)) continue;
      // "Revelation at Sultanpur Lodhi" would give its own answer away.
      const plain = {'sri', 'sahib', 'takht', 'punjab', 'near', 'present-day', 'pakistan', 'bihar', 'and'};
      final title = '${e['title']}'.toLowerCase();
      if (loc.toLowerCase().split(RegExp(r'[\s,()–-]+')).any((w) => w.length > 3 && !plain.contains(w) && title.contains(w))) continue;
      out.add(_make('event-place-${e['id']}', tr('Where did this happen?'), _o(loc, shownPlace(k)), [
        for (var j = 0; j < eventsEn.length; j++)
          if (placeOf(eventsEn[j]).isNotEmpty && !vague.contains(placeOf(eventsEn[j])) && !_samePlace(placeOf(eventsEn[j]), loc)) _o(placeOf(eventsEn[j]), shownPlace(j)),
      ], detail: '${events[k]['title']}'));
    }

    // People of Sikh history, from what they are remembered for.
    final figuresEn = ((lib.history['figures'] ?? []) as List).map((f) => (f as Map).cast<String, dynamic>()).toList();
    final figures = figuresEn.map(i18n.figure).toList();
    const common = {'bhai', 'mata', 'baba', 'mai', 'singh', 'sahibzada', 'maharaja', 'maharani', 'ji', 'and'};
    for (final (k, f) in figuresEn.indexed) {
      final summary = '${f['summary'] ?? ''}';
      final name = '${f['name']}';
      final words = name.toLowerCase().split(RegExp(r'[\s,&]+')).where((w) => w.length > 2 && !common.contains(w));
      if (summary.isEmpty || words.any((w) => summary.toLowerCase().contains(w))) continue; // the answer is in the question
      out.add(_make('figure-${f['id']}', tr('Who is this?'), _o(name, '${figures[k]['name']}'),
          [for (var j = 0; j < figuresEn.length; j++) if (j != k) _o('${figuresEn[j]['name']}', '${figures[j]['name']}')],
          detail: '${figures[k]['summary'] ?? summary}'));
    }

    // Sikh words and practices: which word matches the meaning.
    const terms = {
      'ik-onkar', 'seva', 'sangat', 'pangat', 'hukam', 'chardi-kala', 'sarbat-da-bhala', 'five-ks-overview', 'nitnem', 'ardas', 'kirtan', 'langar',
      'amrit-sanchar', 'kesh', 'kangha', 'kara', 'kachera', 'kirpan', 'naam-japna', 'kirat-karni', 'vand-chhakna', 'equality',
    };
    final lessonsEn = lib.lessons.where((l) => terms.contains(l.id)).toList();
    final lessons = lessonsEn.map(i18n.lesson).toList();
    String word(Lesson l) => l.title.split(' — ').first.trim();
    for (final (k, l) in lessonsEn.indexed) {
      final meaning = l.summary.toLowerCase();
      if (meaning.contains(word(l).toLowerCase())) continue;
      out.add(_make('term-${l.id}', tr('Which word means this?'), _o(word(l), word(lessons[k])),
          [for (var j = 0; j < lessonsEn.length; j++) if (j != k && !meaning.contains(word(lessonsEn[j]).toLowerCase())) _o(word(lessonsEn[j]), word(lessons[j]))],
          detail: lessons[k].summary));
    }

    // The Banis: who wrote them, and when they are read in Nitnem.
    final authors = {for (final g in lib.gurus) g.name};
    final banis = lib.banis.where((b) => authors.contains(b.author) && b.id != 'asa-di-vaar').toList(); // Asa di Vaar also has Saloks of Guru Angad Dev Ji
    final shown = {for (final (k, g) in gurus.indexed) gurusEn[k].name: g.name};
    for (final b in banis) {
      out.add(_make('bani-author-${b.id}', tr('Who wrote {bani}?').replaceAll('{bani}', _baniName(b)), _o(b.author, shown[b.author] ?? b.author),
          [for (final a in authors) if (a != b.author) _o(a, shown[a] ?? a)]));
    }
    const times = {'japji-sahib': 0, 'jaap-sahib': 0, 'tav-prasad-savaiye': 0, 'rehras-sahib': 1, 'sohila-sahib': 2};
    const timeNames = ['In the morning (Amrit Vela)', 'In the evening', 'At night, before sleep'];
    for (final b in lib.banis.where((b) => times.containsKey(b.id))) {
      final t = times[b.id]!;
      out.add(_make('bani-time-${b.id}', tr('When is {bani} read in Nitnem?').replaceAll('{bani}', _baniName(b)), _o(timeNames[t], tr(timeNames[t])),
          [for (final (i, n) in timeNames.indexed) if (i != t) _o(n, tr(n))]));
    }

    return out.where((q) => q.options.length >= 3).toList();
  }

  static String _baniName(BaniInfo b) => I18n.instance.lang == 'pa' && b.gurmukhiName.isNotEmpty ? b.gurmukhiName : b.name;

  static const _ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

  /// "Goindwal Sahib, Punjab" → "Goindwal Sahib"; "Patna Sahib, Bihar" → "Patna Sahib".
  static String _primary(String place) => place.split(RegExp(r'[,(]')).first.trim();

  /// Two place names that could be the same place ("Amritsar" and "Sri Harmandir Sahib, Amritsar").
  static bool _samePlace(String a, String b) {
    final x = a.toLowerCase(), y = b.toLowerCase();
    return x.contains(_primary(b).toLowerCase()) || y.contains(_primary(a).toLowerCase());
  }

  /// A question with the right answer and up to three others, mixed the same way every time. Options are
  /// (English, shown) pairs: duplicates and the order are decided on the English, so every language matches.
  static QuizQuestion _make(String id, String question, _Opt right, List<_Opt> wrong, {String? detail}) {
    final rnd = Random(_hash(id));
    final seen = <String>{right.en};
    final pool = [for (final w in wrong) if (seen.add(w.en)) w]..shuffle(rnd);
    final options = [right, ...pool.take(3)]..shuffle(rnd);
    return QuizQuestion(id, question, [for (final o in options) o.text], options.indexOf(right), detail: detail);
  }

  /// FNV-1a: the same number for the same text on every phone and every run.
  static int _hash(String s) {
    var h = 0x811c9dc5;
    for (final c in utf8.encode(s)) {
      h = ((h ^ c) * 0x01000193) & 0x7fffffff;
    }
    return h;
  }

  /* ------------------------------------------------------------------ quizzes from sikhify.in */

  /// Questions from the children's quizzes published on sikhify.in (saved on the phone).
  static List<QuizQuestion> siteQuestions() {
    final raw = _prefs?.getString('quiz:site');
    if (raw == null) return const [];
    try {
      return (jsonDecode(raw) as List).map((q) => QuizQuestion.fromJson((q as Map).cast<String, dynamic>())).toList();
    } catch (_) {
      return const [];
    }
  }

  /// Keeps the published quizzes for the daily pick (called when the Kids section loads them).
  static void saveSiteQuestions(List<QuizQuestion> questions) {
    if (questions.isEmpty) return;
    final byId = {for (final q in siteQuestions()) q.id: q, for (final q in questions) q.id: q};
    _prefs?.setString('quiz:site', jsonEncode(byId.values.map((q) => q.toJson()).toList()));
  }

  /* ------------------------------------------------------------------ the day's five */

  static SharedPreferences? _prefs;
  static Future<void> load() async => _prefs = await SharedPreferences.getInstance();

  /// The questions with these ids, in the reader's language (for a quiz a friend shared).
  /// Ids this phone doesn't have (e.g. a quiz published after its last visit) are left out.
  static List<QuizQuestion> byIds(List<String> ids) {
    final all = {for (final q in [...bank(), ...siteQuestions()]) q.id: q};
    return [for (final id in ids) ?all[id]];
  }

  static String dayKey(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// Today's five questions: picked once, the first time the quiz is opened that day.
  static List<QuizQuestion> today([DateTime? now]) {
    final day = dayKey(now ?? DateTime.now());
    final all = {for (final q in [...bank(), ...siteQuestions()]) q.id: q};
    var ids = _prefs?.getStringList('quiz:day:$day');
    if (ids == null || ids.any((id) => !all.containsKey(id))) {
      var seen = (_prefs?.getStringList('quiz:seen') ?? const <String>[]).toSet();
      var fresh = all.keys.where((id) => !seen.contains(id)).toList();
      if (fresh.length < perDay) {
        seen = {}; // every question has come up: start again
        fresh = all.keys.toList();
      }
      fresh.sort(); // the same order on every phone before the day's shuffle
      fresh.shuffle(Random(_hash(day)));
      ids = fresh.take(perDay).toList();
      _prefs?.setStringList('quiz:day:$day', ids);
      _prefs?.setStringList('quiz:seen', [...seen, ...ids]);
    }
    return [for (final id in ids) all[id]!];
  }

  /// The option chosen for each of today's questions (null = not answered yet).
  static List<int?> answers([DateTime? now]) {
    final raw = _prefs?.getStringList('quiz:ans:${dayKey(now ?? DateTime.now())}') ?? const [];
    return [for (var i = 0; i < perDay; i++) i < raw.length && raw[i].isNotEmpty ? int.tryParse(raw[i]) : null];
  }

  static void answer(int question, int option, [DateTime? now]) {
    final a = answers(now);
    a[question] = option;
    _prefs?.setStringList('quiz:ans:${dayKey(now ?? DateTime.now())}', [for (final x in a) x?.toString() ?? '']);
  }

  static bool doneOn(DateTime d) => answers(d).every((a) => a != null);

  /// Days in a row the quiz was finished, up to today (or yesterday, if today's isn't done yet).
  static int streak([DateTime? now]) {
    var d = now ?? DateTime.now();
    if (!doneOn(d)) d = d.subtract(const Duration(days: 1));
    var n = 0;
    while (doneOn(d) && n < 3650) {
      n++;
      d = d.subtract(const Duration(days: 1));
    }
    return n;
  }
}
