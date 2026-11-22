import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import '../models.dart';

/// Thrown when Gurbani can't be loaded; `message` is shown to the reader.
class LoadError implements Exception {
  const LoadError(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Live Gurbani from BaniDB (https://www.banidb.com) and the Sikhify website.
/// Banis, Angs and Shabads that were opened once are kept on the phone, so they open offline later.
class BaniDb {
  BaniDb._();
  static final BaniDb instance = BaniDb._();

  static const _api = 'https://api.banidb.com/v2';
  static const _site = 'https://www.sikhify.in';
  final _client = http.Client();

  Future<Map<String, dynamic>> _get(String url, {String? cacheKey, Duration timeout = const Duration(seconds: 20)}) async {
    File? file;
    if (cacheKey != null) {
      try {
        final dir = await getApplicationSupportDirectory();
        file = File('${dir.path}/gurbani_cache/$cacheKey.json');
      } catch (_) {
        file = null; // No storage: load without keeping a copy.
      }
    }
    try {
      final res = await _client.get(Uri.parse(url), headers: {'Accept': 'application/json'}).timeout(timeout);
      if (res.statusCode != 200) throw LoadError('Gurbani couldn’t be loaded (error ${res.statusCode}).');
      final body = utf8.decode(res.bodyBytes);
      final json = jsonDecode(body) as Map<String, dynamic>;
      if (file != null) {
        await file.parent.create(recursive: true);
        await file.writeAsString(body);
      }
      return json;
    } on LoadError {
      rethrow;
    } catch (_) {
      if (file != null && await file.exists()) {
        return jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      }
      throw const LoadError('No internet connection. Connect and try again — once opened, it will also work offline.');
    }
  }

  /// A whole Bani (for Banis that aren't bundled, e.g. Sukhmani Sahib).
  Future<List<GurbaniLine>> bani(int baniDbId) async {
    final j = await _get('$_api/banis/$baniDbId', cacheKey: 'bani_$baniDbId', timeout: const Duration(seconds: 60));
    return (j['verses'] as List).map((raw) {
      final v = (raw as Map).cast<String, dynamic>();
      final verse = (v['verse'] as Map).cast<String, dynamic>();
      return GurbaniLine.fromBaniDb(verse, paragraph: v['paragraph'] as int?, header: (v['header'] ?? 0) != 0);
    }).toList();
  }

  /// One Ang (page) of Sri Guru Granth Sahib Ji, 1–1430.
  Future<ShabadData> ang(int n) async {
    final j = await _get('$_api/angs/$n/G', cacheKey: 'ang_$n');
    final page = (j['page'] as List).map((v) => GurbaniLine.fromBaniDb((v as Map).cast<String, dynamic>())).toList();
    return ShabadData(title: 'Ang $n', subtitle: 'Sri Guru Granth Sahib Ji', ang: n, lines: page);
  }

  Future<ShabadData> shabad(int id) async {
    final j = await _get('$_api/shabads/$id', cacheKey: 'shabad_$id');
    return _shabadFrom(j);
  }

  ShabadData _shabadFrom(Map<String, dynamic> j) {
    final info = (j['shabadInfo'] as Map).cast<String, dynamic>();
    final lines = (j['verses'] as List).map((v) => GurbaniLine.fromBaniDb((v as Map).cast<String, dynamic>())).toList();
    final writer = _writer(((info['writer'] ?? {}) as Map)['english'] as String?);
    final raag = ((info['raag'] ?? {}) as Map)['english'] as String?;
    final ang = info['pageNo'] as int?;
    final first = lines.firstWhere((l) => !l.header, orElse: () => lines.first);
    return ShabadData(
      title: first.gurmukhi,
      subtitle: [?writer, ?raag, if (ang != null) 'Ang $ang'].join(' · '),
      ang: ang, raag: raag, writer: writer, lines: lines,
    );
  }

  /// BaniDB search: 0 first letters (start), 1 first letters (anywhere), 2 Gurmukhi words, 3 English meaning.
  Future<List<SearchHit>> search(String query, int type) async {
    final q = Uri.encodeComponent(query.trim());
    final j = await _get('$_api/search/$q?source=G&searchtype=$type&results=40');
    return ((j['verses'] ?? []) as List).map((raw) {
      final v = (raw as Map).cast<String, dynamic>();
      return SearchHit(
        shabadId: v['shabadId'] as int,
        line: GurbaniLine.fromBaniDb(v),
        ang: v['pageNo'] as int?,
        writer: _writer(((v['writer'] ?? {}) as Map)['english'] as String?),
        raag: ((v['raag'] ?? {}) as Map)['english'] as String?,
      );
    }).toList();
  }

  /// The Hukamnama for a date: the one published by a Sikhify admin if there is one,
  /// otherwise BaniDB's, with the SGPC's recordings of the Hukamnama and its Katha.
  Future<Hukamnama> hukamnama(DateTime date) async {
    final iso = _iso(date);
    final today = _iso(_todayInIndia());
    try {
      final r = await _client
          .get(Uri.parse(iso == today ? '$_site/api/hukamnama/today' : '$_site/api/hukamnama/date/$iso'))
          .timeout(const Duration(seconds: 6));
      if (r.statusCode == 200) {
        final h = (jsonDecode(utf8.decode(r.bodyBytes)) as Map)['hukamnama'];
        if (h is Map) return _fromSikhify(h.cast<String, dynamic>(), date);
      }
    } catch (_) {
      // The website is slow or unreachable: BaniDB below.
    }
    final path = iso == today ? 'today' : '${date.year}/${date.month}/${date.day}';
    final j = await _get('$_api/hukamnamas/$path', cacheKey: 'hukamnama_$iso');
    final shabads = (j['shabads'] ?? []) as List;
    if (shabads.isEmpty) throw const LoadError('There is no Hukamnama for this date yet.');
    final g = ((j['date'] as Map)['gregorian'] as Map).cast<String, dynamic>();
    final day = DateTime(g['year'] as int, g['month'] as int, g['date'] as int);
    final parts = shabads.map((s) => _shabadFrom((s as Map).cast<String, dynamic>())).toList();
    return Hukamnama(
      date: day,
      lines: parts.expand((p) => p.lines).toList(),
      ang: parts.first.ang, raag: parts.first.raag, writer: parts.first.writer,
      audioUrl: _sgpc('hukamnamaaudio/SGPCNET', day), kathaUrl: _sgpc('kathaaudio/katha', day),
      source: 'Sri Harmandir Sahib, Amritsar. Text and meanings via BaniDB; audio published by the SGPC.',
    );
  }

  Hukamnama _fromSikhify(Map<String, dynamic> r, DateTime date) {
    List<String> split(Object? s) => (s is String ? s : '').split('\n').map((x) => x.trim()).where((x) => x.isNotEmpty).toList();
    final g = split(r['gurmukhi']);
    String? at(List<String> col, int i) => col.length == g.length ? col[i] : null;
    final t = split(r['transliteration']), pa = split(r['punjabi']), hi = split(r['hindi']), en = split(r['english']);
    return Hukamnama(
      date: DateTime.tryParse('${r['date']}') ?? date,
      lines: [
        for (var i = 0; i < g.length; i++)
          GurbaniLine(gurmukhi: g[i], translit: at(t, i), punjabi: at(pa, i), hindi: at(hi, i), english: at(en, i), header: i == 0 && g[i].length < 40),
      ],
      ang: r['ang'] as int?, raag: r['raag'] as String?, writer: r['writer'] as String?,
      audioUrl: (r['audioUrl'] as String?)?.isNotEmpty == true ? r['audioUrl'] as String : _sgpc('hukamnamaaudio/SGPCNET', date),
      kathaUrl: (r['kathaUrl'] as String?)?.isNotEmpty == true ? r['kathaUrl'] as String : _sgpc('kathaaudio/katha', date),
      source: (r['source'] as String?) ?? 'Sri Harmandir Sahib, Amritsar',
    );
  }

  static String _sgpc(String prefix, DateTime d) =>
      'https://hs.sgpc.net/$prefix${d.day.toString().padLeft(2, '0')}${d.month.toString().padLeft(2, '0')}${(d.year % 100).toString().padLeft(2, '0')}.mp3';

  static String _iso(DateTime d) => '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  /// "Today" is the date in India, where the Hukamnama is taken.
  static DateTime _todayInIndia() {
    final ist = DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
    return DateTime(ist.year, ist.month, ist.day);
  }

  static DateTime todayInIndia() => _todayInIndia();

  /// BaniDB spells names phonetically ("Guru Amar Daas Ji"); show the usual spellings.
  static String? _writer(String? name) => name
      ?.replaceAll('Daas', 'Das')
      .replaceAll('Raam', 'Ram')
      .replaceAll('Bahaadur', 'Bahadur')
      .replaceAll('Kabeer', 'Kabir')
      .replaceAll('Fareed', 'Farid')
      .replaceAll('Naam Dev', 'Namdev');
}
