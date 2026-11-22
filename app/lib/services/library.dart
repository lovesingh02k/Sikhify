import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models.dart';

/// The Gurbani bundled with the app (exported from the website by scripts/export-app-data.mjs):
/// the Bani library, the Nitnem schedule, the full Nitnem text and popular Shabads. Works offline.
class Library {
  Library._(this.banis, this.nitnemTimes, this.nitnemNote, this._text, this._shabads);

  final List<BaniInfo> banis;
  final List<NitnemTime> nitnemTimes;
  final String nitnemNote;
  final Map<String, dynamic> _text;
  final List<dynamic> _shabads;

  static Library? _instance;
  static Library get instance => _instance!;

  static Future<Library> load() async {
    if (_instance != null) return _instance!;
    final meta = jsonDecode(await rootBundle.loadString('assets/data/banis.json')) as Map<String, dynamic>;
    final text = jsonDecode(await rootBundle.loadString('assets/data/nitnem_text.json')) as Map<String, dynamic>;
    final shabads = jsonDecode(await rootBundle.loadString('assets/data/shabads.json')) as List<dynamic>;
    final learn = jsonDecode(await rootBundle.loadString('assets/data/learn.json')) as Map<String, dynamic>;
    final lib = Library._(
      (meta['banis'] as List).map((b) => BaniInfo.fromJson((b as Map).cast<String, dynamic>())).toList(),
      (meta['nitnem'] as List).map((t) => NitnemTime.fromJson((t as Map).cast<String, dynamic>())).toList(),
      (meta['note'] ?? '') as String,
      text,
      shabads,
    );
    lib.gurus = (learn['gurus'] as List).map((g) => Guru.fromJson((g as Map).cast<String, dynamic>())).toList();
    lib.lessons = [
      ...(learn['lessons'] as List).map((l) => Lesson.fromJson((l as Map).cast<String, dynamic>())),
      ...lib.gurus.map(Lesson.fromGuru),
    ];
    lib.learnCategories = (learn['categories'] as List).cast<String>();
    Future<Map<String, dynamic>> json(String name) async => jsonDecode(await rootBundle.loadString('assets/data/$name.json')) as Map<String, dynamic>;
    lib.history = await json('history');
    lib.rehat = await json('rehat');
    lib.faq = await json('faq');
    lib.contentTypes = await json('content_types');
    return _instance = lib;
  }

  /// Sikh History (timeline, historical figures, the Sikh Empire), Rehat Maryada and FAQ, as on the site.
  late final Map<String, dynamic> history, rehat, faq;

  /// Directory sections (shared/contentTypes.js): key → {label, plural, path, group, description, fields}.
  late final Map<String, dynamic> contentTypes;

  Guru? guru(String id) {
    for (final g in gurus) {
      if (g.id == id) return g;
    }
    return null;
  }

  /// Learn Sikhism: the website's lessons, plus one lesson per Guru Sahib (as on the site).
  late final List<Lesson> lessons;
  late final List<String> learnCategories;
  late final List<Guru> gurus;

  Lesson? lesson(String id) {
    for (final l in lessons) {
      if (l.id == id) return l;
    }
    return null;
  }

  List<Lesson> lessonsIn(String category) => lessons.where((l) => l.category == category).toList();

  /// A painting for a learning topic: the Guru's own for Guru lessons, else a fitting one.
  static String artFor(String category, [String? lessonId]) {
    if (lessonId != null && lessonId.startsWith('guru-') && lessonId != 'guru-tegh-bahadur-ji') return 'assets/images/gurus/$lessonId.webp';
    return switch (category) {
      'Basics' => 'assets/images/gurus/guru-nanak-dev-ji.webp',
      'Gurus' => 'assets/images/gurus/guru-gobind-singh-ji.webp',
      'Concepts' => 'assets/images/folio.webp',
      'Practices' => 'assets/images/golden_temple.webp',
      'Five Ks' => 'assets/images/gurus/guru-gobind-singh-ji.webp',
      'Sikh History' => 'assets/images/harmandir.webp',
      _ => 'assets/images/golden_temple.webp',
    };
  }

  BaniInfo? bani(String id) {
    for (final b in banis) {
      if (b.id == id) return b;
    }
    return null;
  }

  /// The full text of a Nitnem Bani, or null when it isn't bundled (fetch it from BaniDB instead).
  List<GurbaniLine>? bundledText(String id) {
    final lines = _text[id];
    if (lines is! List) return null;
    return lines.map((l) => GurbaniLine.fromBundle((l as Map).cast<String, dynamic>())).toList();
  }

  /// Popular Shabads (with meanings), for the Shabads tab.
  List<ShabadData> get shabads => _shabads.map((raw) {
        final s = (raw as Map).cast<String, dynamic>();
        final audio = s['audioUrl'] is String && (s['audioUrl'] as String).isNotEmpty ? AudioInfo.simple(s['audioUrl'] as String) : null;
        return ShabadData(
          title: (s['gurmukhiTitle'] ?? s['title'] ?? '') as String,
          subtitle: [s['author'], s['raag']].whereType<String>().where((x) => x.isNotEmpty).join(' · '),
          ang: s['ang'] is int ? s['ang'] as int : int.tryParse('${s['ang']}'),
          raag: s['raag'] as String?,
          writer: s['author'] as String?,
          audio: audio,
          lines: (s['lines'] as List).map((l) => GurbaniLine.fromBundle((l as Map).cast<String, dynamic>())).toList(),
        );
      }).toList();

  /// The Nitnem time that fits the hour (Amrit Vela until noon, evening until 9 pm, then night).
  NitnemTime timeFor(DateTime now) {
    final id = now.hour < 12 ? 'morning' : (now.hour < 21 ? 'evening' : 'night');
    return nitnemTimes.firstWhere((t) => t.id == id, orElse: () => nitnemTimes.first);
  }
}
