import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';

import 'banidb.dart' show LoadError;

/// Kirtan and Katha: an artist with their videos (YouTube, played inside the app).
class Artist {
  Artist.fromJson(Map<String, dynamic> j)
      : id = j['id'] as String,
        name = j['name'] as String,
        sortName = (j['sortName'] ?? j['name']) as String,
        category = (j['category'] ?? '') as String,
        location = (j['location'] ?? '') as String,
        description = (j['description'] ?? '') as String,
        videos = ((j['videos'] ?? []) as List).map((v) => Video.fromJson((v as Map).cast<String, dynamic>(), artist: j['name'] as String)).toList();

  final String id, name, sortName, category, location, description;
  final List<Video> videos;

  String get initials {
    final words = name.replaceAll(RegExp(r'^(Bhai|Bibi|Sant|Giani|Baba|Prof\.?|Dr\.?)\s+', caseSensitive: false), '').split(' ').where((w) => w.isNotEmpty).toList();
    return words.take(2).map((w) => w[0].toUpperCase()).join();
  }
}

class Video {
  Video.fromJson(Map<String, dynamic> j, {required this.artist})
      : id = j['id'] as String,
        title = (j['title'] ?? '') as String,
        channel = (j['channel'] ?? '') as String,
        seconds = j['durationSeconds'] as int?;

  final String id, title, channel, artist;
  final int? seconds;

  String get thumb => 'https://i.ytimg.com/vi/$id/hqdefault.jpg';
  String get duration {
    final s = seconds;
    if (s == null) return '';
    final h = s ~/ 3600, m = (s % 3600) ~/ 60, sec = s % 60;
    return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:${sec.toString().padLeft(2, '0')}' : '$m:${sec.toString().padLeft(2, '0')}';
  }
}

class MediaCatalog {
  const MediaCatalog(this.categories, this.artists);
  final List<String> categories;
  final List<Artist> artists;
}

/// A Gurpurab or important day, with its next date.
class Festival {
  Festival.fromJson(Map<String, dynamic> j)
      : slug = j['slug'] as String,
        title = j['title'] as String,
        summary = (j['summary'] ?? '') as String,
        description = (j['description'] ?? '') as String,
        significance = (j['significance'] ?? '') as String,
        category = (j['category'] ?? '') as String,
        relatedGuru = (j['relatedGuru'] ?? '') as String,
        imageUrl = (j['imageUrl'] ?? '') as String,
        start = _date(j['start'] ?? (j['next'] is Map ? (j['next'] as Map)['start'] : null)),
        nanakshahi = (j['nanakshahi'] ?? (j['next'] is Map ? (j['next'] as Map)['nanakshahi'] : null)) as String?,
        status = j['status'] as String?,
        daysUntil = j['daysUntil'] as int?;

  final String slug, title, summary, description, significance, category, relatedGuru, imageUrl;
  final DateTime? start;
  final String? nanakshahi, status;
  final int? daysUntil;

  static DateTime? _date(Object? s) => s is String ? DateTime.tryParse(s) : null;

  /// The Guru Sahib's painting bundled with the app, when the day is about a Guru.
  String? get guruArt {
    const art = ['guru-nanak-dev-ji', 'guru-angad-dev-ji', 'guru-amar-das-ji', 'guru-ram-das-ji', 'guru-arjan-dev-ji', 'guru-hargobind-sahib-ji', 'guru-har-rai-ji', 'guru-har-krishan-ji', 'guru-gobind-singh-ji'];
    final id = relatedGuru.replaceAll('/gurus/', '');
    for (final a in art) {
      if (id == a || slug.contains(a.replaceAll('-ji', ''))) return 'assets/images/gurus/$a.webp';
    }
    return null;
  }
}

/// A homepage banner set in the website's Admin → Homepage banners: a picture and/or YouTube video,
/// or a festival with its next verified date.
class HomeBanner {
  HomeBanner.fromJson(Map<String, dynamic> j)
      : id = (j['id'] as num).toInt(),
        title = _plain((j['title'] ?? '') as String),
        description = _plain((j['description'] ?? '') as String),
        imageUrl = j['image'] is Map ? _absolute((j['image'] as Map)['url'] as String?) : null,
        imageAlt = j['image'] is Map ? ((j['image'] as Map)['alt'] ?? '') as String : '',
        youtubeId = j['youtubeId'] as String?,
        ctaLabel = j['cta'] is Map ? (j['cta'] as Map)['label'] as String? : null,
        ctaUrl = j['cta'] is Map ? (j['cta'] as Map)['url'] as String? : null,
        observance = j['observance'] is Map ? Festival.fromJson((j['observance'] as Map).cast<String, dynamic>()) : null;

  final int id;
  final String title, description, imageAlt;
  final String? imageUrl, youtubeId, ctaLabel, ctaUrl;
  final Festival? observance;

  /// The website marks gold or bold words with asterisks; the app shows the words alone.
  static String _plain(String s) => s.replaceAllMapped(RegExp(r'\*{1,2}([^*\n]+)\*{1,2}'), (m) => m[1]!).trim();
  static String? _absolute(String? url) => url == null || url.isEmpty ? null : (url.startsWith('/') ? '${SiteApi.base}$url' : url);

  /// What the banner shows: its own picture, the video's poster, the Guru Sahib's painting, or Sri Harmandir Sahib.
  String get picture =>
      imageUrl ??
      (youtubeId != null ? 'https://i.ytimg.com/vi/$youtubeId/hqdefault.jpg' : null) ??
      observance?.guruArt ??
      _absolute(observance?.imageUrl) ??
      'assets/images/golden_temple.webp';
}

class Gurdwara {
  Gurdwara.fromJson(Map<String, dynamic> j)
      : id = j['id'] as int,
        name = j['name'] as String,
        url = j['url'] as String,
        designation = (j['designation'] ?? '') as String,
        alsoKnownAs = (j['alsoKnownAs'] ?? '') as String,
        address = (j['address'] ?? '') as String,
        phone = (j['phone'] ?? '') as String,
        website = (j['website'] ?? '') as String,
        summary = (j['summary'] ?? '') as String,
        description = (j['description'] ?? '') as String,
        city = ((j['city'] ?? {}) as Map)['name'] as String? ?? '',
        state = ((j['state'] ?? {}) as Map)['name'] as String? ?? '',
        country = ((j['country'] ?? {}) as Map)['name'] as String? ?? '',
        lat = (j['latitude'] as num?)?.toDouble(),
        lng = (j['longitude'] as num?)?.toDouble(),
        verified = j['verification'] == 'verified',
        image = j['image'] is Map ? (((j['image'] as Map)['thumbUrl'] ?? (j['image'] as Map)['url']) as String?) : null,
        imageLarge = j['image'] is Map ? (j['image'] as Map)['url'] as String? : null,
        imageCredit = j['image'] is Map ? [(j['image'] as Map)['credit'], (j['image'] as Map)['license']].whereType<String>().join(', ') : null,
        // The fields below come with a Gurdwara's full page (empty in search results).
        officialName = (j['officialName'] ?? '') as String,
        district = (j['district'] ?? '') as String,
        postalCode = (j['postalCode'] ?? '') as String,
        email = (j['email'] ?? '') as String,
        programs = (j['programs'] ?? '') as String,
        openingHours = (j['openingHours'] ?? '') as String,
        management = (j['managementOrganization'] ?? '') as String,
        established = (j['establishedYear'] as num?)?.toInt(),
        facilities = ((j['facilities'] ?? []) as List).map((x) => '$x').toList(),
        services = ((j['services'] ?? []) as List).map((x) => '$x').toList(),
        photos = [
          for (final p in (j['images'] ?? []) as List)
            if (p is Map && p['isPrimary'] != true && (p['thumbUrl'] ?? p['url']) is String) (p['thumbUrl'] ?? p['url']) as String,
        ],
        sources = [
          for (final s in (j['sources'] ?? []) as List)
            if (s is Map && s['url'] is String && (s['url'] as String).isNotEmpty) ((s['name'] ?? s['url']) as String, s['url'] as String),
        ];

  final int id;
  final String name, url, designation, alsoKnownAs, address, phone, website, summary, description, city, state, country;
  final double? lat, lng;
  final bool verified;
  final String? image, imageLarge, imageCredit;
  final String officialName, district, postalCode, email, programs, openingHours, management;
  final int? established;
  final List<String> facilities, services, photos;
  final List<(String, String)> sources;

  /// Other Gurdwaras close by (only on a full page).
  List<Gurdwara> nearby = const [];

  String get place => [city, state, country].where((s) => s.isNotEmpty).join(', ');
  bool get hasLocation => lat != null && lng != null;
}

/// A directory record: the common fields plus its section's own fields.
class Entry {
  Entry.fromJson(Map<String, dynamic> j)
      : type = j['type'] as String,
        slug = j['slug'] as String,
        title = (j['title'] ?? '') as String,
        summary = (j['summary'] ?? '') as String,
        body = (j['body'] ?? '') as String,
        imageUrl = (j['imageUrl'] ?? '') as String,
        category = (j['category'] ?? '') as String,
        date = j['date'] is String ? DateTime.tryParse(j['date'] as String) : null,
        url = (j['url'] ?? '') as String,
        place = [j['city'], j['state'], j['country']].whereType<String>().where((s) => s.isNotEmpty).join(', '),
        fields = ((j['fields'] ?? {}) as Map).cast<String, dynamic>(),
        verified = ((j['verification'] ?? {}) as Map)['status'] == 'verified',
        source = (((j['verification'] ?? {}) as Map)['source'] ?? '') as String,
        references = ((((j['verification'] ?? {}) as Map)['references'] ?? []) as List)
            .map((r) => ((r as Map)['label'] ?? r['url']) as String? ?? '')
            .toList(),
        referenceUrls = ((((j['verification'] ?? {}) as Map)['references'] ?? []) as List).map((r) => ((r as Map)['url'] ?? '') as String).toList();

  final String type, slug, title, summary, body, imageUrl, category, url, place, source;
  final DateTime? date;
  final Map<String, dynamic> fields;
  final bool verified;
  final List<String> references, referenceUrls;

  /// Where the record points outside Sikhify (website, app store, Drive file, article…), with a label.
  (String, String)? get link {
    String? f(String k) => (fields[k] is String && (fields[k] as String).isNotEmpty) ? fields[k] as String : null;
    return switch (type) {
      'website' => f('url') == null ? null : ('Visit website', f('url')!),
      'app' => (f('store_url') ?? f('website')) == null ? null : ('Get the app', (f('store_url') ?? f('website'))!),
      'organization' => f('website') == null ? null : ('Official website', f('website')!),
      'news' => f('source_url') == null ? null : ('Read article', f('source_url')!),
      'book' => f('url') == null ? null : ('Where to find it', f('url')!),
      'download' => f('drive_url') == null ? null : ('Download', f('drive_url')!),
      'event' => (f('registration_url') ?? f('livestream_url')) == null ? null : (f('registration_url') != null ? 'Register' : 'Livestream', (f('registration_url') ?? f('livestream_url'))!),
      _ => null,
    };
  }

  /// Full image URL (uploads are relative to the website).
  String? get image => imageUrl.isEmpty ? null : (imageUrl.startsWith('/') ? '${SiteApi.base}$imageUrl' : imageUrl);
}

class EntryPage {
  const EntryPage(this.items, this.total, this.page, this.pages);
  final List<Entry> items;
  final int total, page, pages;
}

class GurdwaraPage {
  const GurdwaraPage(this.items, this.total, this.page, this.pages);
  final List<Gurdwara> items;
  final int total, page, pages;
}

/// A country, state or city that has Gurdwaras listed (for the place pickers).
class Place {
  const Place(this.name, this.slug, this.count);
  final String name, slug;
  final int count;
  factory Place.fromJson(Map j) => Place('${j['name'] ?? ''}', '${j['slug'] ?? ''}', (j['count'] ?? 0) as int);
}

class Locations {
  const Locations(this.countries, this.states, this.cities);
  final List<Place> countries, states, cities;
}

/// The Sikhify website's API (www.sikhify.in): Kirtan & Katha, festivals and the Gurdwara directory.
/// Answers are kept on the phone, so the last ones show when offline.
class SiteApi {
  SiteApi._();
  static final SiteApi instance = SiteApi._();
  static const base = 'https://www.sikhify.in';
  final _client = http.Client();

  Future<Map<String, dynamic>> _get(String path, {String? cacheKey}) async {
    File? file;
    if (cacheKey != null) {
      try {
        file = File('${(await getApplicationSupportDirectory()).path}/site_cache/$cacheKey.json');
      } catch (_) {}
    }
    try {
      final r = await _client.get(Uri.parse('$base$path'), headers: {'Accept': 'application/json'}).timeout(const Duration(seconds: 15));
      if (r.statusCode != 200) throw LoadError('Couldn’t load this (error ${r.statusCode}).');
      final body = utf8.decode(r.bodyBytes);
      if (file != null) {
        await file.parent.create(recursive: true);
        await file.writeAsString(body);
      }
      return jsonDecode(body) as Map<String, dynamic>;
    } on LoadError {
      rethrow;
    } catch (_) {
      if (file != null && await file.exists()) return jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      throw const LoadError('No internet connection. Connect and try again.');
    }
  }

  MediaCatalog? _media;
  Future<MediaCatalog> media() async {
    if (_media != null) return _media!;
    final j = await _get('/api/media', cacheKey: 'media');
    return _media = MediaCatalog(
      ((j['categories'] ?? []) as List).cast<String>(),
      ((j['artists'] ?? []) as List).map((a) => Artist.fromJson((a as Map).cast<String, dynamic>())).toList(),
    );
  }

  /// The banners live on the website's homepage right now. Never kept for offline: a saved banner could
  /// outlive its dates. Tried twice, because the first request after a quiet spell can time out.
  Future<List<HomeBanner>> homeBanners() async {
    Map<String, dynamic> j;
    try {
      j = await _get('/api/banners/home');
    } on LoadError {
      j = await _get('/api/banners/home');
    }
    return ((j['items'] ?? []) as List).map((b) => HomeBanner.fromJson((b as Map).cast<String, dynamic>())).toList();
  }

  /// The next published events (soonest first). A saved list shown offline leaves out days already gone.
  Future<List<Entry>> upcomingEvents({int limit = 3}) async {
    final j = await _get('/api/entries?type=event&when=upcoming&limit=$limit', cacheKey: 'events_upcoming');
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return ((j['items'] ?? []) as List)
        .map((e) => Entry.fromJson((e as Map).cast<String, dynamic>()))
        .where((e) => e.date != null && !e.date!.isBefore(today))
        .toList();
  }

  /// The next festivals and important days (soonest first).
  Future<List<Festival>> upcomingFestivals() async {
    final j = await _get('/api/festivals/home', cacheKey: 'festivals_home');
    return ((j['items'] ?? []) as List).map((f) => Festival.fromJson((f as Map).cast<String, dynamic>())).toList();
  }

  /// Every observance in the calendar, by its next date.
  Future<List<Festival>> allFestivals() async {
    final j = await _get('/api/festivals', cacheKey: 'festivals_all');
    final list = ((j['items'] ?? []) as List).map((f) => Festival.fromJson((f as Map).cast<String, dynamic>())).toList();
    list.sort((a, b) => (a.start ?? DateTime(9999)).compareTo(b.start ?? DateTime(9999)));
    return list;
  }

  Future<Festival> festival(String slug) async {
    final j = await _get('/api/festivals/${Uri.encodeComponent(slug)}', cacheKey: 'festival_$slug');
    return Festival.fromJson(((j['observance'] ?? j) as Map).cast<String, dynamic>());
  }

  /// Search the Global Gurdwara Directory. With no search text, the historic Gurdwaras come first.
  /// Search by name/city/country text and/or a chosen place (country → state → city).
  /// With neither, the historic Gurdwaras are listed.
  Future<GurdwaraPage> gurdwaras({String q = '', String? country, String? state, String? city, int page = 1}) async {
    final any = q.trim().isNotEmpty || country != null;
    final params = {
      if (q.trim().isNotEmpty) 'q': q.trim(),
      if (!any) 'designation': 'historic',
      'country': ?country,
      if (country != null) 'state': ?state,
      if (country != null && state != null) 'city': ?city,
      'page': '$page',
      'pageSize': '30',
    };
    final j = await _get('/api/gurdwaras?${Uri(queryParameters: params).query}', cacheKey: !any && page == 1 ? 'gurdwaras_historic' : null);
    return GurdwaraPage(
      ((j['items'] ?? []) as List).map((g) => Gurdwara.fromJson((g as Map).cast<String, dynamic>())).toList(),
      (j['total'] ?? 0) as int, (j['page'] ?? 1) as int, (j['pages'] ?? 1) as int,
    );
  }

  /// The countries with listings, and the states/cities inside the chosen ones.
  Future<Locations> gurdwaraLocations({String? country, String? state}) async {
    final params = {'country': ?country, if (country != null) 'state': ?state};
    final j = await _get('/api/gurdwaras/locations?${Uri(queryParameters: params).query}', cacheKey: 'gw_loc_${country ?? ''}_${state ?? ''}');
    List<Place> list(String k) => ((j[k] ?? []) as List).map((p) => Place.fromJson(p as Map)).where((p) => p.slug.isNotEmpty).toList();
    return Locations(list('countries'), country == null ? const [] : list('states'), state == null ? const [] : list('cities'));
  }

  /// A directory section's records (Personalities, Books, Blog, Downloads, Kids…), newest-sorted as on the site.
  Future<EntryPage> entries(String type, {String q = '', String? category, int page = 1}) async {
    final params = {'type': type, 'page': '$page', if (q.trim().isNotEmpty) 'q': q.trim(), 'category': ?category};
    final j = await _get('/api/entries?${Uri(queryParameters: params).query}', cacheKey: q.isEmpty && category == null && page == 1 ? 'entries_$type' : null);
    return EntryPage(
      ((j['items'] ?? []) as List).map((e) => Entry.fromJson((e as Map).cast<String, dynamic>())).toList(),
      (j['total'] ?? 0) as int, (j['page'] ?? 1) as int, (j['pages'] ?? 1) as int,
    );
  }

  /// The categories used in a section (for its filter chips).
  Future<List<String>> entryCategories(String type) async {
    final j = await _get('/api/entries/facets?type=$type', cacheKey: 'facets_$type');
    return ((j['categories'] ?? []) as List).map((c) => (c as Map)['value'] as String).toList();
  }

  Future<Entry> entry(String type, String slug) async {
    final j = await _get('/api/entries/$type/$slug', cacheKey: 'entry_${type}_$slug');
    return Entry.fromJson((j['entry'] as Map).cast<String, dynamic>());
  }

  /// One Gurdwara's full details (from its directory URL).
  Future<Gurdwara> gurdwara(String url) async {
    final path = url.replaceFirst('/directory/gurdwaras/', '');
    final j = await _get('/api/gurdwaras/by-path/$path', cacheKey: 'gurdwara_${path.replaceAll('/', '_')}');
    return Gurdwara.fromJson((j['gurdwara'] as Map).cast<String, dynamic>())
      ..nearby = ((j['nearby'] ?? []) as List).map((g) => Gurdwara.fromJson((g as Map).cast<String, dynamic>())).toList();
  }
}
