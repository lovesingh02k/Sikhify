import 'dart:convert';

import 'package:flutter/services.dart' show rootBundle;

import '../models.dart';
import 'settings.dart';

/// The app's language: English, Punjabi (ਪੰਜਾਬੀ) or Hindi (हिंदी).
/// Screen words come from [_ui] below; lessons, the Gurus, Sikh History, FAQ and Rehat Maryada use the
/// website's own translations (data/i18n, exported to assets/data/i18n_pa.json and i18n_hi.json).
/// Anything not translated stays in English. Gurbani is always Gurmukhi.
class I18n {
  I18n._();
  static final instance = I18n._();
  static const languages = {'en': 'English', 'pa': 'ਪੰਜਾਬੀ', 'hi': 'हिंदी'};

  final Map<String, Map<String, dynamic>> _content = {};

  Future<void> load() async {
    for (final l in ['pa', 'hi']) {
      _content[l] = jsonDecode(await rootBundle.loadString('assets/data/i18n_$l.json')) as Map<String, dynamic>;
    }
  }

  String? _override;
  String get lang => _override ?? Settings.instance.language;

  /// Runs [build] as if the app were in [language] (e.g. the Daily Quiz in its own language).
  T inLanguage<T>(String? language, T Function() build) {
    final before = _override;
    _override = language;
    try {
      return build();
    } finally {
      _override = before;
    }
  }

  Map<String, dynamic>? _section(String key) {
    final c = _content[lang];
    final v = c == null ? null : c[key];
    return v is Map ? v.cast<String, dynamic>() : null;
  }

  /// The translated fields of one item (e.g. a lesson by its id), or null.
  Map<String, dynamic>? item(String section, String id) {
    final v = _section(section)?[id];
    return v is Map ? v.cast<String, dynamic>() : null;
  }

  Lesson lesson(Lesson l) {
    final t = item('learn', l.id) ?? (l.category == 'Gurus' ? _guruAsLesson(l) : null);
    if (t == null) return l;
    final sections = t['sections'];
    return Lesson(
      id: l.id,
      title: (t['title'] ?? l.title) as String,
      gurmukhi: l.gurmukhi,
      category: l.category,
      summary: (t['summary'] ?? l.summary) as String,
      sections: sections is List && sections.length == l.sections.length
          ? [
              for (var i = 0; i < sections.length; i++)
                LessonSection(
                  ((sections[i] as Map)['heading'] ?? l.sections[i].heading) as String,
                  _list((sections[i] as Map)['paragraphs'], l.sections[i].paragraphs),
                  _list((sections[i] as Map)['list'], l.sections[i].list),
                ),
            ]
          : l.sections,
    );
  }

  Map<String, dynamic>? _guruAsLesson(Lesson l) {
    final g = item('gurus', l.id);
    return g == null ? null : {'title': g['name'], 'summary': g['guruship']};
  }

  Guru guru(Guru g) {
    final t = item('gurus', g.id);
    if (t == null) return g;
    return g.translated(
      name: t['name'] as String?,
      guruship: t['guruship'] as String?,
      birthplace: t['birthplace'] as String?,
      bio: t['bio'] as String?,
      contributions: _strings(t['contributions']),
      teachings: _strings(t['teachings']),
      events: t['events'] is List ? (t['events'] as List).map((e) => e is Map ? '${e['year'] ?? ''}: ${e['text'] ?? ''}' : '$e').toList() : null,
    );
  }

  /// Translated title/summary pair for a Learn category (e.g. "Basics").
  (String, String)? learnSection(String category) {
    final v = _section('learnSections')?[category];
    return v is List && v.length >= 2 ? (v[0] as String, v[1] as String) : null;
  }

  Map<String, dynamic> history(Map<String, dynamic> e) => {...e, ...?item('history', e['id'] as String)};
  Map<String, dynamic> figure(Map<String, dynamic> f) => {...f, ...?item('historyFigures', f['id'] as String)};
  Map<String, dynamic> faq(Map<String, dynamic> q) => {...q, ...?item('faq', q['id'] as String)};
  Map<String, dynamic> rehat(Map<String, dynamic> s) => {...s, ...?item('rehatSections', s['id'] as String)};
  Map<String, dynamic>? get empire => _section('sikhEmpire');
  String? get nitnemNote => _content[lang]?['nitnemNote'] as String?;

  static List<String> _list(Object? v, List<String> fallback) => v is List && v.length == fallback.length ? v.cast<String>() : fallback;
  static List<String>? _strings(Object? v) => v is List ? v.map((x) => x is Map ? '${x['title'] ?? ''}${x['text'] != null ? ' — ${x['text']}' : ''}' : '$x').toList() : null;
}

/// A screen word in the chosen language (English when there is no translation).
String tr(String en) {
  final l = I18n.instance.lang;
  if (l == 'en') return en;
  return _ui[en]?[l == 'pa' ? 0 : 1] ?? en;
}

/// English → [Punjabi, Hindi].
const _ui = <String, List<String>>{
  // Navigation
  'Home': ['ਘਰ', 'होम'],
  'Learn': ['ਸਿੱਖੋ', 'सीखें'],
  'Media': ['ਮੀਡੀਆ', 'मीडिया'],
  'Profile': ['ਪ੍ਰੋਫ਼ਾਈਲ', 'प्रोफ़ाइल'],
  'Gurbani': ['ਗੁਰਬਾਣੀ', 'गुरबाणी'],
  'Gurdwaras': ['ਗੁਰਦੁਆਰੇ', 'गुरुद्वारे'],
  'Nitnem': ['ਨਿਤਨੇਮ', 'नितनेम'],
  'Hukamnama': ['ਹੁਕਮਨਾਮਾ', 'हुकमनामा'],
  'Festivals': ['ਤਿਉਹਾਰ', 'त्योहार'],
  'Kids': ['ਬੱਚੇ', 'बच्चे'],
  'Sikh History': ['ਸਿੱਖ ਇਤਿਹਾਸ', 'सिख इतिहास'],
  'Rehat Maryada': ['ਰਹਿਤ ਮਰਯਾਦਾ', 'रहत मर्यादा'],
  'FAQ': ['ਆਮ ਸਵਾਲ', 'सामान्य प्रश्न'],
  'The Ten Gurus': ['ਦਸ ਗੁਰੂ ਸਾਹਿਬਾਨ', 'दस गुरु साहिबान'],
  'Directory': ['ਡਾਇਰੈਕਟਰੀ', 'डायरेक्टरी'],
  'Kirtan & Katha': ['ਕੀਰਤਨ ਅਤੇ ਕਥਾ', 'कीर्तन और कथा'],
  'Search Gurbani': ['ਗੁਰਬਾਣੀ ਖੋਜੋ', 'गुरबाणी खोजें'],
  'Bookmarks': ['ਸੰਭਾਲੇ ਹੋਏ', 'सहेजे गए'],
  'Offline': ['ਔਫ਼ਲਾਈਨ', 'ऑफ़लाइन'],
  'Reminders': ['ਯਾਦ-ਦਹਾਨੀਆਂ', 'रिमाइंडर'],
  'All sections': ['ਸਾਰੇ ਭਾਗ', 'सभी भाग'],
  'More from sikhify.in': ['sikhify.in ਤੋਂ ਹੋਰ', 'sikhify.in से और'],
  // Home
  'Daily Hukamnama': ['ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ', 'आज का हुकमनामा'],
  'Latest Hukamnama': ['ਤਾਜ਼ਾ ਹੁਕਮਨਾਮਾ', 'ताज़ा हुकमनामा'],
  'Sri Harmandir Sahib': ['ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ', 'श्री हरिमंदर साहिब'],
  'Read Today': ['ਅੱਜ ਪੜ੍ਹੋ', 'आज पढ़ें'],
  'Quick Access': ['ਤੁਰੰਤ ਪਹੁੰਚ', 'त्वरित पहुँच'],
  'See All': ['ਸਭ ਵੇਖੋ', 'सभी देखें'],
  'Continue Learning': ['ਸਿੱਖਣਾ ਜਾਰੀ ਰੱਖੋ', 'सीखना जारी रखें'],
  'Continue': ['ਜਾਰੀ ਰੱਖੋ', 'जारी रखें'],
  'Upcoming Festivals': ['ਆਉਣ ਵਾਲੇ ਤਿਉਹਾਰ', 'आने वाले त्योहार'],
  'Morning': ['ਸਵੇਰ', 'सुबह'],
  'Evening': ['ਸ਼ਾਮ', 'शाम'],
  'Night': ['ਰਾਤ', 'रात'],
  'Continue with': ['ਜਾਰੀ ਰੱਖੋ:', 'जारी रखें:'],
  'Complete for now — Waheguru!': ['ਹੁਣ ਲਈ ਪੂਰਾ — ਵਾਹਿਗੁਰੂ!', 'अभी के लिए पूरा — वाहेगुरु!'],
  'Lesson': ['ਪਾਠ', 'पाठ'],
  'min': ['ਮਿੰਟ', 'मिनट'],
  // Learn
  'Lessons': ['ਪਾਠ', 'पाठ'],
  'All': ['ਸਾਰੇ', 'सभी'],
  'Search lessons': ['ਪਾਠ ਖੋਜੋ', 'पाठ खोजें'],
  'Learn. Grow. Connect.\nWith Sikhify': ['ਸਿੱਖੋ। ਵਧੋ। ਜੁੜੋ।\nSikhify ਨਾਲ', 'सीखें। बढ़ें। जुड़ें।\nSikhify के साथ'],
  'Mark as complete': ['ਪੂਰਾ ਹੋਇਆ', 'पूरा हुआ'],
  'Lesson complete': ['ਪਾਠ ਪੂਰਾ', 'पाठ पूरा'],
  'Next': ['ਅਗਲਾ', 'अगला'],
  'MIN READ': ['ਮਿੰਟ ਪੜ੍ਹਨਾ', 'मिनट पढ़ना'],
  // Gurbani
  'Morning, evening and night Banis': ['ਸਵੇਰ, ਸ਼ਾਮ ਅਤੇ ਰਾਤ ਦੀਆਂ ਬਾਣੀਆਂ', 'सुबह, शाम और रात की बाणियाँ'],
  'Today from Sri Harmandir Sahib': ['ਅੱਜ ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਤੋਂ', 'आज श्री हरिमंदर साहिब से'],
  'Popular Shabads': ['ਪ੍ਰਸਿੱਧ ਸ਼ਬਦ', 'प्रसिद्ध शबद'],
  'Read an Ang': ['ਅੰਗ ਪੜ੍ਹੋ', 'अंग पढ़ें'],
  'Any of the 1430 Angs': ['1430 ਅੰਗਾਂ ਵਿੱਚੋਂ ਕੋਈ ਵੀ', '1430 अंगों में से कोई भी'],
  'Search': ['ਖੋਜ', 'खोज'],
  'Shabads': ['ਸ਼ਬਦ', 'शबद'],
  'Ang': ['ਅੰਗ', 'अंग'],
  'Mark as done for today': ['ਅੱਜ ਲਈ ਪੂਰਾ', 'आज के लिए पूरा'],
  'Done for today': ['ਅੱਜ ਪੂਰਾ ਹੋਇਆ', 'आज पूरा हुआ'],
  'Today’s Nitnem': ['ਅੱਜ ਦਾ ਨਿਤਨੇਮ', 'आज का नितनेम'],
  'Nitnem complete today': ['ਅੱਜ ਦਾ ਨਿਤਨੇਮ ਪੂਰਾ', 'आज का नितनेम पूरा'],
  'Tick each Bani when you finish it.': ['ਹਰ ਬਾਣੀ ਪੂਰੀ ਹੋਣ ’ਤੇ ਨਿਸ਼ਾਨ ਲਾਓ।', 'हर बाणी पूरी होने पर निशान लगाएँ।'],
  'Previous day': ['ਪਿਛਲਾ ਦਿਨ', 'पिछला दिन'],
  'Today': ['ਅੱਜ', 'आज'],
  'Tomorrow': ['ਕੱਲ੍ਹ', 'कल'],
  'in {n} days': ['{n} ਦਿਨਾਂ ਵਿੱਚ', '{n} दिन में'],
  'Monday': ['ਸੋਮਵਾਰ', 'सोमवार'],
  'Tuesday': ['ਮੰਗਲਵਾਰ', 'मंगलवार'],
  'Wednesday': ['ਬੁੱਧਵਾਰ', 'बुधवार'],
  'Thursday': ['ਵੀਰਵਾਰ', 'गुरुवार'],
  'Friday': ['ਸ਼ੁੱਕਰਵਾਰ', 'शुक्रवार'],
  'Saturday': ['ਸ਼ਨਿੱਚਰਵਾਰ', 'शनिवार'],
  'Sunday': ['ਐਤਵਾਰ', 'रविवार'],
  'Events': ['ਸਮਾਗਮ', 'कार्यक्रम'],
  'Upcoming Events': ['ਆਉਣ ਵਾਲੇ ਸਮਾਗਮ', 'आने वाले कार्यक्रम'],
  'Quiz language': ['ਕੁਇਜ਼ ਦੀ ਭਾਸ਼ਾ', 'क्विज़ की भाषा'],
  'Go to page': ['ਪੰਨੇ ’ਤੇ ਜਾਓ', 'पृष्ठ पर जाएँ'],
  'Page number': ['ਪੰਨਾ ਨੰਬਰ', 'पृष्ठ संख्या'],
  'Go to Ang': ['ਅੰਗ ’ਤੇ ਜਾਓ', 'अंग पर जाएँ'],
  'Ang number': ['ਅੰਗ ਨੰਬਰ', 'अंग संख्या'],
  'Go': ['ਜਾਓ', 'जाएँ'],
  'Enter a number from {min} to {max}': ['{min} ਤੋਂ {max} ਤੱਕ ਨੰਬਰ ਲਿਖੋ', '{min} से {max} तक संख्या लिखें'],
  'Sikh Store': ['ਸਿੱਖ ਸਟੋਰ', 'सिख स्टोर'],
  'Choose a product and order directly on WhatsApp.': ['ਉਤਪਾਦ ਚੁਣੋ ਅਤੇ ਸਿੱਧਾ ਵਟਸਐਪ ’ਤੇ ਆਰਡਰ ਕਰੋ।', 'उत्पाद चुनें और सीधे व्हाट्सएप पर ऑर्डर करें।'],
  'Order on WhatsApp': ['ਵਟਸਐਪ ’ਤੇ ਆਰਡਰ ਕਰੋ', 'व्हाट्सएप पर ऑर्डर करें'],
  'Ask on WhatsApp': ['ਵਟਸਐਪ ’ਤੇ ਪੁੱਛੋ', 'व्हाट्सएप पर पूछें'],
  'Couldn’t open WhatsApp. Message us on': ['ਵਟਸਐਪ ਨਹੀਂ ਖੁੱਲ੍ਹਿਆ। ਇਸ ਨੰਬਰ ’ਤੇ ਸੁਨੇਹਾ ਭੇਜੋ:', 'व्हाट्सएप नहीं खुला। इस नंबर पर संदेश भेजें:'],
  'Products are being added': ['ਉਤਪਾਦ ਸ਼ਾਮਲ ਕੀਤੇ ਜਾ ਰਹੇ ਹਨ', 'उत्पाद जोड़े जा रहे हैं'],
  'Out of stock': ['ਸਟਾਕ ਵਿੱਚ ਨਹੀਂ', 'स्टॉक में नहीं'],
  'Size / option': ['ਸਾਈਜ਼ / ਵਿਕਲਪ', 'साइज़ / विकल्प'],
  'Quantity': ['ਗਿਣਤੀ', 'मात्रा'],
  'Less': ['ਘੱਟ', 'कम'],
  'More': ['ਹੋਰ', 'और'],
  'Description': ['ਵੇਰਵਾ', 'विवरण'],
  'Price, delivery and payment are confirmed on WhatsApp:': ['ਕੀਮਤ, ਡਿਲੀਵਰੀ ਅਤੇ ਭੁਗਤਾਨ ਵਟਸਐਪ ’ਤੇ ਪੱਕੇ ਹੁੰਦੇ ਹਨ:', 'कीमत, डिलीवरी और भुगतान व्हाट्सएप पर तय होते हैं:'],
  'Live Kirtan': ['ਲਾਈਵ ਕੀਰਤਨ', 'लाइव कीर्तन'],
  'Tap to listen': ['ਸੁਣਨ ਲਈ ਦਬਾਓ', 'सुनने के लिए दबाएँ'],
  'Connecting…': ['ਜੁੜ ਰਿਹਾ ਹੈ…', 'जुड़ रहा है…'],
  'Playing live': ['ਲਾਈਵ ਚੱਲ ਰਿਹਾ ਹੈ', 'लाइव चल रहा है'],
  'Paused': ['ਰੋਕਿਆ ਹੋਇਆ', 'रुका हुआ'],
  'Reconnecting…': ['ਦੁਬਾਰਾ ਜੁੜ ਰਿਹਾ ਹੈ…', 'फिर से जुड़ रहा है…'],
  'Couldn’t connect. Check your internet and try again.': ['ਜੁੜ ਨਹੀਂ ਸਕਿਆ। ਇੰਟਰਨੈੱਟ ਵੇਖ ਕੇ ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ।', 'जुड़ नहीं पाया। इंटरनेट जाँचकर फिर कोशिश करें।'],
  'Normal': ['ਆਮ', 'सामान्य'],
  'Data saver': ['ਡਾਟਾ ਬਚਤ', 'डेटा बचत'],
  'Play': ['ਚਲਾਓ', 'चलाएँ'],
  'Pause': ['ਰੋਕੋ', 'रोकें'],
  'Live audio from the SGPC, Sri Amritsar': ['ਲਾਈਵ ਆਡੀਓ: ਐੱਸ.ਜੀ.ਪੀ.ਸੀ., ਸ੍ਰੀ ਅੰਮ੍ਰਿਤਸਰ', 'लाइव ऑडियो: एस.जी.पी.सी., श्री अमृतसर'],
  'Watch video': ['ਵੀਡੀਓ ਵੇਖੋ', 'वीडियो देखें'],
  'Explore this day': ['ਇਸ ਦਿਹਾੜੇ ਬਾਰੇ ਜਾਣੋ', 'इस दिन के बारे में जानें'],
  'Share': ['ਸਾਂਝਾ ਕਰੋ', 'साझा करें'],
  // Media
  'Singers': ['ਗਾਇਕ', 'गायक'],
  'Videos': ['ਵੀਡੀਓ', 'वीडियो'],
  // Gurdwaras / festivals
  'Historic Gurdwaras': ['ਇਤਿਹਾਸਕ ਗੁਰਦੁਆਰੇ', 'ऐतिहासिक गुरुद्वारे'],
  'View Details': ['ਵੇਰਵਾ ਵੇਖੋ', 'विवरण देखें'],
  'Directions': ['ਰਸਤਾ', 'रास्ता'],
  'About': ['ਬਾਰੇ', 'के बारे में'],
  'Festival Calendar': ['ਤਿਉਹਾਰ ਕੈਲੰਡਰ', 'त्योहार कैलेंडर'],
  'Significance': ['ਮਹੱਤਤਾ', 'महत्व'],
  'Search Gurdwaras, cities or countries…': ['ਗੁਰਦੁਆਰੇ, ਸ਼ਹਿਰ ਜਾਂ ਦੇਸ਼ ਖੋਜੋ…', 'गुरुद्वारे, शहर या देश खोजें…'],
  'Name, place, Guru Sahib, Langar…': ['ਨਾਂ, ਥਾਂ, ਗੁਰੂ ਸਾਹਿਬ, ਲੰਗਰ…', 'नाम, जगह, गुरु साहिब, लंगर…'],
  // Profile
  'Add your name': ['ਆਪਣਾ ਨਾਮ ਲਿਖੋ', 'अपना नाम लिखें'],
  'My Bookmarks': ['ਮੇਰੇ ਸੰਭਾਲੇ ਹੋਏ', 'मेरे सहेजे गए'],
  'Offline Gurbani': ['ਔਫ਼ਲਾਈਨ ਗੁਰਬਾਣੀ', 'ऑफ़लाइन गुरबाणी'],
  'Appearance': ['ਦਿੱਖ', 'रूप'],
  'Language': ['ਭਾਸ਼ਾ', 'भाषा'],
  'Meanings & text size': ['ਅਰਥ ਅਤੇ ਅੱਖਰਾਂ ਦਾ ਆਕਾਰ', 'अर्थ और अक्षरों का आकार'],
  'About Sikhify': ['Sikhify ਬਾਰੇ', 'Sikhify के बारे में'],
  'Share App': ['ਐਪ ਸਾਂਝੀ ਕਰੋ', 'ऐप साझा करें'],
  'Contact us': ['ਸੰਪਰਕ ਕਰੋ', 'संपर्क करें'],
  'Visit sikhify.in': ['sikhify.in ਖੋਲ੍ਹੋ', 'sikhify.in खोलें'],
  'Light': ['ਹਲਕਾ', 'लाइट'],
  'Dark': ['ਗੂੜ੍ਹਾ', 'डार्क'],
  'Phone': ['ਫ਼ੋਨ ਵਾਂਗ', 'फ़ोन जैसा'],
  'Same as phone': ['ਫ਼ੋਨ ਵਾਂਗ', 'फ़ोन जैसा'],
  'Your name': ['ਤੁਹਾਡਾ ਨਾਮ', 'आपका नाम'],
  'Save': ['ਸੰਭਾਲੋ', 'सहेजें'],
  'Cancel': ['ਰੱਦ ਕਰੋ', 'रद्द करें'],
  // Reading settings
  'Reading': ['ਪੜ੍ਹਨਾ', 'पढ़ना'],
  'Transliteration': ['ਲਿਪੀਅੰਤਰ (ਅੰਗਰੇਜ਼ੀ ਅੱਖਰ)', 'लिप्यंतरण (अंग्रेज़ी अक्षर)'],
  'Gurbani in English letters': ['ਗੁਰਬਾਣੀ ਅੰਗਰੇਜ਼ੀ ਅੱਖਰਾਂ ਵਿੱਚ', 'गुरबाणी अंग्रेज़ी अक्षरों में'],
  'Punjabi meaning': ['ਪੰਜਾਬੀ ਅਰਥ', 'पंजाबी अर्थ'],
  'Hindi meaning': ['ਹਿੰਦੀ ਅਰਥ', 'हिंदी अर्थ'],
  'English meaning': ['ਅੰਗਰੇਜ਼ੀ ਅਰਥ', 'अंग्रेज़ी अर्थ'],
  'Keep screen on while reading': ['ਪੜ੍ਹਦੇ ਸਮੇਂ ਸਕਰੀਨ ਚਾਲੂ ਰੱਖੋ', 'पढ़ते समय स्क्रीन चालू रखें'],
  // Add / Suggest / Report
  'Help improve Sikhify': ['Sikhify ਨੂੰ ਬਿਹਤਰ ਬਣਾਓ', 'Sikhify को बेहतर बनाएँ'],
  'Add what is missing, share an idea, or tell us about a mistake. The Sikhify team checks everything before it appears in the app and on sikhify.in.': ['ਜੋ ਨਹੀਂ ਹੈ ਉਹ ਜੋੜੋ, ਕੋਈ ਸੁਝਾਅ ਦਿਓ, ਜਾਂ ਕਿਸੇ ਗ਼ਲਤੀ ਬਾਰੇ ਦੱਸੋ। ਐਪ ਅਤੇ sikhify.in ’ਤੇ ਆਉਣ ਤੋਂ ਪਹਿਲਾਂ Sikhify ਟੀਮ ਸਭ ਕੁਝ ਜਾਂਚਦੀ ਹੈ।', 'जो नहीं है उसे जोड़ें, कोई सुझाव दें, या किसी गलती के बारे में बताएँ। ऐप और sikhify.in पर आने से पहले Sikhify टीम सब कुछ जाँचती है।'],
  'Add': ['ਜੋੜੋ', 'जोड़ें'],
  'Add a Gurdwara': ['ਗੁਰਦੁਆਰਾ ਜੋੜੋ', 'गुरुद्वारा जोड़ें'],
  'A Gurdwara that isn’t listed yet': ['ਉਹ ਗੁਰਦੁਆਰਾ ਜੋ ਹਾਲੇ ਸੂਚੀ ਵਿੱਚ ਨਹੀਂ ਹੈ', 'वह गुरुद्वारा जो अभी सूची में नहीं है'],
  'Add something else': ['ਕੁਝ ਹੋਰ ਜੋੜੋ', 'कुछ और जोड़ें'],
  'An event, Sikh personality, Kirtani, book, website, app or organisation': ['ਸਮਾਗਮ, ਸਿੱਖ ਸ਼ਖ਼ਸੀਅਤ, ਕੀਰਤਨੀ, ਕਿਤਾਬ, ਵੈੱਬਸਾਈਟ, ਐਪ ਜਾਂ ਸੰਸਥਾ', 'कार्यक्रम, सिख व्यक्तित्व, कीर्तनी, किताब, वेबसाइट, ऐप या संस्था'],
  'Suggest': ['ਸੁਝਾਅ', 'सुझाव'],
  'Suggest an idea': ['ਸੁਝਾਅ ਦਿਓ', 'सुझाव दें'],
  'A new feature, or something that could work better': ['ਕੋਈ ਨਵੀਂ ਸਹੂਲਤ, ਜਾਂ ਕੁਝ ਜੋ ਹੋਰ ਵਧੀਆ ਹੋ ਸਕਦਾ ਹੈ', 'कोई नई सुविधा, या कुछ जो और बेहतर हो सकता है'],
  'Report': ['ਰਿਪੋਰਟ', 'रिपोर्ट'],
  'Report a mistake': ['ਗ਼ਲਤੀ ਦੱਸੋ', 'गलती बताएँ'],
  'Wrong information, a broken link, or a problem in the app': ['ਗ਼ਲਤ ਜਾਣਕਾਰੀ, ਟੁੱਟਿਆ ਲਿੰਕ, ਜਾਂ ਐਪ ਵਿੱਚ ਕੋਈ ਮੁਸ਼ਕਲ', 'गलत जानकारी, टूटा लिंक, या ऐप में कोई समस्या'],
  'Your name and email (optional)': ['ਤੁਹਾਡਾ ਨਾਂ ਅਤੇ ਈਮੇਲ (ਲੋੜੀਂਦਾ ਨਹੀਂ)', 'आपका नाम और ईमेल (ज़रूरी नहीं)'],
  'Only so we can reply. Never shown to anyone.': ['ਸਿਰਫ਼ ਜਵਾਬ ਦੇਣ ਲਈ। ਕਿਸੇ ਨੂੰ ਨਹੀਂ ਦਿਖਾਇਆ ਜਾਂਦਾ।', 'सिर्फ़ जवाब देने के लिए। किसी को नहीं दिखाया जाता।'],
  'Email': ['ਈਮੇਲ', 'ईमेल'],
  'Sending…': ['ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ…', 'भेजा जा रहा है…'],
  'Send': ['ਭੇਜੋ', 'भेजें'],
  'Reviewed by the Sikhify team before anything is published.': ['ਕੁਝ ਵੀ ਪ੍ਰਕਾਸ਼ਿਤ ਹੋਣ ਤੋਂ ਪਹਿਲਾਂ Sikhify ਟੀਮ ਜਾਂਚਦੀ ਹੈ।', 'कुछ भी प्रकाशित होने से पहले Sikhify टीम जाँचती है।'],
  'Thank you! Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh.': ['ਧੰਨਵਾਦ! ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ।', 'धन्यवाद! वाहिगुरु जी का ख़ालसा, वाहिगुरु जी की फ़तेह।'],
  'The Sikhify team will check it soon.': ['Sikhify ਟੀਮ ਜਲਦੀ ਇਸਨੂੰ ਜਾਂਚੇਗੀ।', 'Sikhify टीम जल्द ही इसे जाँचेगी।'],
  'Reference': ['ਹਵਾਲਾ ਨੰਬਰ', 'संदर्भ संख्या'],
  'Done': ['ਠੀਕ ਹੈ', 'ठीक है'],
  'Your suggestion or feedback': ['ਤੁਹਾਡਾ ਸੁਝਾਅ ਜਾਂ ਰਾਇ', 'आपका सुझाव या राय'],
  'An idea for a new feature, something hard to use, or anything else you’d like us to know.': ['ਨਵੀਂ ਸਹੂਲਤ ਦਾ ਵਿਚਾਰ, ਕੋਈ ਔਖੀ ਚੀਜ਼, ਜਾਂ ਕੁਝ ਵੀ ਜੋ ਤੁਸੀਂ ਸਾਨੂੰ ਦੱਸਣਾ ਚਾਹੋ।', 'नई सुविधा का विचार, कोई मुश्किल चीज़, या कुछ भी जो आप हमें बताना चाहें।'],
  'Which page, Gurdwara or Bani?': ['ਕਿਹੜਾ ਪੰਨਾ, ਗੁਰਦੁਆਰਾ ਜਾਂ ਬਾਣੀ?', 'कौन सा पेज, गुरुद्वारा या बाणी?'],
  'Its name, or the sikhify.in link.': ['ਉਸਦਾ ਨਾਂ, ਜਾਂ sikhify.in ਦਾ ਲਿੰਕ।', 'उसका नाम, या sikhify.in का लिंक।'],
  'What’s wrong, and what should it say?': ['ਕੀ ਗ਼ਲਤ ਹੈ, ਅਤੇ ਸਹੀ ਕੀ ਹੋਣਾ ਚਾਹੀਦਾ ਹੈ?', 'क्या गलत है, और सही क्या होना चाहिए?'],
  'Where is the correct information from? (optional)': ['ਸਹੀ ਜਾਣਕਾਰੀ ਕਿੱਥੋਂ ਹੈ? (ਲੋੜੀਂਦਾ ਨਹੀਂ)', 'सही जानकारी कहाँ से है? (ज़रूरी नहीं)'],
  'Gurdwara name': ['ਗੁਰਦੁਆਰੇ ਦਾ ਨਾਂ', 'गुरुद्वारे का नाम'],
  'Address': ['ਪਤਾ', 'पता'],
  'Phone number': ['ਫ਼ੋਨ ਨੰਬਰ', 'फ़ोन नंबर'],
  'Website': ['ਵੈੱਬਸਾਈਟ', 'वेबसाइट'],
  'Anything else (timings, Langar, history…)': ['ਹੋਰ ਕੁਝ (ਸਮਾਂ, ਲੰਗਰ, ਇਤਿਹਾਸ…)', 'और कुछ (समय, लंगर, इतिहास…)'],
  'How do you know?': ['ਤੁਹਾਨੂੰ ਕਿਵੇਂ ਪਤਾ ਹੈ?', 'आपको कैसे पता है?'],
  'Add a phone number or a note': ['ਫ਼ੋਨ ਨੰਬਰ ਜਾਂ ਨੋਟ ਜੋੜੋ', 'फ़ोन नंबर या नोट जोड़ें'],
  'Add a number or note': ['ਨੰਬਰ ਜਾਂ ਨੋਟ ਜੋੜੋ', 'नंबर या नोट जोड़ें'],
  'Note': ['ਨੋਟ', 'नोट'],
  'Timings, Langar, parking, a correction — anything that helps visitors.': ['ਸਮਾਂ, ਲੰਗਰ, ਪਾਰਕਿੰਗ, ਕੋਈ ਸੋਧ — ਜੋ ਵੀ ਆਉਣ ਵਾਲਿਆਂ ਦੀ ਮਦਦ ਕਰੇ।', 'समय, लंगर, पार्किंग, कोई सुधार — जो भी आने वालों की मदद करे।'],
  'Where did you get this information?': ['ਇਹ ਜਾਣਕਾਰੀ ਕਿੱਥੋਂ ਮਿਲੀ?', 'यह जानकारी कहाँ से मिली?'],
  'A link to an official website or announcement, or a book with its page number.': ['ਕਿਸੇ ਅਧਿਕਾਰਤ ਵੈੱਬਸਾਈਟ ਜਾਂ ਐਲਾਨ ਦਾ ਲਿੰਕ, ਜਾਂ ਪੰਨਾ ਨੰਬਰ ਸਮੇਤ ਕਿਤਾਬ।', 'किसी आधिकारिक वेबसाइट या घोषणा का लिंक, या पेज नंबर के साथ किताब।'],
  'Note for the reviewers (optional)': ['ਜਾਂਚ ਕਰਨ ਵਾਲਿਆਂ ਲਈ ਨੋਟ (ਲੋੜੀਂਦਾ ਨਹੀਂ)', 'जाँचने वालों के लिए नोट (ज़रूरी नहीं)'],
  'Add / Suggest / Report': ['ਜੋੜੋ / ਸੁਝਾਅ / ਰਿਪੋਰਟ', 'जोड़ें / सुझाव / रिपोर्ट'],
  'I visited the Gurdwara': ['ਮੈਂ ਗੁਰਦੁਆਰੇ ਗਿਆ/ਗਈ ਸੀ', 'मैं गुरुद्वारे गया/गई था'],
  'Gurdwara committee': ['ਗੁਰਦੁਆਰਾ ਕਮੇਟੀ', 'गुरुद्वारा कमेटी'],
  'Notice board at the Gurdwara': ['ਗੁਰਦੁਆਰੇ ਦਾ ਨੋਟਿਸ ਬੋਰਡ', 'गुरुद्वारे का नोटिस बोर्ड'],
  'Their website / social media': ['ਉਨ੍ਹਾਂ ਦੀ ਵੈੱਬਸਾਈਟ / ਸੋਸ਼ਲ ਮੀਡੀਆ', 'उनकी वेबसाइट / सोशल मीडिया'],
  'An event': ['ਸਮਾਗਮ', 'कार्यक्रम'],
  'A Sikh personality': ['ਸਿੱਖ ਸ਼ਖ਼ਸੀਅਤ', 'सिख व्यक्तित्व'],
  'A Kirtani / Jatha / Katha Vachak': ['ਕੀਰਤਨੀ / ਜਥਾ / ਕਥਾ ਵਾਚਕ', 'कीर्तनी / जत्था / कथा वाचक'],
  'A book or research resource': ['ਕਿਤਾਬ ਜਾਂ ਖੋਜ ਸਮੱਗਰੀ', 'किताब या शोध सामग्री'],
  'A Sikh website': ['ਸਿੱਖ ਵੈੱਬਸਾਈਟ', 'सिख वेबसाइट'],
  'A Sikh app': ['ਸਿੱਖ ਐਪ', 'सिख ऐप'],
  'An organisation': ['ਸੰਸਥਾ', 'संस्था'],
  // Gurdwara details
  'Facilities and services': ['ਸਹੂਲਤਾਂ ਅਤੇ ਸੇਵਾਵਾਂ', 'सुविधाएँ और सेवाएँ'],
  'Photos': ['ਤਸਵੀਰਾਂ', 'तस्वीरें'],
  'Know more about this Gurdwara?': ['ਇਸ ਗੁਰਦੁਆਰੇ ਬਾਰੇ ਹੋਰ ਜਾਣਦੇ ਹੋ?', 'इस गुरुद्वारे के बारे में और जानते हैं?'],
  'Add a phone number, timings or a note, or tell us if something is wrong.': ['ਫ਼ੋਨ ਨੰਬਰ, ਸਮਾਂ ਜਾਂ ਨੋਟ ਜੋੜੋ, ਜਾਂ ਦੱਸੋ ਜੇ ਕੁਝ ਗ਼ਲਤ ਹੈ।', 'फ़ोन नंबर, समय या नोट जोड़ें, या बताएँ अगर कुछ गलत है।'],
  'Add number or note': ['ਨੰਬਰ ਜਾਂ ਨੋਟ ਜੋੜੋ', 'नंबर या नोट जोड़ें'],
  'Gurdwaras nearby': ['ਨੇੜਲੇ ਗੁਰਦੁਆਰੇ', 'आस-पास के गुरुद्वारे'],
  'Sources': ['ਸਰੋਤ', 'स्रोत'],
  'Official name': ['ਅਧਿਕਾਰਤ ਨਾਂ', 'आधिकारिक नाम'],
  'Established': ['ਸਥਾਪਨਾ', 'स्थापना'],
  'Managed by': ['ਪ੍ਰਬੰਧਕ', 'प्रबंधक'],
  'Opening hours': ['ਖੁੱਲ੍ਹਣ ਦਾ ਸਮਾਂ', 'खुलने का समय'],
  'Programmes': ['ਪ੍ਰੋਗਰਾਮ', 'कार्यक्रम'],
  'District': ['ਜ਼ਿਲ੍ਹਾ', 'ज़िला'],
  'Version': ['ਵਰਜਨ', 'वर्ज़न'],
  // Daily Quiz
  'Daily Quiz': ['ਰੋਜ਼ਾਨਾ ਕੁਇਜ਼', 'रोज़ाना क्विज़'],
  '5 new questions every day — on the Gurus, Sikh history, Gurbani and Sikh life.': ['ਹਰ ਰੋਜ਼ 5 ਨਵੇਂ ਸਵਾਲ — ਗੁਰੂ ਸਾਹਿਬਾਨ, ਸਿੱਖ ਇਤਿਹਾਸ, ਗੁਰਬਾਣੀ ਅਤੇ ਸਿੱਖ ਜੀਵਨ ਬਾਰੇ।', 'हर रोज़ 5 नए सवाल — गुरु साहिबान, सिख इतिहास, गुरबाणी और सिख जीवन पर।'],
  'Question': ['ਸਵਾਲ', 'सवाल'],
  'Shabaash! That’s right.': ['ਸ਼ਾਬਾਸ਼! ਬਿਲਕੁਲ ਸਹੀ।', 'शाबाश! बिल्कुल सही।'],
  'Good try! The answer is': ['ਵਧੀਆ ਕੋਸ਼ਿਸ਼! ਸਹੀ ਜਵਾਬ ਹੈ', 'अच्छी कोशिश! सही जवाब है'],
  'Next question': ['ਅਗਲਾ ਸਵਾਲ', 'अगला सवाल'],
  'See my score': ['ਮੇਰੇ ਅੰਕ ਵੇਖੋ', 'मेरे अंक देखें'],
  'Perfect! Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!': ['ਸ਼ਾਨਦਾਰ! ਵਾਹਿਗੁਰੂ ਜੀ ਕਾ ਖ਼ਾਲਸਾ, ਵਾਹਿਗੁਰੂ ਜੀ ਕੀ ਫ਼ਤਹਿ!', 'शानदार! वाहिगुरु जी का ख़ालसा, वाहिगुरु जी की फ़तेह!'],
  'Very good! Keep learning.': ['ਬਹੁਤ ਵਧੀਆ! ਸਿੱਖਦੇ ਰਹੋ।', 'बहुत बढ़िया! सीखते रहें।'],
  'Good effort — you’ll know these next time.': ['ਵਧੀਆ ਕੋਸ਼ਿਸ਼ — ਅਗਲੀ ਵਾਰ ਤੁਹਾਨੂੰ ਇਹ ਪਤਾ ਹੋਣਗੇ।', 'अच्छी कोशिश — अगली बार आपको ये पता होंगे।'],
  'Streak': ['ਲਗਾਤਾਰ', 'लगातार'],
  'day': ['ਦਿਨ', 'दिन'],
  'days': ['ਦਿਨ', 'दिन'],
  'Come back tomorrow for 5 new questions.': ['ਕੱਲ੍ਹ 5 ਨਵੇਂ ਸਵਾਲਾਂ ਲਈ ਫਿਰ ਆਓ।', 'कल 5 नए सवालों के लिए फिर आएँ।'],
  'Remind me every day': ['ਮੈਨੂੰ ਹਰ ਰੋਜ਼ ਯਾਦ ਦਿਵਾਓ', 'मुझे हर रोज़ याद दिलाएँ'],
  'A notification when the new questions are ready': ['ਨਵੇਂ ਸਵਾਲ ਤਿਆਰ ਹੋਣ ’ਤੇ ਸੂਚਨਾ', 'नए सवाल तैयार होने पर सूचना'],
  'Allow notifications for Sikhify in your phone settings.': ['ਫ਼ੋਨ ਦੀ ਸੈਟਿੰਗ ਵਿੱਚ Sikhify ਲਈ ਸੂਚਨਾਵਾਂ ਚਾਲੂ ਕਰੋ।', 'फ़ोन की सेटिंग में Sikhify के लिए सूचनाएँ चालू करें।'],
  '5 new questions are waiting': ['5 ਨਵੇਂ ਸਵਾਲ ਉਡੀਕ ਰਹੇ ਹਨ', '5 नए सवाल इंतज़ार कर रहे हैं'],
  'answered': ['ਜਵਾਬ ਦਿੱਤੇ', 'जवाब दिए'],
  'You got': ['ਤੁਹਾਡੇ ਅੰਕ', 'आपके अंक'],
  'Who was the {n} Guru?': ['{n} ਗੁਰੂ ਕੌਣ ਸਨ?', '{n} गुरु कौन थे?'],
  'When did {name} live?': ['{name} ਕਦੋਂ ਹੋਏ?', '{name} कब हुए?'],
  'Which Guru was born at {place}?': ['ਕਿਹੜੇ ਗੁਰੂ ਸਾਹਿਬ ਦਾ ਪ੍ਰਕਾਸ਼ {place} ਵਿਖੇ ਹੋਇਆ?', 'किस गुरु साहिब का प्रकाश {place} में हुआ?'],
  'In which year did this happen?': ['ਇਹ ਕਿਸ ਸਾਲ ਹੋਇਆ?', 'यह किस साल हुआ?'],
  'Where did this happen?': ['ਇਹ ਕਿੱਥੇ ਹੋਇਆ?', 'यह कहाँ हुआ?'],
  'Who is this?': ['ਇਹ ਕੌਣ ਹਨ?', 'ये कौन हैं?'],
  'Which word means this?': ['ਇਸਦਾ ਅਰਥ ਕਿਹੜਾ ਸ਼ਬਦ ਹੈ?', 'इसका अर्थ कौन सा शब्द है?'],
  'Who wrote {bani}?': ['{bani} ਕਿਸ ਦੀ ਬਾਣੀ ਹੈ?', '{bani} किसकी बाणी है?'],
  'When is {bani} read in Nitnem?': ['ਨਿਤਨੇਮ ਵਿੱਚ {bani} ਕਦੋਂ ਪੜ੍ਹੀ ਜਾਂਦੀ ਹੈ?', 'नितनेम में {bani} कब पढ़ी जाती है?'],
  'In the morning (Amrit Vela)': ['ਸਵੇਰੇ (ਅੰਮ੍ਰਿਤ ਵੇਲਾ)', 'सुबह (अमृत वेला)'],
  'In the evening': ['ਸ਼ਾਮ ਨੂੰ', 'शाम को'],
  'At night, before sleep': ['ਰਾਤ ਨੂੰ, ਸੌਣ ਤੋਂ ਪਹਿਲਾਂ', 'रात को, सोने से पहले'],
  'first': ['ਪਹਿਲੇ', 'पहले'],
  'second': ['ਦੂਜੇ', 'दूसरे'],
  'third': ['ਤੀਜੇ', 'तीसरे'],
  'fourth': ['ਚੌਥੇ', 'चौथे'],
  'fifth': ['ਪੰਜਵੇਂ', 'पाँचवें'],
  'sixth': ['ਛੇਵੇਂ', 'छठे'],
  'seventh': ['ਸੱਤਵੇਂ', 'सातवें'],
  'eighth': ['ਅੱਠਵੇਂ', 'आठवें'],
  'ninth': ['ਨੌਵੇਂ', 'नौवें'],
  'tenth': ['ਦਸਵੇਂ', 'दसवें'],
  'Who was the first Sikh Guru?': ['ਸਿੱਖਾਂ ਦੇ ਪਹਿਲੇ ਗੁਰੂ ਕੌਣ ਸਨ?', 'सिखों के पहले गुरु कौन थे?'],
  'How many Gurus were there in human form?': ['ਦੇਹ ਰੂਪ ਵਿੱਚ ਕਿੰਨੇ ਗੁਰੂ ਸਾਹਿਬਾਨ ਹੋਏ?', 'देह रूप में कितने गुरु साहिबान हुए?'],
  'Who is the Guru of the Sikhs today?': ['ਅੱਜ ਸਿੱਖਾਂ ਦੇ ਗੁਰੂ ਕੌਣ ਹਨ?', 'आज सिखों के गुरु कौन हैं?'],
  'Which Guru created the Khalsa on Vaisakhi in 1699?': ['1699 ਦੀ ਵਿਸਾਖੀ ਨੂੰ ਖ਼ਾਲਸਾ ਕਿਸ ਗੁਰੂ ਸਾਹਿਬ ਨੇ ਸਾਜਿਆ?', '1699 की वैसाखी को ख़ालसा किस गुरु साहिब ने सजाया?'],
  'In which city is Sri Harmandir Sahib (the Golden Temple)?': ['ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਕਿਸ ਸ਼ਹਿਰ ਵਿੱਚ ਹੈ?', 'श्री हरिमंदर साहिब किस शहर में है?'],
  'What is the free community kitchen at a Gurdwara called?': ['ਗੁਰਦੁਆਰੇ ਦੀ ਮੁਫ਼ਤ ਸਾਂਝੀ ਰਸੋਈ ਨੂੰ ਕੀ ਕਹਿੰਦੇ ਹਨ?', 'गुरुद्वारे की मुफ़्त साझी रसोई को क्या कहते हैं?'],
  'Which of these is one of the Five Ks?': ['ਇਹਨਾਂ ਵਿੱਚੋਂ ਪੰਜ ਕਕਾਰਾਂ ਵਿੱਚੋਂ ਇੱਕ ਕਿਹੜਾ ਹੈ?', 'इनमें से पाँच ककारों में से एक कौन सा है?'],
  'What does “Vand Chhakna” mean?': ['“ਵੰਡ ਛਕਣਾ” ਦਾ ਕੀ ਅਰਥ ਹੈ?', '“वंड छकणा” का क्या अर्थ है?'],
  'Guru Nanak Dev Ji': ['ਗੁਰੂ ਨਾਨਕ ਦੇਵ ਜੀ', 'गुरु नानक देव जी'],
  'Guru Gobind Singh Ji': ['ਗੁਰੂ ਗੋਬਿੰਦ ਸਿੰਘ ਜੀ', 'गुरु गोबिंद सिंह जी'],
  'Guru Arjan Dev Ji': ['ਗੁਰੂ ਅਰਜਨ ਦੇਵ ਜੀ', 'गुरु अर्जन देव जी'],
  'Five': ['ਪੰਜ', 'पाँच'],
  'Ten': ['ਦਸ', 'दस'],
  'Twelve': ['ਬਾਰਾਂ', 'बारह'],
  'Guru Har Krishan Ji': ['ਗੁਰੂ ਹਰਿਕ੍ਰਿਸ਼ਨ ਜੀ', 'गुरु हरकृष्ण जी'],
  'Sri Guru Granth Sahib Ji': ['ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ', 'श्री गुरु ग्रंथ साहिब जी'],
  'Guru Tegh Bahadur Ji': ['ਗੁਰੂ ਤੇਗ਼ ਬਹਾਦਰ ਜੀ', 'गुरु तेग बहादुर जी'],
  'Guru Ram Das Ji': ['ਗੁਰੂ ਰਾਮਦਾਸ ਜੀ', 'गुरु रामदास जी'],
  'Guru Angad Dev Ji': ['ਗੁਰੂ ਅੰਗਦ ਦੇਵ ਜੀ', 'गुरु अंगद देव जी'],
  'Amritsar': ['ਅੰਮ੍ਰਿਤਸਰ', 'अमृतसर'],
  'Delhi': ['ਦਿੱਲੀ', 'दिल्ली'],
  'Patna': ['ਪਟਨਾ', 'पटना'],
  'Sangat': ['ਸੰਗਤ', 'संगत'],
  'Langar': ['ਲੰਗਰ', 'लंगर'],
  'Kirtan': ['ਕੀਰਤਨ', 'कीर्तन'],
  'Kara': ['ਕੜਾ', 'कड़ा'],
  'Kitab': ['ਕਿਤਾਬ', 'किताब'],
  'Kursi': ['ਕੁਰਸੀ', 'कुर्सी'],
  'Sleeping early': ['ਜਲਦੀ ਸੌਣਾ', 'जल्दी सोना'],
  'Sharing with others': ['ਦੂਜਿਆਂ ਨਾਲ ਵੰਡਣਾ', 'दूसरों के साथ बाँटना'],
  'Singing loudly': ['ਉੱਚੀ ਗਾਉਣਾ', 'ज़ोर से गाना'],
  // Sharing Gurbani
  'Share this line': ['ਇਹ ਪੰਗਤੀ ਸਾਂਝੀ ਕਰੋ', 'यह पंक्ति साझा करें'],
  'Share in which language?': ['ਕਿਸ ਭਾਸ਼ਾ ਵਿੱਚ ਸਾਂਝਾ ਕਰੀਏ?', 'किस भाषा में साझा करें?'],
  'Gurmukhi with the Punjabi meaning': ['ਗੁਰਮੁਖੀ, ਪੰਜਾਬੀ ਅਰਥ ਸਮੇਤ', 'गुरमुखी, पंजाबी अर्थ के साथ'],
  'Gurbani in Hindi letters, with the Hindi meaning': ['ਗੁਰਬਾਣੀ ਹਿੰਦੀ ਅੱਖਰਾਂ ਵਿੱਚ, ਹਿੰਦੀ ਅਰਥ ਸਮੇਤ', 'गुरबाणी हिंदी अक्षरों में, हिंदी अर्थ के साथ'],
  'Gurmukhi, how to say it, and the English meaning': ['ਗੁਰਮੁਖੀ, ਉਚਾਰਨ ਅਤੇ ਅੰਗਰੇਜ਼ੀ ਅਰਥ', 'गुरमुखी, उच्चारण और अंग्रेज़ी अर्थ'],
  'Gurmukhi only': ['ਸਿਰਫ਼ ਗੁਰਮੁਖੀ', 'सिर्फ़ गुरमुखी'],
  'Just the Gurbani': ['ਸਿਰਫ਼ ਗੁਰਬਾਣੀ', 'सिर्फ़ गुरबाणी'],
  'Amrit Vela: time for Japji Sahib and the morning Banis.': ['ਅੰਮ੍ਰਿਤ ਵੇਲਾ: ਜਪੁਜੀ ਸਾਹਿਬ ਅਤੇ ਸਵੇਰ ਦੀਆਂ ਬਾਣੀਆਂ ਦਾ ਸਮਾਂ।', 'अमृत वेला: जपुजी साहिब और सुबह की बाणियों का समय।'],
  'Read and listen to today’s Hukamnama from Sri Harmandir Sahib.': ['ਸ੍ਰੀ ਹਰਿਮੰਦਰ ਸਾਹਿਬ ਤੋਂ ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ ਪੜ੍ਹੋ ਅਤੇ ਸੁਣੋ।', 'श्री हरिमंदर साहिब से आज का हुकमनामा पढ़ें और सुनें।'],
  'Evening Nitnem: time for Rehras Sahib.': ['ਸ਼ਾਮ ਦਾ ਨਿਤਨੇਮ: ਰਹਰਾਸਿ ਸਾਹਿਬ ਦਾ ਸਮਾਂ।', 'शाम का नितनेम: रहरास साहिब का समय।'],
  'Before sleep: Sohila Sahib.': ['ਸੌਣ ਤੋਂ ਪਹਿਲਾਂ: ਸੋਹਿਲਾ ਸਾਹਿਬ।', 'सोने से पहले: सोहिला साहिब।'],
  '5 new questions are ready. Can you get them all right?': ['5 ਨਵੇਂ ਸਵਾਲ ਤਿਆਰ ਹਨ। ਕੀ ਤੁਸੀਂ ਸਾਰੇ ਸਹੀ ਕਰ ਸਕਦੇ ਹੋ?', '5 नए सवाल तैयार हैं। क्या आप सभी सही कर सकते हैं?'],
  'Gurbani in': ['ਗੁਰਬਾਣੀ ਕਿਸ ਲਿਪੀ ਵਿੱਚ', 'गुरबाणी किस लिपि में'],
  'Read in Hindi only (Gurbani + Hindi meaning)': ['ਸਿਰਫ਼ ਹਿੰਦੀ ਵਿੱਚ ਪੜ੍ਹੋ (ਗੁਰਬਾਣੀ + ਹਿੰਦੀ ਅਰਥ)', 'सिर्फ़ हिंदी में पढ़ें (गुरबाणी + हिंदी अर्थ)'],
  'Not yet available for Jaap Sahib, Tav-Prasad Savaiye and Benti Chaupai': ['ਜਾਪੁ ਸਾਹਿਬ, ਤ੍ਵ ਪ੍ਰਸਾਦਿ ਸਵੱਯੇ ਅਤੇ ਬੇਨਤੀ ਚੌਪਈ ਲਈ ਹਾਲੇ ਉਪਲਬਧ ਨਹੀਂ', 'जापु साहिब, त्व प्रसादि सवैये और बेनती चौपई के लिए अभी उपलब्ध नहीं'],
  'Ask a friend': ['ਦੋਸਤ ਨੂੰ ਪੁੱਛੋ', 'दोस्त से पूछें'],
  'Share my score': ['ਆਪਣੇ ਅੰਕ ਸਾਂਝੇ ਕਰੋ', 'अपने अंक साझा करें'],
  'Sikhify Daily Quiz': ['Sikhify ਰੋਜ਼ਾਨਾ ਕੁਇਜ਼', 'Sikhify रोज़ाना क्विज़'],
  'Can you answer today’s questions?': ['ਕੀ ਤੁਸੀਂ ਅੱਜ ਦੇ ਸਵਾਲਾਂ ਦੇ ਜਵਾਬ ਦੇ ਸਕਦੇ ਹੋ?', 'क्या आप आज के सवालों के जवाब दे सकते हैं?'],
  'Play in the Sikhify app': ['Sikhify ਐਪ ਵਿੱਚ ਖੇਡੋ', 'Sikhify ऐप में खेलें'],
  'Can you answer this?': ['ਕੀ ਤੁਸੀਂ ਇਸਦਾ ਜਵਾਬ ਦੇ ਸਕਦੇ ਹੋ?', 'क्या आप इसका जवाब दे सकते हैं?'],
  'Play these questions in the Sikhify app': ['ਇਹ ਸਵਾਲ Sikhify ਐਪ ਵਿੱਚ ਖੇਡੋ', 'ये सवाल Sikhify ऐप में खेलें'],
  'Answer it in the Sikhify app': ['Sikhify ਐਪ ਵਿੱਚ ਜਵਾਬ ਦਿਓ', 'Sikhify ऐप में जवाब दें'],
  'Quiz from a friend': ['ਦੋਸਤ ਵੱਲੋਂ ਕੁਇਜ਼', 'दोस्त की ओर से क्विज़'],
  'Your friend got': ['ਤੁਹਾਡੇ ਦੋਸਤ ਦੇ ਅੰਕ', 'आपके दोस्त के अंक'],
  'Can you beat them?': ['ਕੀ ਤੁਸੀਂ ਉਨ੍ਹਾਂ ਤੋਂ ਵੱਧ ਲੈ ਸਕਦੇ ਹੋ?', 'क्या आप उनसे ज़्यादा ला सकते हैं?'],
  'A friend sent you this question. Can you answer it?': ['ਦੋਸਤ ਨੇ ਤੁਹਾਨੂੰ ਇਹ ਸਵਾਲ ਭੇਜਿਆ ਹੈ। ਕੀ ਤੁਸੀਂ ਜਵਾਬ ਦੇ ਸਕਦੇ ਹੋ?', 'दोस्त ने आपको यह सवाल भेजा है। क्या आप जवाब दे सकते हैं?'],
  'You beat your friend!': ['ਤੁਸੀਂ ਆਪਣੇ ਦੋਸਤ ਤੋਂ ਅੱਗੇ ਨਿਕਲ ਗਏ!', 'आप अपने दोस्त से आगे निकल गए!'],
  'A tie with your friend!': ['ਦੋਸਤ ਨਾਲ ਬਰਾਬਰ!', 'दोस्त के साथ बराबरी!'],
  'Your friend wins this time.': ['ਇਸ ਵਾਰ ਤੁਹਾਡਾ ਦੋਸਤ ਜਿੱਤਿਆ।', 'इस बार आपका दोस्त जीता।'],
  'Play today’s Daily Quiz': ['ਅੱਜ ਦਾ ਰੋਜ਼ਾਨਾ ਕੁਇਜ਼ ਖੇਡੋ', 'आज का रोज़ाना क्विज़ खेलें'],
  // Common
  'Try again': ['ਦੁਬਾਰਾ ਕੋਸ਼ਿਸ਼ ਕਰੋ', 'फिर से कोशिश करें'],
  'Show more': ['ਹੋਰ ਵੇਖੋ', 'और देखें'],
  // Months (dates)
  'January': ['ਜਨਵਰੀ', 'जनवरी'],
  'February': ['ਫ਼ਰਵਰੀ', 'फ़रवरी'],
  'March': ['ਮਾਰਚ', 'मार्च'],
  'April': ['ਅਪ੍ਰੈਲ', 'अप्रैल'],
  'May': ['ਮਈ', 'मई'],
  'June': ['ਜੂਨ', 'जून'],
  'July': ['ਜੁਲਾਈ', 'जुलाई'],
  'August': ['ਅਗਸਤ', 'अगस्त'],
  'September': ['ਸਤੰਬਰ', 'सितंबर'],
  'October': ['ਅਕਤੂਬਰ', 'अक्टूबर'],
  'November': ['ਨਵੰਬਰ', 'नवंबर'],
  'December': ['ਦਸੰਬਰ', 'दिसंबर'],
  'Loading…': ['ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ…', 'लोड हो रहा है…'],
  'This video can only be played on YouTube.': ['ਇਹ ਵੀਡੀਓ ਸਿਰਫ਼ YouTube ’ਤੇ ਚੱਲ ਸਕਦੀ ਹੈ।', 'यह वीडियो सिर्फ़ YouTube पर चल सकता है।'],
  'This video is no longer on YouTube.': ['ਇਹ ਵੀਡੀਓ ਹੁਣ YouTube ’ਤੇ ਨਹੀਂ ਹੈ।', 'यह वीडियो अब YouTube पर नहीं है।'],
  'This video could not be played here.': ['ਇਹ ਵੀਡੀਓ ਇੱਥੇ ਨਹੀਂ ਚੱਲ ਸਕੀ।', 'यह वीडियो यहाँ नहीं चल सका।'],
  'Watch on YouTube': ['YouTube ’ਤੇ ਵੇਖੋ', 'YouTube पर देखें'],
  'Play on YouTube': ['YouTube ’ਤੇ ਚਲਾਓ', 'YouTube पर चलाएँ'],
  'Page': ['ਪੰਨਾ', 'पृष्ठ'],
  'Previous page': ['ਪਿਛਲਾ ਪੰਨਾ', 'पिछला पृष्ठ'],
  'Next page': ['ਅਗਲਾ ਪੰਨਾ', 'अगला पृष्ठ'],
  'Page view': ['ਪੰਨੇ ਵਾਂਗ ਪੜ੍ਹੋ', 'पृष्ठ की तरह पढ़ें'],
  'Scroll view': ['ਸਕ੍ਰੋਲ ਕਰਕੇ ਪੜ੍ਹੋ', 'स्क्रॉल करके पढ़ें'],
  'Verified listing': ['ਪ੍ਰਮਾਣਿਤ ਜਾਣਕਾਰੀ', 'सत्यापित जानकारी'],
  'Country': ['ਦੇਸ਼', 'देश'],
  'State': ['ਸੂਬਾ', 'राज्य'],
  'City': ['ਸ਼ਹਿਰ', 'शहर'],
  'Reset': ['ਰੀਸੈੱਟ', 'रीसेट'],
  'Clear': ['ਮਿਟਾਓ', 'साफ़ करें'],
  'result': ['ਨਤੀਜਾ', 'परिणाम'],
  'results': ['ਨਤੀਜੇ', 'परिणाम'],
  'No Gurdwaras found. Try a city or another spelling.': ['ਕੋਈ ਗੁਰਦੁਆਰਾ ਨਹੀਂ ਮਿਲਿਆ। ਕੋਈ ਸ਼ਹਿਰ ਜਾਂ ਹੋਰ ਸ਼ਬਦ-ਜੋੜ ਅਜ਼ਮਾਓ।', 'कोई गुरुद्वारा नहीं मिला। कोई शहर या दूसरी स्पेलिंग आज़माएँ।'],
  'Open on sikhify.in': ['sikhify.in ’ਤੇ ਖੋਲ੍ਹੋ', 'sikhify.in पर खोलें'],
  'Nothing here yet.': ['ਹਾਲੇ ਕੁਝ ਨਹੀਂ।', 'अभी कुछ नहीं।'],
  'Timeline': ['ਸਮਾਂ-ਰੇਖਾ', 'समयरेखा'],
  'People': ['ਸ਼ਖ਼ਸੀਅਤਾਂ', 'व्यक्तित्व'],
  'Sikh Empire': ['ਸਿੱਖ ਰਾਜ', 'सिख राज'],
  'Official text (SGPC)': ['ਅਧਿਕਾਰਤ ਪਾਠ (SGPC)', 'आधिकारिक पाठ (SGPC)'],
  'Search questions': ['ਸਵਾਲ ਖੋਜੋ', 'प्रश्न खोजें'],
  'Biography': ['ਜੀਵਨੀ', 'जीवनी'],
  'Contributions': ['ਯੋਗਦਾਨ', 'योगदान'],
  'Teachings': ['ਸਿੱਖਿਆਵਾਂ', 'शिक्षाएँ'],
  'Life events': ['ਜੀਵਨ ਦੀਆਂ ਘਟਨਾਵਾਂ', 'जीवन की घटनाएँ'],
  'Quiz': ['ਕੁਇਜ਼', 'प्रश्नोत्तरी'],
  'Gurmukhi letters': ['ਗੁਰਮੁਖੀ ਅੱਖਰ', 'गुरमुखी अक्षर'],
  'The three golden rules': ['ਤਿੰਨ ਸੁਨਹਿਰੀ ਨਿਯਮ', 'तीन सुनहरे नियम'],
  'The Five Ks': ['ਪੰਜ ਕਕਾਰ', 'पाँच ककार'],
  'Stories & videos': ['ਕਹਾਣੀਆਂ ਅਤੇ ਵੀਡੀਓ', 'कहानियाँ और वीडियो'],
  'Play again': ['ਫਿਰ ਖੇਡੋ', 'फिर खेलें'],
  'Submit / update information': ['ਜਾਣਕਾਰੀ ਭੇਜੋ / ਸੁਧਾਰੋ', 'जानकारी भेजें / सुधारें'],
  'Community': ['ਸੰਗਤ', 'संगत'],
  'Privacy policy': ['ਨਿੱਜਤਾ ਨੀਤੀ', 'गोपनीयता नीति'],
  'Image credits': ['ਤਸਵੀਰਾਂ ਦਾ ਸਿਹਰਾ', 'चित्रों का श्रेय'],
  // Learn topics and Nitnem times
  'Basics': ['ਮੁੱਢਲੀ ਜਾਣਕਾਰੀ', 'मूल बातें'],
  'Gurus': ['ਗੁਰੂ ਸਾਹਿਬਾਨ', 'गुरु साहिबान'],
  'Concepts': ['ਸੰਕਲਪ', 'सिद्धांत'],
  'Practices': ['ਅਭਿਆਸ', 'अभ्यास'],
  'Five Ks': ['ਪੰਜ ਕਕਾਰ', 'पाँच ककार'],
  'Amrit Vela': ['ਅੰਮ੍ਰਿਤ ਵੇਲਾ', 'अमृत वेला'],
  'At sunset': ['ਸੂਰਜ ਡੁੱਬਣ ਵੇਲੇ', 'सूर्यास्त पर'],
  'Before sleep': ['ਸੌਣ ਤੋਂ ਪਹਿਲਾਂ', 'सोने से पहले'],
  // History and FAQ categories
  'Guru Period': ['ਗੁਰੂ ਕਾਲ', 'गुरु काल'],
  'Martyrdom': ['ਸ਼ਹੀਦੀਆਂ', 'शहादत'],
  'Modern Sikh History': ['ਆਧੁਨਿਕ ਸਿੱਖ ਇਤਿਹਾਸ', 'आधुनिक सिख इतिहास'],
  'Gurdwara': ['ਗੁਰਦੁਆਰਾ', 'गुरुद्वारा'],
  'History': ['ਇਤਿਹਾਸ', 'इतिहास'],
  'Sikh ceremonies': ['ਸਿੱਖ ਸੰਸਕਾਰ', 'सिख संस्कार'],
  'General questions': ['ਆਮ ਸਵਾਲ', 'सामान्य प्रश्न'],
  // Kids
  'Learn Sikhi': ['ਸਿੱਖੀ ਸਿੱਖੋ', 'सिखी सीखें'],
  'Tap a Guru to read their story.': ['ਗੁਰੂ ਸਾਹਿਬ ਦੀ ਸਾਖੀ ਪੜ੍ਹਨ ਲਈ ਦਬਾਓ।', 'गुरु साहिब की कथा पढ़ने के लिए दबाएँ।'],
  'Tap a letter to see its name.': ['ਅੱਖਰ ਦਾ ਨਾਮ ਵੇਖਣ ਲਈ ਦਬਾਓ।', 'अक्षर का नाम देखने के लिए दबाएँ।'],
  // Share
  'Share the app (APK file)': ['ਐਪ ਭੇਜੋ (APK ਫ਼ਾਈਲ)', 'ऐप भेजें (APK फ़ाइल)'],
  'Send Sikhify on WhatsApp, Bluetooth or Nearby Share — they can install it directly.': ['Sikhify ਨੂੰ WhatsApp, Bluetooth ਜਾਂ Nearby Share ਨਾਲ ਭੇਜੋ — ਉਹ ਸਿੱਧਾ ਇੰਸਟਾਲ ਕਰ ਸਕਦੇ ਹਨ।', 'Sikhify को WhatsApp, Bluetooth या Nearby Share से भेजें — वे सीधे इंस्टॉल कर सकते हैं।'],
  'Share the website link': ['ਵੈੱਬਸਾਈਟ ਦਾ ਲਿੰਕ ਭੇਜੋ', 'वेबसाइट का लिंक भेजें'],
  'The app file can’t be shared from this phone; sharing the link instead.': ['ਇਸ ਫ਼ੋਨ ਤੋਂ ਐਪ ਫ਼ਾਈਲ ਨਹੀਂ ਭੇਜੀ ਜਾ ਸਕਦੀ; ਲਿੰਕ ਭੇਜ ਰਹੇ ਹਾਂ।', 'इस फ़ोन से ऐप फ़ाइल नहीं भेजी जा सकती; लिंक भेज रहे हैं।'],
  // Reminders
  'A gentle notification each day. Tap the time to change it.': ['ਹਰ ਰੋਜ਼ ਇੱਕ ਯਾਦ-ਦਹਾਨੀ। ਸਮਾਂ ਬਦਲਣ ਲਈ ਉਸ ’ਤੇ ਦਬਾਓ।', 'हर दिन एक रिमाइंडर। समय बदलने के लिए उस पर दबाएँ।'],
  'Morning Nitnem': ['ਸਵੇਰ ਦਾ ਨਿਤਨੇਮ', 'सुबह का नितनेम'],
  'Today’s Hukamnama': ['ਅੱਜ ਦਾ ਹੁਕਮਨਾਮਾ', 'आज का हुकमनामा'],
  'Rehras Sahib': ['ਰਹਰਾਸਿ ਸਾਹਿਬ', 'रहरास साहिब'],
  'Sohila Sahib': ['ਸੋਹਿਲਾ ਸਾਹਿਬ', 'सोहिला साहिब'],
  'Off': ['ਬੰਦ', 'बंद'],
  'Every day at': ['ਹਰ ਰੋਜ਼', 'हर दिन'],
};
