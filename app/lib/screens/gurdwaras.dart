import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/i18n.dart';
import '../services/site_api.dart';
import '../theme.dart';
import '../widgets/gurbani_view.dart';
import 'contribute.dart';

/// OpenStreetMap tiles (free; the attribution is shown on the map, as its licence asks).
TileLayer osmTiles() => TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'in.sikhify.app');
Widget osmAttribution() => const RichAttributionWidget(attributions: [TextSourceAttribution('OpenStreetMap contributors')]);

/// The Global Gurdwara Directory: search, a map of the results and a card for each.
class GurdwarasScreen extends StatefulWidget {
  const GurdwarasScreen({super.key});

  @override
  State<GurdwarasScreen> createState() => _GurdwarasScreenState();
}

class _GurdwarasScreenState extends State<GurdwarasScreen> {
  final _q = TextEditingController();
  late Future<GurdwaraPage> _page = SiteApi.instance.gurdwaras();
  final List<Gurdwara> _items = [];
  int _pageNo = 1, _pages = 1, _total = 0;
  bool _loadingMore = false;
  Timer? _debounce;

  // What the shown results are for (the search box can be ahead of them while typing).
  String _query = '';
  Place? _country, _state, _city;
  Locations _places = const Locations([], [], []);
  // Changes with every new search, so the map re-centres on the new results.
  int _searchNo = 0;

  @override
  void initState() {
    super.initState();
    _loadPlaces();
  }

  Future<void> _loadPlaces() async {
    try {
      final p = await SiteApi.instance.gurdwaraLocations(country: _country?.slug, state: _state?.slug);
      if (mounted) setState(() => _places = p);
    } catch (_) {
      // The pickers stay as they are; text search still works.
    }
  }

  bool get _filtered => _query.isNotEmpty || _country != null;

  void _run() {
    setState(() {
      _items.clear();
      _pageNo = 1;
      _pages = 1;
      _searchNo++;
      _page = SiteApi.instance.gurdwaras(q: _query, country: _country?.slug, state: _state?.slug, city: _city?.slug);
    });
  }

  void _search(String q) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), () {
      if (!mounted || q.trim() == _query) return;
      _query = q.trim();
      _run();
    });
  }

  void _submit(String q) {
    _debounce?.cancel();
    _query = q.trim();
    _run();
  }

  void _clearText() {
    _debounce?.cancel();
    _q.clear();
    _query = '';
    _run();
  }

  void _setPlace({Place? country, Place? state, Place? city}) {
    _country = country;
    _state = state;
    _city = city;
    _run();
    _loadPlaces();
  }

  void _reset() {
    _debounce?.cancel();
    _q.clear();
    _query = '';
    _setPlace();
  }

  Future<void> _more() async {
    if (_loadingMore || _pageNo >= _pages) return;
    final no = _searchNo;
    setState(() => _loadingMore = true);
    try {
      final p = await SiteApi.instance.gurdwaras(q: _query, country: _country?.slug, state: _state?.slug, city: _city?.slug, page: _pageNo + 1);
      if (mounted && no == _searchNo) {
        setState(() {
          _items.addAll(p.items);
          _pageNo = p.page;
        });
      }
    } catch (_) {
      // Keep what is shown; the button stays to try again.
    }
    if (mounted) setState(() => _loadingMore = false);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  String get _title {
    if (!_filtered) return tr('Historic Gurdwaras');
    final where = _city?.name ?? _state?.name ?? _country?.name;
    final n = '$_total ${_total == 1 ? tr('result') : tr('results')}';
    return where == null ? n : '$n · $where';
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final fill = dark ? const Color(0xFF16233F) : Brand.sand;
    return Scaffold(
      appBar: AppBar(title: Text(tr('Gurdwaras'))),
      body: FutureBuilder<GurdwaraPage>(
        future: _page,
        builder: (context, snap) {
          final loading = snap.connectionState != ConnectionState.done;
          if (!loading && snap.hasData && _pageNo == 1 && _items.isEmpty) {
            _items.addAll(snap.data!.items);
            _pages = snap.data!.pages;
          }
          if (!loading && snap.hasData) _total = snap.data!.total;
          final located = _items.where((g) => g.hasLocation).toList();
          return ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
            TextField(
              controller: _q,
              onChanged: (v) {
                _search(v);
                setState(() {}); // shows/hides the clear button
              },
              onSubmitted: _submit,
              textInputAction: TextInputAction.search,
              decoration: InputDecoration(
                hintText: tr('Name, place, Guru Sahib, Langar…'),
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _q.text.isEmpty ? null : IconButton(tooltip: tr('Clear'), icon: const Icon(Icons.close_rounded), onPressed: _clearText),
                filled: true,
                fillColor: fill,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
              ),
            ),
            const SizedBox(height: 10),
            // Step by step, as on the website: country, then its states, then that state's cities.
            Row(children: [
              Expanded(child: _PlacePicker(label: tr('Country'), value: _country, options: _places.countries, fill: fill, onChanged: (p) => _setPlace(country: p))),
              const SizedBox(width: 8),
              Expanded(child: _PlacePicker(label: tr('State'), value: _state, options: _places.states, fill: fill, enabled: _country != null, onChanged: (p) => _setPlace(country: _country, state: p))),
              const SizedBox(width: 8),
              Expanded(child: _PlacePicker(label: tr('City'), value: _city, options: _places.cities, fill: fill, enabled: _state != null, onChanged: (p) => _setPlace(country: _country, state: _state, city: p))),
            ]),
            if (_filtered)
              Align(alignment: Alignment.centerRight, child: TextButton.icon(onPressed: _reset, icon: const Icon(Icons.restart_alt_rounded, size: 18), label: Text(tr('Reset')))),
            const SizedBox(height: 8),
            if (!loading && snap.hasError)
              ErrorView(message: '${snap.error}', onRetry: _run)
            else if (loading || !snap.hasData)
              const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()))
            else ...[
              if (located.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(18),
                  child: SizedBox(
                    height: 200,
                    child: FlutterMap(
                      key: ValueKey('map$_searchNo'),
                      options: MapOptions(
                        initialCameraFit: located.length > 1
                            ? CameraFit.coordinates(coordinates: [for (final g in located) LatLng(g.lat!, g.lng!)], padding: const EdgeInsets.all(28), maxZoom: 12)
                            : null,
                        initialCenter: LatLng(located.first.lat!, located.first.lng!),
                        initialZoom: 13,
                        interactionOptions: const InteractionOptions(flags: InteractiveFlag.all & ~InteractiveFlag.rotate),
                      ),
                      children: [
                        osmTiles(),
                        MarkerLayer(markers: [
                          for (final (i, g) in located.indexed)
                            Marker(
                              point: LatLng(g.lat!, g.lng!),
                              width: 34, height: 34,
                              alignment: Alignment.topCenter,
                              child: GestureDetector(
                                onTap: () => _open(context, g),
                                child: Icon(Icons.location_on_rounded, size: 34, color: i.isEven ? const Color(0xFFD64535) : Brand.navy),
                              ),
                            ),
                        ]),
                        osmAttribution(),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              Text(_title, style: sectionTitle(context)),
              const SizedBox(height: 10),
              if (_items.isEmpty) Padding(padding: const EdgeInsets.all(24), child: Text(tr('No Gurdwaras found. Try a city or another spelling.'), textAlign: TextAlign.center)),
              for (final g in _items) Padding(padding: const EdgeInsets.only(bottom: 14), child: GurdwaraCard(gurdwara: g, onTap: () => _open(context, g))),
              if (_pageNo < _pages)
                OutlinedButton(onPressed: _loadingMore ? null : _more, child: Text(_loadingMore ? tr('Loading…') : tr('Show more'))),
            ],
          ]);
        },
      ),
    );
  }

  void _open(BuildContext context, Gurdwara g) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => GurdwaraScreen(summary: g)));
}

/// A compact drop-down for one level of the place (country, state or city).
class _PlacePicker extends StatelessWidget {
  const _PlacePicker({required this.label, required this.value, required this.options, required this.fill, required this.onChanged, this.enabled = true});
  final String label;
  final Place? value;
  final List<Place> options;
  final Color fill;
  final bool enabled;
  final ValueChanged<Place?> onChanged;

  @override
  Widget build(BuildContext context) {
    final on = enabled && options.isNotEmpty;
    final muted = Theme.of(context).disabledColor;
    return Material(
      color: fill.withValues(alpha: on || value != null ? 1 : 0.5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: value != null ? const BorderSide(color: Brand.gold, width: 1.5) : BorderSide.none,
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: on ? () => _pick(context) : null,
        child: Container(
          height: 48,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          child: Row(children: [
            Expanded(
              child: Text(value?.name ?? label, maxLines: 1, overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontWeight: value != null ? FontWeight.w700 : FontWeight.w500, color: on || value != null ? null : muted)),
            ),
            Icon(Icons.expand_more_rounded, size: 20, color: on ? null : muted),
          ]),
        ),
      ),
    );
  }

  Future<void> _pick(BuildContext context) async {
    final picked = await showModalBottomSheet<Object>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _PlaceSheet(label: label, options: options, hasValue: value != null),
    );
    if (picked == null) return;
    onChanged(picked is Place ? picked : null); // anything else = "All"
  }
}

class _PlaceSheet extends StatefulWidget {
  const _PlaceSheet({required this.label, required this.options, required this.hasValue});
  final String label;
  final List<Place> options;
  final bool hasValue;

  @override
  State<_PlaceSheet> createState() => _PlaceSheetState();
}

class _PlaceSheetState extends State<_PlaceSheet> {
  String _filter = '';

  @override
  Widget build(BuildContext context) {
    final shown = widget.options.where((p) => p.name.toLowerCase().contains(_filter.toLowerCase())).toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.6,
        child: Column(children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _filter = v.trim()),
              decoration: InputDecoration(
                hintText: '${tr('Search')}: ${widget.label}',
                prefixIcon: const Icon(Icons.search_rounded),
                isDense: true,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
          ),
          Expanded(
            child: ListView(children: [
              if (widget.hasValue && _filter.isEmpty)
                ListTile(leading: const Icon(Icons.public_rounded), title: Text('${tr('All')} (${widget.label})'), onTap: () => Navigator.pop(context, 'all')),
              for (final p in shown)
                ListTile(title: Text(p.name), trailing: Text('${p.count}'), onTap: () => Navigator.pop(context, p)),
            ]),
          ),
        ]),
      ),
    );
  }
}

class GurdwaraCard extends StatelessWidget {
  const GurdwaraCard({super.key, required this.gurdwara, required this.onTap});
  final Gurdwara gurdwara;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final g = gurdwara;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            height: 150,
            width: double.infinity,
            child: g.image != null
                ? Pic(g.image!, radius: 0)
                : Container(
                    decoration: const BoxDecoration(gradient: Brand.nightGradient),
                    alignment: Alignment.center,
                    child: GurdwaraIcon(size: 64, color: Brand.gold.withValues(alpha: 0.85)),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(g.name, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
              const SizedBox(height: 2),
              Text(g.place, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              const SizedBox(height: 6),
              Row(children: [
                if (g.verified) ...[const Icon(Icons.verified_rounded, size: 16, color: Brand.goldDark), const SizedBox(width: 4), Text(tr('Verified listing'), style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600))],
                if (g.designation == 'takht') ...[const SizedBox(width: 10), const Text('Takht', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Brand.goldDark))],
              ]),
              const SizedBox(height: 10),
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(42), backgroundColor: Brand.navyDeep, foregroundColor: Colors.white),
                onPressed: onTap,
                child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [Text(tr('View Details')), const SizedBox(width: 6), const Icon(Icons.arrow_forward_rounded, size: 18)]),
              ),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// One Gurdwara: photo, about, address and contacts, map and directions.
class GurdwaraScreen extends StatefulWidget {
  const GurdwaraScreen({super.key, required this.summary});
  final Gurdwara summary;

  @override
  State<GurdwaraScreen> createState() => _GurdwaraScreenState();
}

class _GurdwaraScreenState extends State<GurdwaraScreen> {
  late final Future<Gurdwara> _g = SiteApi.instance.gurdwara(widget.summary.url);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: FutureBuilder<Gurdwara>(
        future: _g,
        initialData: widget.summary,
        builder: (context, snap) {
          final g = snap.data ?? widget.summary; // on an error the summary is still shown
          final muted = Theme.of(context).colorScheme.onSurfaceVariant;
          return CustomScrollView(slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 240,
              foregroundColor: Colors.white,
              backgroundColor: Brand.navy,
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(fit: StackFit.expand, children: [
                  if (g.imageLarge != null || g.image != null) Pic(g.imageLarge ?? g.image!, radius: 0) else const DecoratedBox(decoration: BoxDecoration(gradient: Brand.nightGradient)),
                  const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x550B1A33), Color(0xDD0B1A33)]))),
                  Positioned(
                    left: 20, right: 20, bottom: 18,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(g.name, style: serif(26, color: Colors.white)),
                      Text(g.place, style: const TextStyle(color: Colors.white70)),
                    ]),
                  ),
                ]),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 32),
              sliver: SliverList.list(children: [
                if (snap.connectionState == ConnectionState.waiting) const LinearProgressIndicator(color: Brand.gold),
                if (snap.hasError) Text('Some details couldn’t load. ${snap.error}', style: TextStyle(color: muted)),
                Wrap(spacing: 10, runSpacing: 10, children: [
                  if (g.hasLocation)
                    FilledButton.icon(
                      onPressed: () => launchUrl(Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}'), mode: LaunchMode.externalApplication),
                      icon: const Icon(Icons.directions_rounded),
                      label: Text(tr('Directions')),
                    ),
                  if (g.phone.isNotEmpty) OutlinedButton.icon(onPressed: () => launchUrl(Uri.parse('tel:${g.phone}')), icon: const Icon(Icons.call_rounded), label: const Text('Call')),
                  if (g.website.isNotEmpty) OutlinedButton.icon(onPressed: () => launchUrl(Uri.parse(g.website), mode: LaunchMode.externalApplication), icon: const Icon(Icons.public_rounded), label: const Text('Website')),
                ]),
                if (g.alsoKnownAs.isNotEmpty) ...[const SizedBox(height: 14), Text('Also known as ${g.alsoKnownAs.replaceAll(';', ',')}', style: TextStyle(color: muted, fontStyle: FontStyle.italic))],
                if ((g.description.isNotEmpty ? g.description : g.summary).isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(tr('About'), style: sectionTitle(context)),
                  const SizedBox(height: 6),
                  Text(g.description.isNotEmpty ? g.description : g.summary, style: const TextStyle(height: 1.6, fontSize: 15)),
                ],
                _GurdwaraInfo(g: g),
                if (g.facilities.isNotEmpty || g.services.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(tr('Facilities and services'), style: sectionTitle(context)),
                  const SizedBox(height: 8),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    for (final f in g.facilities) Chip(avatar: Icon(_facilityIcons[f] ?? Icons.check_rounded, size: 18, color: Brand.goldDark), label: Text(tr(_label(f)))),
                    for (final sv in g.services) Chip(avatar: const Icon(Icons.auto_awesome_rounded, size: 16, color: Brand.goldDark), label: Text(tr(_label(sv)))),
                  ]),
                ],
                if (g.hasLocation) ...[
                  const SizedBox(height: 16),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(18),
                    child: SizedBox(
                      height: 200,
                      child: FlutterMap(
                        options: MapOptions(initialCenter: LatLng(g.lat!, g.lng!), initialZoom: 15),
                        children: [
                          osmTiles(),
                          MarkerLayer(markers: [Marker(point: LatLng(g.lat!, g.lng!), width: 40, height: 40, alignment: Alignment.topCenter, child: const Icon(Icons.location_on_rounded, size: 40, color: Color(0xFFD64535)))]),
                          osmAttribution(),
                        ],
                      ),
                    ),
                  ),
                ],
                if (g.photos.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text(tr('Photos'), style: sectionTitle(context)),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 120,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: g.photos.length,
                      separatorBuilder: (_, _) => const SizedBox(width: 10),
                      itemBuilder: (context, i) => SizedBox(width: 170, child: Pic(g.photos[i], radius: 14)),
                    ),
                  ),
                ],
                if (g.imageCredit != null && g.imageCredit!.isNotEmpty) ...[const SizedBox(height: 14), Text('Photo: ${g.imageCredit}', style: TextStyle(fontSize: 12, color: muted))],
                // Know something about this Gurdwara? Add it (it is checked before it shows).
                const SizedBox(height: 18),
                Card(
                  color: Brand.gold.withValues(alpha: 0.12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(tr('Know more about this Gurdwara?'), style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text(tr('Add a phone number, timings or a note, or tell us if something is wrong.'), style: TextStyle(color: muted)),
                      const SizedBox(height: 10),
                      Wrap(spacing: 10, runSpacing: 8, children: [
                        FilledButton.icon(
                          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => GurdwaraUpdateScreen(gurdwara: g))),
                          icon: const Icon(Icons.add_call),
                          label: Text(tr('Add number or note')),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ReportScreen(targetUrl: '${SiteApi.base}${g.url}', targetName: g.name))),
                          icon: const Icon(Icons.flag_outlined),
                          label: Text(tr('Report a mistake')),
                        ),
                      ]),
                    ]),
                  ),
                ),
                if (g.nearby.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Text(tr('Gurdwaras nearby'), style: sectionTitle(context)),
                  const SizedBox(height: 6),
                  for (final n in g.nearby)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: SizedBox(
                        width: 64,
                        height: 48,
                        child: n.image != null
                            ? Pic(n.image!, radius: 10)
                            : Container(decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(10)), alignment: Alignment.center, child: const GurdwaraIcon(size: 26, color: Brand.gold)),
                      ),
                      title: Text(n.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                      subtitle: Text(n.place),
                      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => GurdwaraScreen(summary: n))),
                    ),
                ],
                if (g.sources.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Text(tr('Sources'), style: TextStyle(fontWeight: FontWeight.w700, color: muted)),
                  for (final (name, url) in g.sources)
                    InkWell(
                      onTap: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
                      child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text(name, style: const TextStyle(decoration: TextDecoration.underline))),
                    ),
                ],
                const SizedBox(height: 8),
                TextButton.icon(
                  onPressed: () => launchUrl(Uri.parse('${SiteApi.base}${g.url}'), mode: LaunchMode.externalApplication),
                  icon: const Icon(Icons.open_in_new_rounded, size: 18),
                  label: const Text('Full listing and sources on sikhify.in'),
                ),
              ]),
            ),
          ]);
        },
      ),
    );
  }
}

const _facilityIcons = {
  'langar': Icons.restaurant_rounded,
  'parking': Icons.local_parking_rounded,
  'wheelchair_access': Icons.accessible_rounded,
  'accommodation': Icons.hotel_rounded,
};

/// "punjabi_classes" → "Punjabi classes" (the website's facility and service keys).
String _label(String key) {
  final t = key.replaceAll('_', ' ');
  return t.isEmpty ? t : t[0].toUpperCase() + t.substring(1);
}

/// The Gurdwara's facts in one card: only the ones the directory has.
class _GurdwaraInfo extends StatelessWidget {
  const _GurdwaraInfo({required this.g});
  final Gurdwara g;

  @override
  Widget build(BuildContext context) {
    final rows = <(IconData, String, String, VoidCallback?)>[
      if (g.officialName.isNotEmpty && g.officialName != g.name) (Icons.badge_outlined, tr('Official name'), g.officialName, null),
      if (g.established != null) (Icons.history_edu_rounded, tr('Established'), '${g.established}', null),
      if (g.management.isNotEmpty) (Icons.account_balance_outlined, tr('Managed by'), g.management, null),
      if (g.openingHours.isNotEmpty) (Icons.schedule_rounded, tr('Opening hours'), g.openingHours, null),
      if (g.programs.isNotEmpty) (Icons.event_note_rounded, tr('Programmes'), g.programs, null),
      if (g.address.isNotEmpty) (Icons.place_outlined, tr('Address'), [g.address, if (g.postalCode.isNotEmpty) g.postalCode].join(', '), null),
      if (g.district.isNotEmpty && g.district != g.city) (Icons.map_outlined, tr('District'), g.district, null),
      if (g.phone.isNotEmpty) (Icons.call_outlined, tr('Phone'), g.phone, () => launchUrl(Uri.parse('tel:${g.phone}'))),
      if (g.email.isNotEmpty) (Icons.mail_outline_rounded, tr('Email'), g.email, () => launchUrl(Uri.parse('mailto:${g.email}'))),
      if (g.website.isNotEmpty) (Icons.public_rounded, tr('Website'), g.website.replaceFirst(RegExp(r'^https?://(www\.)?'), ''), () => launchUrl(Uri.parse(g.website), mode: LaunchMode.externalApplication)),
    ];
    if (rows.isEmpty) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Column(children: [
            for (final (icon, label, value, onTap) in rows)
              ListTile(
                dense: true,
                leading: Icon(icon, color: Brand.goldDark),
                title: Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                subtitle: Text(value, style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: onTap != null ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurface)),
                onTap: onTap,
              ),
          ]),
        ),
      ),
    );
  }
}
