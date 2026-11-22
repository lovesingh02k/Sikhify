import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/i18n.dart';
import '../services/site_api.dart';
import '../theme.dart';
import '../widgets/gurbani_view.dart';
import 'contribute.dart';

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
String shortDate(DateTime d) => '${_months[d.month - 1]} ${d.day}, ${d.year}';

String _when(Festival f) {
  if (f.start == null) return 'Date to be announced';
  final parts = [shortDate(f.start!), if (f.nanakshahi != null && f.nanakshahi!.isNotEmpty) f.nanakshahi!];
  return parts.join(' • ');
}

String _picture(Festival f, int i) => f.guruArt ?? (i.isEven ? 'assets/images/golden_temple.webp' : 'assets/images/harmandir.webp');

/// Gurpurabs and important days: the next one large, then the calendar (dates checked by Sikhify).
class FestivalsScreen extends StatefulWidget {
  const FestivalsScreen({super.key});

  @override
  State<FestivalsScreen> createState() => _FestivalsScreenState();
}

class _FestivalsScreenState extends State<FestivalsScreen> {
  late Future<List<Festival>> _all = SiteApi.instance.allFestivals();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tr('Festivals'))),
      body: FutureBuilder<List<Festival>>(
        future: _all,
        builder: (context, snap) {
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _all = SiteApi.instance.allFestivals()));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final today = DateTime.now();
          final list = snap.data!.where((f) => f.start == null || !f.start!.isBefore(DateTime(today.year, today.month, today.day))).toList();
          if (list.isEmpty) return const Center(child: Text('No dates in the calendar yet.'));
          final next = list.first;
          return ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
            FestivalHero(festival: next),
            const SizedBox(height: 22),
            Text(tr('Festival Calendar'), style: sectionTitle(context)),
            const SizedBox(height: 10),
            for (final (i, f) in list.skip(1).indexed) Padding(padding: const EdgeInsets.only(bottom: 10), child: FestivalRow(festival: f, picture: _picture(f, i))),
          ]);
        },
      ),
    );
  }
}

class FestivalHero extends StatelessWidget {
  const FestivalHero({super.key, required this.festival});
  final Festival festival;

  @override
  Widget build(BuildContext context) {
    final f = festival;
    return GestureDetector(
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => FestivalScreen(festival: f))),
      child: Container(
        height: 190,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(22),
          gradient: const LinearGradient(colors: [Color(0xFF3A2410), Color(0xFF8A5A1E), Color(0xFFD9A04A)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: Stack(children: [
          Positioned(
            right: 0, top: 0, bottom: 0, width: 150,
            child: ShaderMask(
              shaderCallback: (r) => const LinearGradient(colors: [Colors.transparent, Colors.black], stops: [0, 0.35]).createShader(r),
              blendMode: BlendMode.dstIn,
              child: Image.asset(f.guruArt ?? 'assets/images/golden_temple.webp', fit: BoxFit.cover),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 18, 150, 18),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (f.daysUntil != null)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                  decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(20)),
                  child: Text(f.daysUntil == 0 ? 'Today' : 'In ${f.daysUntil} day${f.daysUntil == 1 ? '' : 's'}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              const SizedBox(height: 8),
              Text(f.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 21, height: 1.2, fontWeight: FontWeight.w800)),
              const Spacer(),
              if (f.start != null) Text(shortDate(f.start!), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w600)),
              if (f.nanakshahi != null && f.nanakshahi!.isNotEmpty) Text(f.nanakshahi!, style: const TextStyle(color: Colors.white70, fontSize: 15)),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// A festival in a list: its date and Nanakshahi date, with a picture.
class FestivalRow extends StatelessWidget {
  const FestivalRow({super.key, required this.festival, this.picture});
  final Festival festival;
  final String? picture;

  @override
  Widget build(BuildContext context) {
    final f = festival;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => FestivalScreen(festival: f))),
        child: Row(children: [
          if (picture != null)
            Pic(picture!, radius: 0, width: 86, height: 76)
          else
            Container(
              width: 56, height: 76,
              alignment: Alignment.center,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Brand.gold.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.calendar_month_rounded, color: Brand.goldDark),
              ),
            ),
          const SizedBox(width: 12),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(f.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 3),
                Text(_when(f), style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ]),
            ),
          ),
          if (picture == null) ...[
            const SizedBox(width: 8),
            Pic(f.guruArt ?? 'assets/images/harmandir.webp', radius: 12, width: 64, height: 56),
            const SizedBox(width: 10),
          ] else
            const Padding(padding: EdgeInsets.only(right: 8), child: Icon(Icons.chevron_right_rounded)),
        ]),
      ),
    );
  }
}

class FestivalScreen extends StatefulWidget {
  const FestivalScreen({super.key, required this.festival});
  final Festival festival;

  @override
  State<FestivalScreen> createState() => _FestivalScreenState();
}

class _FestivalScreenState extends State<FestivalScreen> {
  late final Future<Festival> _full = SiteApi.instance.festival(widget.festival.slug);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Festival')),
      body: FutureBuilder<Festival>(
        future: _full,
        builder: (context, snap) {
          final f = snap.data ?? widget.festival;
          final muted = Theme.of(context).colorScheme.onSurfaceVariant;
          return ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
            FestivalHero(festival: f.start != null ? f : widget.festival),
            const SizedBox(height: 18),
            if (snap.connectionState == ConnectionState.waiting) const LinearProgressIndicator(color: Brand.gold),
            if (f.summary.isNotEmpty) Text(f.summary, style: const TextStyle(fontSize: 17, height: 1.5, fontWeight: FontWeight.w600)),
            if (f.description.isNotEmpty) ...[const SizedBox(height: 12), Text(f.description, style: const TextStyle(fontSize: 15, height: 1.6))],
            if (f.significance.isNotEmpty) ...[
              const SizedBox(height: 18),
              Text(tr('Significance'), style: sectionTitle(context)),
              const SizedBox(height: 6),
              Text(f.significance, style: const TextStyle(fontSize: 15, height: 1.6)),
            ],
            const SizedBox(height: 18),
            Text('Dates follow the Nanakshahi calendar where it applies, as checked by Sikhify.', style: TextStyle(fontSize: 12, color: muted)),
            TextButton.icon(
              onPressed: () => launchUrl(Uri.parse('${SiteApi.base}/festivals/${f.slug}'), mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: const Text('More on sikhify.in'),
            ),
            TextButton.icon(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ReportScreen(targetUrl: '${SiteApi.base}/festivals/${f.slug}', targetName: f.title))),
              icon: const Icon(Icons.flag_outlined, size: 18),
              label: Text(tr('Report a mistake')),
            ),
          ]);
        },
      ),
    );
  }
}
