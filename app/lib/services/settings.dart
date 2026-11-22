import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Reading preferences, the daily Nitnem checklist and where each Bani was left — all on the phone.
class Settings extends ChangeNotifier {
  Settings._(this._p);
  final SharedPreferences _p;

  static late Settings instance;
  static Future<Settings> load() async => instance = Settings._(await SharedPreferences.getInstance());

  /* ---------- reading */
  double get fontScale => _p.getDouble('fontScale') ?? 1.0;
  set fontScale(double v) => _set(() => _p.setDouble('fontScale', v.clamp(0.8, 2.0)));

  bool get showTranslit => _p.getBool('showTranslit') ?? true;
  set showTranslit(bool v) => _set(() => _p.setBool('showTranslit', v));

  bool get showPunjabi => _p.getBool('showPunjabi') ?? false;
  set showPunjabi(bool v) => _set(() => _p.setBool('showPunjabi', v));

  bool get showHindi => _p.getBool('showHindi') ?? false;
  set showHindi(bool v) => _set(() => _p.setBool('showHindi', v));

  /// The script the Gurbani is shown in: 'gurmukhi', 'hindi' (Devanagari) or 'both'.
  String get gurbaniScript => _p.getString('gurbaniScript') ?? 'gurmukhi';
  set gurbaniScript(String v) => _set(() => _p.setString('gurbaniScript', v));
  bool get showGurmukhi => gurbaniScript != 'hindi';
  bool get showDevanagari => gurbaniScript != 'gurmukhi';

  /// Hindi only: Gurbani in Hindi letters with the Hindi meaning, nothing else.
  void readInHindi() => _set(() async {
        await _p.setString('gurbaniScript', 'hindi');
        await _p.setBool('showHindi', true);
        await _p.setBool('showTranslit', false);
        await _p.setBool('showPunjabi', false);
        return _p.setBool('showEnglish', false);
      });

  bool get showEnglish => _p.getBool('showEnglish') ?? true;
  set showEnglish(bool v) => _set(() => _p.setBool('showEnglish', v));

  /// Keep the screen on while a Bani is open (for reading Nitnem without the phone sleeping).
  bool get keepAwake => _p.getBool('keepAwake') ?? true;
  set keepAwake(bool v) => _set(() => _p.setBool('keepAwake', v));

  /// Banis shown as the pages of a Gutka (the default), or as one long scrolling list.
  bool get pageView => _p.getBool('pageView') ?? true;
  set pageView(bool v) => _set(() => _p.setBool('pageView', v));

  /// Live Kirtan in the lower quality, which uses about a third of the mobile data.
  bool get liveDataSaver => _p.getBool('liveDataSaver') ?? false;
  set liveDataSaver(bool v) => _set(() => _p.setBool('liveDataSaver', v));

  ThemeMode get themeMode => ThemeMode.values[(_p.getInt('themeMode') ?? 0).clamp(0, 2)];
  set themeMode(ThemeMode m) => _set(() => _p.setInt('themeMode', m.index));

  /* ---------- Nitnem checklist (per day) */
  static String _day(DateTime d) => '${d.year}-${d.month}-${d.day}';

  Set<String> doneToday() => (_p.getStringList('done:${_day(DateTime.now())}') ?? const []).toSet();

  bool isDone(String baniId) => doneToday().contains(baniId);

  void setDone(String baniId, bool done) {
    final key = 'done:${_day(DateTime.now())}';
    final s = doneToday();
    done ? s.add(baniId) : s.remove(baniId);
    _set(() => _p.setStringList(key, s.toList()));
    _forgetOldDays();
  }

  /// Days in a row (ending today or yesterday) with every morning Bani marked done.
  int streak(List<String> morningBanis) {
    var n = 0;
    var d = DateTime.now();
    bool full(DateTime day) {
      final s = (_p.getStringList('done:${_day(day)}') ?? const []).toSet();
      return morningBanis.every(s.contains);
    }
    if (!full(d)) d = d.subtract(const Duration(days: 1));
    while (full(d) && n < 400) {
      n++;
      d = d.subtract(const Duration(days: 1));
    }
    return n;
  }

  void _forgetOldDays() {
    final cutoff = DateTime.now().subtract(const Duration(days: 400));
    for (final k in _p.getKeys().where((k) => k.startsWith('done:'))) {
      final p = k.substring(5).split('-').map(int.tryParse).toList();
      if (p.length == 3 && p.every((x) => x != null) && DateTime(p[0]!, p[1]!, p[2]!).isBefore(cutoff)) _p.remove(k);
    }
  }

  /// The app's language: 'en', 'pa' (ਪੰਜਾਬੀ) or 'hi' (हिंदी).
  String get language => _p.getString('language') ?? 'en';
  set language(String v) => _set(() => _p.setString('language', v));

  /* ---------- you */
  /// The name shown on Profile (stays on the phone; there is no account).
  String get name => _p.getString('name') ?? '';
  set name(String v) => _set(() => _p.setString('name', v.trim()));

  /// The email someone gave with a suggestion or report (kept on the phone, filled in next time).
  String get contactEmail => _p.getString('contactEmail') ?? '';
  set contactEmail(String v) => _p.setString('contactEmail', v.trim());

  bool get onboarded => _p.getBool('onboarded') ?? false;
  set onboarded(bool v) => _set(() => _p.setBool('onboarded', v));

  /* ---------- bookmarks: "type|id|title|subtitle" (type: bani, shabad, ang, lesson) */
  List<Bookmark> get bookmarks => (_p.getStringList('bookmarks') ?? const []).map(Bookmark.parse).whereType<Bookmark>().toList();

  bool isBookmarked(String type, String id) => bookmarks.any((b) => b.type == type && b.id == id);

  void toggleBookmark(Bookmark b) {
    final list = bookmarks;
    final i = list.indexWhere((x) => x.type == b.type && x.id == b.id);
    i >= 0 ? list.removeAt(i) : list.insert(0, b);
    _set(() => _p.setStringList('bookmarks', list.map((x) => x.encode()).toList()));
  }

  /* ---------- learning */
  String? get lastLesson => _p.getString('lastLesson');
  set lastLesson(String? id) => _set(() => id == null ? _p.remove('lastLesson') : _p.setString('lastLesson', id));

  Set<String> get lessonsRead => (_p.getStringList('lessonsRead') ?? const []).toSet();
  void markLessonRead(String id) {
    final s = lessonsRead..add(id);
    _set(() => _p.setStringList('lessonsRead', s.toList()));
  }

  /* ---------- reminders: minutes after midnight, or null when off */
  int? reminder(String key) => _p.getInt('reminder:$key');
  void setReminder(String key, int? minutes) => _set(() => minutes == null ? _p.remove('reminder:$key') : _p.setInt('reminder:$key', minutes));

  /* ---------- where each Bani was left (scroll offset), to carry on from there */
  double position(String key) => _p.getDouble('pos:$key') ?? 0;
  void savePosition(String key, double offset) => _p.setDouble('pos:$key', offset);

  /// In page view: the first line on the page that was open (pages change with text size).
  int pageLine(String key) => _p.getInt('pageLine:$key') ?? 0;
  void savePageLine(String key, int line) => _p.setInt('pageLine:$key', line);

  void _set(Future<bool> Function() write) {
    write();
    notifyListeners();
  }
}

/// Something saved from a reading screen.
class Bookmark {
  const Bookmark(this.type, this.id, this.title, [this.subtitle = '']);
  final String type, id, title, subtitle;

  String encode() => [type, id, title, subtitle].map((s) => s.replaceAll('|', '/')).join('|');

  static Bookmark? parse(String s) {
    final p = s.split('|');
    return p.length < 3 ? null : Bookmark(p[0], p[1], p[2], p.length > 3 ? p[3] : '');
  }
}
