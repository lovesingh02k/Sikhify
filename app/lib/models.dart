/// Data shapes shared by the screens. Gurbani text comes from BaniDB (bundled for the
/// Nitnem Banis and popular Shabads, fetched live for the rest).
library;

import 'services/script.dart';

/// One line of Gurbani with its meanings. Any meaning may be missing.
class GurbaniLine {
  const GurbaniLine({required this.gurmukhi, this.translit, this.punjabi, this.hindi, this.english, this.paragraph, this.header = false, this.devanagariText});

  final String gurmukhi;
  final String? translit;
  final String? punjabi;
  final String? hindi;
  final String? english;

  /// The Gurbani itself in Hindi (Devanagari) script: BaniDB's when it has one, otherwise converted from the Gurmukhi.
  String get devanagari => devanagariText ?? toDevanagari(gurmukhi);
  final String? devanagariText;

  /// Paragraph number in a Bani (lines with the same number are read together).
  final int? paragraph;

  /// A heading such as the Raag / Mahalla line or a Bani's title.
  final bool header;

  /// From the site's bundled data ({g, t, pa, hi, en, p}).
  factory GurbaniLine.fromBundle(Map<String, dynamic> j) => GurbaniLine(
        gurmukhi: (j['g'] ?? '') as String,
        translit: _blank(j['t']),
        punjabi: _blank(j['pa']),
        hindi: _blank(j['hi']),
        english: _blank(j['en']),
        paragraph: j['p'] as int?,
        header: _isHeading((j['g'] ?? '') as String),
      );

  /// From a BaniDB v2 verse.
  factory GurbaniLine.fromBaniDb(Map<String, dynamic> v, {int? paragraph, bool header = false}) {
    // Any part may be missing (a Raag heading has no meaning), so each level falls back to empty.
    final verse = _map(v['verse']);
    final tr = _map(v['translation']);
    final en = _map(tr['en']);
    final pu = _map(tr['pu']);
    final hi = _map(tr['hi']);
    final translit = _map(v['transliteration']);
    final g = (verse['unicode'] ?? '') as String;
    return GurbaniLine(
      gurmukhi: g,
      translit: _blank(translit['english'] ?? translit['en']),
      devanagariText: _blank(translit['hindi'] ?? translit['hi']),
      punjabi: _blank(_map(pu['ss'])['unicode']),
      hindi: _blank(hi['ss']) ?? _blank(hi['sts']),
      english: _blank(en['bdb'] ?? en['ssk'] ?? en['ms']),
      paragraph: paragraph,
      header: header || _isHeading(g),
    );
  }

  static Map<String, dynamic> _map(Object? x) => x is Map ? x.cast<String, dynamic>() : const <String, dynamic>{};

  static String? _blank(Object? s) {
    if (s is! String) return null;
    // BaniDB marks pauses with ~ (one also ends some lines): shown as commas, never as a trailing one.
    final t = s.replaceAll(RegExp(r'\s*~\s*$'), '').replaceAll('~', ',').trim();
    return t.isEmpty ? null : t;
  }

  static final _heading = RegExp(r'^(ੴ|ਰਾਗੁ|.*ਮਹਲਾ\s*[੧-੯]*\s*॥?$|ਸਲੋਕ|ਪਉੜੀ\s*॥|ਛੰਤ)');
  static bool _isHeading(String g) => g.length < 40 && _heading.hasMatch(g.trim());
}

/// A Bani from the library (data/gurbani.js on the site).
class BaniInfo {
  BaniInfo.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = j['name'] as String,
        gurmukhiName = (j['gurmukhiName'] ?? '') as String,
        author = (j['author'] ?? '') as String,
        source = (j['source'] ?? '') as String,
        ang = j['ang']?.toString(),
        context = j['context'] as String?,
        nitnem = j['nitnem'] == true,
        baniDbId = j['baniDbId'] as int?,
        lineCount = j['lineCount'] as int?,
        audio = j['audio'] is Map ? AudioInfo.fromJson((j['audio'] as Map).cast<String, dynamic>()) : null;

  final String id;
  final String name;
  final String gurmukhiName;
  final String author;
  final String source;
  final String? ang;
  final String? context;
  final bool nitnem;
  final int? baniDbId;
  final int? lineCount;
  final AudioInfo? audio;
}

class AudioInfo {
  AudioInfo.fromJson(Map<String, dynamic> j)
      : url = j['url'] as String,
        by = j['by'] as String?,
        duration = j['duration'] as String?,
        license = j['license'] as String?;
  const AudioInfo.simple(this.url, {this.by}) : duration = null, license = null;

  final String url;
  final String? by;
  final String? duration;
  final String? license;
}

/// A Nitnem time of day and its Banis, in order.
class NitnemTime {
  NitnemTime.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        label = j['label'] as String,
        sub = (j['sub'] ?? '') as String,
        baniIds = (j['banis'] as List).cast<String>();

  final String id;
  final String label;
  final String sub;
  final List<String> baniIds;
}

/// A Shabad to read (bundled popular Shabads, search results, the Hukamnama).
class ShabadData {
  const ShabadData({required this.title, required this.lines, this.subtitle, this.ang, this.raag, this.writer, this.audio});

  final String title;
  final String? subtitle;
  final int? ang;
  final String? raag;
  final String? writer;
  final List<GurbaniLine> lines;
  final AudioInfo? audio;
}

/// The day's Hukamnama from Sri Harmandir Sahib.
class Hukamnama {
  const Hukamnama({required this.date, required this.lines, this.ang, this.raag, this.writer, this.audioUrl, this.kathaUrl, required this.source});

  final DateTime date;
  final List<GurbaniLine> lines;
  final int? ang;
  final String? raag;
  final String? writer;
  final String? audioUrl;
  final String? kathaUrl;
  final String source;

  /// The first lines of the Shabad itself (skipping the Raag / Mahalla heading).
  List<GurbaniLine> get opening {
    final body = lines.where((l) => !l.header).toList();
    return (body.isEmpty ? lines : body).take(2).toList();
  }
}

/// A Learn Sikhism lesson (data/learn.js on the site): titled sections of paragraphs and lists.
class Lesson {
  Lesson({required this.id, required this.title, this.gurmukhi, required this.category, required this.summary, required this.sections});

  factory Lesson.fromJson(Map<String, dynamic> j) => Lesson(
        id: j['id'] as String,
        title: j['title'] as String,
        gurmukhi: j['gurmukhi'] as String?,
        category: (j['category'] ?? '') as String,
        summary: (j['summary'] ?? '') as String,
        sections: ((j['sections'] ?? []) as List).map((s) {
          final m = (s as Map).cast<String, dynamic>();
          return LessonSection((m['heading'] ?? '') as String, ((m['paragraphs'] ?? []) as List).cast<String>(), ((m['list'] ?? []) as List).cast<String>());
        }).toList(),
      );

  /// The site builds each Guru's lesson from data/gurus.js; so does the app.
  factory Lesson.fromGuru(Guru g) => Lesson(
        id: g.id,
        title: g.name,
        gurmukhi: g.gurmukhi,
        category: 'Gurus',
        summary: '${g.lifespan} · ${g.guruship}',
        sections: [
          LessonSection('Life', [g.bio, if (g.birthplace.isNotEmpty) 'Born at ${g.birthplace}.'], const []),
          if (g.contributions.isNotEmpty) LessonSection('Contributions', const [], g.contributions),
          if (g.teachings.isNotEmpty) LessonSection('Teachings', const [], g.teachings),
          if (g.events.isNotEmpty) LessonSection('Timeline', const [], g.events),
        ],
      );

  final String id, title, category, summary;
  final String? gurmukhi;
  final List<LessonSection> sections;

  /// About 200 words a minute.
  int get minutes {
    final words = sections.fold<int>(summary.split(' ').length, (n, s) => n + [...s.paragraphs, ...s.list].join(' ').split(' ').length);
    return (words / 200).ceil().clamp(1, 60);
  }
}

class LessonSection {
  const LessonSection(this.heading, this.paragraphs, this.list);
  final String heading;
  final List<String> paragraphs, list;
}

class Guru {
  Guru.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        number = j['number'] as int,
        name = j['name'] as String,
        gurmukhi = (j['gurmukhi'] ?? '') as String,
        lifespan = (j['lifespan'] ?? '') as String,
        guruship = (j['guruship'] ?? '') as String,
        birthplace = (j['birthplace'] ?? '') as String,
        bio = (j['bio'] ?? '') as String,
        contributions = ((j['contributions'] ?? []) as List).cast<String>(),
        teachings = ((j['teachings'] ?? []) as List).map((t) => t is Map ? '${t['title'] ?? ''}${t['text'] != null ? ' — ${t['text']}' : ''}' : '$t').toList(),
        events = ((j['events'] ?? []) as List).map((e) => e is Map ? '${e['year']}: ${e['text']}' : '$e').toList();

  Guru._copy(Guru g, {String? name, String? guruship, String? birthplace, String? bio, List<String>? contributions, List<String>? teachings, List<String>? events})
      : id = g.id,
        number = g.number,
        gurmukhi = g.gurmukhi,
        lifespan = g.lifespan,
        name = name ?? g.name,
        guruship = guruship ?? g.guruship,
        birthplace = birthplace ?? g.birthplace,
        bio = bio ?? g.bio,
        contributions = contributions != null && contributions.length == g.contributions.length ? contributions : g.contributions,
        teachings = teachings != null && teachings.length == g.teachings.length ? teachings : g.teachings,
        events = events != null && events.length == g.events.length ? events : g.events;

  /// The same Guru with translated text (fields left null keep the English).
  Guru translated({String? name, String? guruship, String? birthplace, String? bio, List<String>? contributions, List<String>? teachings, List<String>? events}) =>
      Guru._copy(this, name: name, guruship: guruship, birthplace: birthplace, bio: bio, contributions: contributions, teachings: teachings, events: events);

  final String id, name, gurmukhi, lifespan, guruship, birthplace, bio;
  final int number;
  final List<String> contributions, teachings, events;

  /// The museum painting bundled with the app (none for Guru Tegh Bahadur Ji).
  String? get art => id == 'guru-tegh-bahadur-ji' ? null : 'assets/images/gurus/$id.webp';
}

/// One BaniDB search result.
class SearchHit {
  const SearchHit({required this.shabadId, required this.line, this.ang, this.writer, this.raag});

  final int shabadId;
  final GurbaniLine line;
  final int? ang;
  final String? writer;
  final String? raag;
}
