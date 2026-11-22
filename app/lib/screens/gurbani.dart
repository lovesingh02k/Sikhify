import 'package:flutter/material.dart';

import '../models.dart';
import '../services/banidb.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/settings.dart';
import '../theme.dart';
import '../widgets/gurbani_view.dart';
import 'hukamnama.dart';
import 'nitnem.dart';
import 'reader.dart';

/// Gurbani: Sri Guru Granth Sahib Ji at the top, then Nitnem and every Bani; search from the top bar.
class GurbaniScreen extends StatelessWidget {
  const GurbaniScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lib = Library.instance;
    void open(Widget w) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => w));
    // Nitnem first, then the most-read Banis, then the rest of the library.
    const order = ['sukhmani-sahib', 'japji-sahib', 'anand-sahib', 'asa-di-vaar', 'rehras-sahib', 'jaap-sahib', 'sohila-sahib', 'benti-chaupai', 'tav-prasad-savaiye'];
    final banis = [...lib.banis]..sort((a, b) {
        final ia = order.indexOf(a.id), ib = order.indexOf(b.id);
        return (ia < 0 ? 99 : ia).compareTo(ib < 0 ? 99 : ib);
      });
    return Scaffold(
      appBar: AppBar(
        title: Text(tr('Gurbani')),
        actions: [IconButton(tooltip: tr('Search Gurbani'), icon: const Icon(Icons.search_rounded, size: 28), onPressed: () => open(const GurbaniSearchScreen()))],
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        Stack(children: [
          const Pic('assets/images/folio.webp', radius: 20, height: 170, width: double.infinity, alignment: Alignment(0, -0.2)),
          Positioned(
            left: 0, right: 0, bottom: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 30, 16, 14),
              decoration: const BoxDecoration(
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x000B1A33), Color(0xCC0B1A33)]),
              ),
              child: const Text('ਸ੍ਰੀ ਗੁਰੂ ਗ੍ਰੰਥ ਸਾਹਿਬ ਜੀ', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700)),
            ),
          ),
        ]),
        const SizedBox(height: 14),
        _Row(title: tr('Nitnem'), subtitle: tr('Morning, evening and night Banis'), onTap: () => open(const NitnemScreen())),
        _Row(title: tr('Hukamnama'), subtitle: tr('Today from Sri Harmandir Sahib'), onTap: () => open(const HukamnamaScreen(embedded: false))),
        for (final b in banis)
          _Row(title: b.name, gurmukhi: b.gurmukhiName, subtitle: [if (b.nitnem) 'Offline', if (b.audio != null) 'Audio ${b.audio!.duration ?? ''}'.trim()].join(' · '), onTap: () => open(BaniReader(bani: b))),
        _Row(title: tr('Popular Shabads'), subtitle: '${lib.shabads.length} Shabads with meanings', onTap: () => open(const GurbaniSearchScreen(initialTab: 2))),
        _Row(title: tr('Read an Ang'), subtitle: tr('Any of the 1430 Angs'), onTap: () => open(const GurbaniSearchScreen(initialTab: 1))),
      ]),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.title, this.gurmukhi, this.subtitle = '', required this.onTap});
  final String title;
  final String? gurmukhi;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Material(
          color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF16233F) : Brand.sand,
          borderRadius: BorderRadius.circular(16),
          child: InkWell(
            borderRadius: BorderRadius.circular(16),
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: Row(children: [
                const KhandaBadge(size: 44),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                    if (gurmukhi != null && gurmukhi!.isNotEmpty || subtitle.isNotEmpty)
                      Text([if (gurmukhi != null && gurmukhi!.isNotEmpty) gurmukhi!, if (subtitle.isNotEmpty) subtitle].join(' · '),
                          maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  ]),
                ),
                const Icon(Icons.chevron_right_rounded),
              ]),
            ),
          ),
        ),
      );
}

/// Search, Ang and popular Shabads (from the Gurbani search button).
class GurbaniSearchScreen extends StatelessWidget {
  const GurbaniSearchScreen({super.key, this.initialTab = 0});
  final int initialTab;

  @override
  Widget build(BuildContext context) => DefaultTabController(
        length: 3,
        initialIndex: initialTab,
        child: Scaffold(
          appBar: AppBar(
            title: Text(tr('Search Gurbani')),
            bottom: TabBar(
              indicatorColor: Brand.gold,
              labelColor: Theme.of(context).colorScheme.primary,
              onTap: (_) => FocusManager.instance.primaryFocus?.unfocus(),
              tabs: [Tab(text: tr('Search')), Tab(text: tr('Ang')), Tab(text: tr('Shabads'))],
            ),
          ),
          body: const TabBarView(children: [SearchTab(), AngTab(), _Shabads()]),
        ),
      );
}

class _Shabads extends StatelessWidget {
  const _Shabads();

  @override
  Widget build(BuildContext context) {
    final shabads = Library.instance.shabads;
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      itemCount: shabads.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final s = shabads[i];
        return Card(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            title: Text(s.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            subtitle: Text([s.subtitle, if (s.ang != null) 'Ang ${s.ang}'].whereType<String>().where((x) => x.isNotEmpty).join(' · ')),
            trailing: s.audio != null ? const Icon(Icons.headphones_rounded, color: Brand.goldDark) : const Icon(Icons.chevron_right),
            onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ShabadReader(title: s.title, load: () async => s))),
          ),
        );
      },
    );
  }
}

/// Search Sri Guru Granth Sahib Ji (BaniDB).
class SearchTab extends StatefulWidget {
  const SearchTab({super.key});

  @override
  State<SearchTab> createState() => _SearchTabState();
}

class _SearchTabState extends State<SearchTab> {
  static const _modes = [
    (0, 'First letters', 'e.g. snk or ਸਨਕ for “ਸਾਚੇ ਨਾਮ ਕੀ…”'),
    (2, 'Gurmukhi words', 'e.g. ਸਚੁ'),
    (3, 'English meaning', 'e.g. truth'),
  ];
  final _q = TextEditingController();
  int _mode = 0;
  Future<List<SearchHit>>? _results;

  void _search() {
    final q = _q.text.trim();
    if (q.isEmpty) return;
    FocusScope.of(context).unfocus();
    // Whole words are matched in Gurmukhi only; Latin letters there would never match.
    if (_mode == 2 && !RegExp('[਀-੿]').hasMatch(q)) {
      setState(() => _results = Future.error(_LatinWords()));
      return;
    }
    setState(() => _results = BaniDb.instance.search(q, _mode));
  }

  @override
  void dispose() {
    _q.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mode = _modes.firstWhere((m) => m.$1 == _mode);
    return Column(children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: TextField(
          controller: _q,
          autofocus: true,
          textInputAction: TextInputAction.search,
          onSubmitted: (_) => _search(),
          decoration: InputDecoration(
            hintText: mode.$3,
            prefixIcon: const Icon(Icons.search),
            suffixIcon: IconButton(icon: const Icon(Icons.arrow_forward), onPressed: _search, tooltip: 'Search'),
            filled: true,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide.none),
          ),
        ),
      ),
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Row(children: [
          for (final m in _modes)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(label: Text(m.$2), selected: _mode == m.$1, onSelected: (_) => setState(() => _mode = m.$1)),
            ),
        ]),
      ),
      Expanded(
        child: _results == null
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text('Search all of Sri Guru Granth Sahib Ji by the first letters of each word, by Gurmukhi words, or by English meaning.',
                      textAlign: TextAlign.center, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ),
              )
            : FutureBuilder<List<SearchHit>>(
                future: _results,
                builder: (context, snap) {
                  if (snap.error is _LatinWords) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text('Type Gurmukhi words with a Gurmukhi keyboard (e.g. ਸਚੁ).\nWith English letters, use “First letters” (e.g. snk) or “English meaning”.', textAlign: TextAlign.center),
                      ),
                    );
                  }
                  if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: _search);
                  if (!snap.hasData) return const Center(child: CircularProgressIndicator());
                  final hits = snap.data!;
                  if (hits.isEmpty) return const Center(child: Text('No lines found. Try fewer letters or another search type.'));
                  return ListView.separated(
                    padding: const EdgeInsets.fromLTRB(16, 4, 16, 32),
                    itemCount: hits.length,
                    separatorBuilder: (_, _) => const Divider(height: 1),
                    itemBuilder: (context, i) {
                      final h = hits[i];
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(vertical: 4),
                        title: Text(h.line.gurmukhi, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, height: 1.5)),
                        subtitle: Text([h.line.english, [if (h.ang != null) 'Ang ${h.ang}', if (h.writer != null) h.writer!].join(' · ')].whereType<String>().where((x) => x.isNotEmpty).join('\n')),
                        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ShabadReader(title: 'Shabad', load: () => BaniDb.instance.shabad(h.shabadId), bookmark: Bookmark('shabad', '${h.shabadId}', h.line.gurmukhi, [if (h.ang != null) 'Ang ${h.ang}', ?h.writer].join(' · '))))),
                      );
                    },
                  );
                },
              ),
      ),
    ]);
  }
}

/// Open any Ang (page) of Sri Guru Granth Sahib Ji.
class AngTab extends StatefulWidget {
  const AngTab({super.key});

  @override
  State<AngTab> createState() => _AngTabState();
}

class _AngTabState extends State<AngTab> {
  final _n = TextEditingController();
  String? _error;

  void openAng(BuildContext context, int n, {bool replace = false}) {
    final route = MaterialPageRoute<void>(
      builder: (_) => ShabadReader(title: 'Ang $n', load: () => BaniDb.instance.ang(n), navigateAng: (next) => openAng(context, next, replace: true), bookmark: Bookmark('ang', '$n', 'Ang $n', 'Sri Guru Granth Sahib Ji')),
    );
    replace ? Navigator.of(context).pushReplacement(route) : Navigator.of(context).push(route);
  }

  void _go() {
    final n = int.tryParse(_n.text.trim());
    if (n == null || n < 1 || n > 1430) {
      setState(() => _error = 'Enter an Ang from 1 to 1430');
      return;
    }
    setState(() => _error = null);
    FocusScope.of(context).unfocus();
    openAng(context, n);
  }

  @override
  void dispose() {
    _n.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Read an Ang', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Sri Guru Granth Sahib Ji has 1430 Angs. Angs you open stay on the phone for offline reading.',
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 14),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _n,
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.go,
                  onSubmitted: (_) => _go(),
                  decoration: InputDecoration(labelText: 'Ang number', errorText: _error, border: const OutlineInputBorder()),
                ),
              ),
              const SizedBox(width: 10),
              FilledButton(onPressed: _go, child: const Text('Open')),
            ]),
          ]),
        ),
      ),
      const SizedBox(height: 14),
      Wrap(spacing: 8, runSpacing: 8, children: [
        for (final (n, label) in const [(1, 'Ang 1 · Japji Sahib'), (8, 'Ang 8 · So Dar'), (262, 'Ang 262 · Sukhmani Sahib'), (917, 'Ang 917 · Anand Sahib'), (1429, 'Ang 1429 · Mundavani')])
          ActionChip(label: Text(label), onPressed: () => openAng(context, n)),
      ]),
    ]);
  }
}

/// A Gurmukhi-words search typed in Latin letters.
class _LatinWords implements Exception {}
