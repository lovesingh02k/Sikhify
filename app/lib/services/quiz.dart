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

  /// Every question, in the reader's language. Each has a stable id, and its options are always in the
  /// same order, so a day's quiz looks the same however often it is opened.
  static List<QuizQuestion> bank() {
    final lib = Library.instance;
    final i18n = I18n.instance;
    final out = <QuizQuestion>[];

    // Built-in basics.
    for (final (i, (q, options, right)) in kidsBasics.indexed) {
      out.add(_make('basic-$i', tr(q), options[right], [for (final (j, o) in options.indexed) if (j != right) o].map(tr).toList()));
    }

    // The Ten Gurus: order, birthplace, lifetime.
    final gurus = lib.gurus.map(i18n.guru).toList();
    for (final g in gurus) {
      final others = gurus.where((x) => x.id != g.id).toList();
      out.add(_make('guru-order-${g.number}', tr('Who was the {n} Guru?').replaceAll('{n}', tr(_ordinals[g.number - 1])), g.name, others.map((x) => x.name).toList()));
      out.add(_make('guru-life-${g.number}', tr('When did {name} live?').replaceAll('{name}', g.name), g.lifespan, others.map((x) => x.lifespan).toList()));
      final place = _primary(g.birthplace);
      final elsewhere = others.where((x) => !_samePlace(x.birthplace, g.birthplace)).toList();
      out.add(_make('guru-born-${g.number}', tr('Which Guru was born at {place}?').replaceAll('{place}', place), g.name, elsewhere.map((x) => x.name).toList()));
    }

    // Sikh history: the year and the place of an event (only clear, single answers).
    final events = ((lib.history['events'] ?? []) as List).map((e) => i18n.history((e as Map).cast<String, dynamic>())).toList();
    bool plainYear(Object? y) => RegExp(r'^\d{4}$').hasMatch('$y');
    final quizEvents = events.where((e) => !const {'1947', '1984'}.contains('${e['year']}')).toList();
    for (final e in quizEvents.where((e) => plainYear(e['year']))) {
      final years = quizEvents.map((x) => '${x['year']}').where((y) => plainYear(y) && y != '${e['year']}').toSet().toList();
      out.add(_make('event-year-${e['id']}', tr('In which year did this happen?'), '${e['year']}', years, detail: '${e['title']}'));
    }
    const vague = {'Punjab', 'South Asia and beyond', 'Amritsar and Delhi', 'Dera Baba Nanak – Kartarpur'};
    for (final e in quizEvents) {
      final loc = '${e['location'] ?? ''}';
      if (loc.isEmpty || vague.contains(loc)) continue;
      // "Revelation at Sultanpur Lodhi" would give its own answer away.
      const plain = {'sri', 'sahib', 'takht', 'punjab', 'near', 'present-day', 'pakistan', 'bihar', 'and'};
      final title = '${e['title']}'.toLowerCase();
      if (loc.toLowerCase().split(RegExp(r'[\s,()–-]+')).any((w) => w.length > 3 && !plain.contains(w) && title.contains(w))) continue;
      final others = quizEvents.map((x) => '${x['location'] ?? ''}').where((l) => l.isNotEmpty && !vague.contains(l) && !_samePlace(l, loc)).toSet().toList();
      out.add(_make('event-place-${e['id']}', tr('Where did this happen?'), loc, others, detail: '${e['title']}'));
    }

    // People of Sikh history, from what they are remembered for.
    final figures = ((lib.history['figures'] ?? []) as List).map((f) => i18n.figure((f as Map).cast<String, dynamic>())).toList();
    const common = {'bhai', 'mata', 'baba', 'mai', 'singh', 'sahibzada', 'maharaja', 'maharani', 'ji', 'and'};
    for (final f in figures) {
      final summary = '${f['summary'] ?? ''}';
      final name = '${f['name']}';
      final words = name.toLowerCase().split(RegExp(r'[\s,&]+')).where((w) => w.length > 2 && !common.contains(w));
      if (summary.isEmpty || words.any((w) => summary.toLowerCase().contains(w))) continue; // the answer is in the question
      out.add(_make('figure-${f['id']}', tr('Who is this?'), name, figures.where((x) => x['id'] != f['id']).map((x) => '${x['name']}').toList(), detail: summary));
    }

    // Sikh words and practices: which word matches the meaning.
    const terms = {
      'ik-onkar', 'seva', 'sangat', 'pangat', 'hukam', 'chardi-kala', 'sarbat-da-bhala', 'five-ks-overview', 'nitnem', 'ardas', 'kirtan', 'langar',
      'amrit-sanchar', 'kesh', 'kangha', 'kara', 'kachera', 'kirpan', 'naam-japna', 'kirat-karni', 'vand-chhakna', 'equality',
    };
    final lessons = lib.lessons.where((l) => terms.contains(l.id)).map(i18n.lesson).toList();
    String word(Lesson l) => l.title.split(' — ').first.trim();
    for (final l in lessons) {
      final meaning = l.summary;
      if (meaning.toLowerCase().contains(word(l).toLowerCase())) continue;
      final others = lessons.where((x) => x.id != l.id && !meaning.toLowerCase().contains(word(x).toLowerCase())).map(word).toList();
      out.add(_make('term-${l.id}', tr('Which word means this?'), word(l), others, detail: meaning));
    }

    // The Banis: who wrote them, and when they are read in Nitnem.
    final authors = {for (final g in lib.gurus) g.name};
    final banis = lib.banis.where((b) => authors.contains(b.author) && b.id != 'asa-di-vaar').toList(); // Asa di Vaar also has Saloks of Guru Angad Dev Ji
    final shown = {for (final g in gurus) lib.gurus.firstWhere((x) => x.id == g.id).name: g.name};
    for (final b in banis) {
      out.add(_make('bani-author-${b.id}', tr('Who wrote {bani}?').replaceAll('{bani}', _baniName(b)), shown[b.author] ?? b.author,
          [for (final a in authors) if (a != b.author) shown[a] ?? a]));
    }
    const times = {'japji-sahib': 0, 'jaap-sahib': 0, 'tav-prasad-savaiye': 0, 'rehras-sahib': 1, 'sohila-sahib': 2};
    final timeNames = [tr('In the morning (Amrit Vela)'), tr('In the evening'), tr('At night, before sleep')];
    for (final b in lib.banis.where((b) => times.containsKey(b.id))) {
      final t = times[b.id]!;
      out.add(_make('bani-time-${b.id}', tr('When is {bani} read in Nitnem?').replaceAll('{bani}', _baniName(b)), timeNames[t], [for (final (i, n) in timeNames.indexed) if (i != t) n]));
    }

    return out.where((q) => q.options.length >= 3).toList();
  }

  static String _baniName(BaniInfo b) => Settings.instance.language == 'pa' && b.gurmukhiName.isNotEmpty ? b.gurmukhiName : b.name;

  static const _ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];

  /// "Goindwal Sahib, Punjab" → "Goindwal Sahib"; "Patna Sahib, Bihar" → "Patna Sahib".
  static String _primary(String place) => place.split(RegExp(r'[,(]')).first.trim();

  /// Two place names that could be the same place ("Amritsar" and "Sri Harmandir Sahib, Amritsar").
  static bool _samePlace(String a, String b) {
    final x = a.toLowerCase(), y = b.toLowerCase();
    return x.contains(_primary(b).toLowerCase()) || y.contains(_primary(a).toLowerCase());
  }

  /// A question with the right answer and up to three others, mixed the same way every time.
  static QuizQuestion _make(String id, String question, String right, List<String> wrong, {String? detail}) {
    final rnd = Random(_hash(id));
    final pool = wrong.where((w) => w != right).toSet().toList()..shuffle(rnd);
    final options = [right, ...pool.take(3)]..shuffle(rnd);
    return QuizQuestion(id, question, options, options.indexOf(right), detail: detail);
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
