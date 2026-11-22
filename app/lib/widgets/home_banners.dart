import 'dart:async';

import 'package:flutter/material.dart';

import '../screens/explore.dart' show EntryScreen, openWeb;
import '../screens/festivals.dart' show FestivalScreen;
import '../screens/media.dart' show openVideo;
import '../services/i18n.dart';
import '../services/site_api.dart';
import '../theme.dart';

void _push(BuildContext context, Widget screen) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));

/// The website's homepage banners. Takes no space at all until there is a banner to show.
class HomeBanners extends StatefulWidget {
  const HomeBanners({super.key, required this.future});
  final Future<List<HomeBanner>> future;

  @override
  State<HomeBanners> createState() => _HomeBannersState();
}

class _HomeBannersState extends State<HomeBanners> {
  static const _interval = Duration(seconds: 8);
  final _pages = PageController();
  Timer? _timer;
  int _index = 0, _count = 0;

  /// Several banners move on by themselves, unless the phone is set to reduce motion.
  void _startTimer(int count) {
    if (count == _count) return;
    _count = count;
    _timer?.cancel();
    if (count < 2) return;
    _timer = Timer.periodic(_interval, (_) {
      if (!mounted || !_pages.hasClients || MediaQuery.disableAnimationsOf(context)) return;
      _pages.animateToPage((_index + 1) % _count, duration: const Duration(milliseconds: 450), curve: Curves.easeInOut);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FutureBuilder<List<HomeBanner>>(
        future: widget.future,
        builder: (context, snap) {
          final items = snap.data ?? const <HomeBanner>[];
          if (items.isEmpty) return const SizedBox.shrink();
          _startTimer(items.length);
          final shown = _index.clamp(0, items.length - 1);
          return Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Column(children: [
              AspectRatio(
                aspectRatio: 16 / 9,
                child: PageView.builder(
                  controller: _pages,
                  itemCount: items.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (context, i) => _BannerSlide(banner: items[i]),
                ),
              ),
              if (items.length > 1) ...[
                const SizedBox(height: 8),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  for (var i = 0; i < items.length; i++)
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      margin: const EdgeInsets.symmetric(horizontal: 3),
                      width: i == shown ? 18 : 7,
                      height: 7,
                      decoration: BoxDecoration(color: i == shown ? Brand.gold : Brand.gold.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(4)),
                    ),
                ]),
              ],
            ]),
          );
        },
      );
}

class _BannerSlide extends StatelessWidget {
  const _BannerSlide({required this.banner});
  final HomeBanner banner;

  @override
  Widget build(BuildContext context) {
    final b = banner;
    // An uploaded poster carries its own wording, so nothing is drawn over it.
    final caption = b.imageUrl == null;
    return Semantics(
      button: true,
      label: b.title,
      child: GestureDetector(
        onTap: () => _push(context, BannerScreen(banner: b)),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(20),
          child: Stack(fit: StackFit.expand, children: [
            Pic(b.picture, radius: 0),
            if (caption)
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [Color(0xE60B1A33), Color(0x000B1A33)], stops: [0, 0.7]),
                ),
              ),
            if (caption)
              Positioned(
                left: 16, right: 16, bottom: 14,
                child: Text(b.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: serif(21, color: Colors.white)),
              ),
            if (b.youtubeId != null)
              const Center(
                child: DecoratedBox(
                  decoration: BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                  child: Padding(padding: EdgeInsets.all(10), child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 36)),
                ),
              ),
          ]),
        ),
      ),
    );
  }
}

/// A banner in full: the whole picture, its message and its buttons.
class BannerScreen extends StatelessWidget {
  const BannerScreen({super.key, required this.banner});
  final HomeBanner banner;

  @override
  Widget build(BuildContext context) {
    final b = banner;
    final video = b.youtubeId;
    final festival = b.observance;
    final buttonStyle = FilledButton.styleFrom(minimumSize: const Size.fromHeight(50));
    return Scaffold(
      appBar: AppBar(title: Text(b.title, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
        AspectRatio(aspectRatio: 16 / 9, child: Pic(b.picture, radius: 18)),
        const SizedBox(height: 14),
        Text(b.title, style: serif(24, color: Theme.of(context).colorScheme.onSurface)),
        if (b.description.isNotEmpty) ...[
          const SizedBox(height: 10),
          Text(b.description, style: const TextStyle(fontSize: 16, height: 1.55)),
        ],
        if (video != null) ...[
          const SizedBox(height: 16),
          FilledButton.icon(
            style: buttonStyle,
            onPressed: () => openVideo(context, Video.fromJson({'id': video, 'title': b.title}, artist: b.title)),
            icon: const Icon(Icons.play_arrow_rounded),
            label: Text(tr('Watch video')),
          ),
        ],
        if (b.ctaUrl != null && b.ctaLabel != null) ...[
          const SizedBox(height: 12),
          FilledButton.icon(style: buttonStyle, onPressed: () => openWeb(b.ctaUrl!), icon: const Icon(Icons.open_in_new_rounded), label: Text(b.ctaLabel!)),
        ],
        if (festival != null) ...[
          const SizedBox(height: 12),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
            onPressed: () => _push(context, FestivalScreen(festival: festival)),
            icon: const Icon(Icons.calendar_month_rounded),
            label: Text(tr('Explore this day')),
          ),
        ],
      ]),
    );
  }
}

/// One upcoming event: a date tile, its title, the day and the place.
class EventRow extends StatelessWidget {
  const EventRow({super.key, required this.event});
  final Entry event;

  static const _months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  static const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  /// "Today", "Tomorrow" or "in 6 days".
  static String whenLabel(DateTime date, DateTime now) {
    final days = DateTime.utc(date.year, date.month, date.day).difference(DateTime.utc(now.year, now.month, now.day)).inDays;
    return days <= 0 ? tr('Today') : days == 1 ? tr('Tomorrow') : tr('in {n} days').replaceAll('{n}', '$days');
  }

  @override
  Widget build(BuildContext context) {
    final e = event;
    final d = e.date!;
    final venue = e.fields['venue'];
    final place = [if (venue is String && venue.isNotEmpty) venue, if (e.place.isNotEmpty) e.place].join(', ');
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => _push(context, EntryScreen(entry: e)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(children: [
            Container(
              width: 58, height: 62,
              decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(14)),
              child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                Text('${d.day}', style: const TextStyle(color: Colors.white, fontSize: 22, height: 1.1, fontWeight: FontWeight.w800)),
                Text(_months[d.month - 1], style: const TextStyle(color: Brand.gold, fontSize: 12, fontWeight: FontWeight.w700)),
              ]),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(e.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
                const SizedBox(height: 2),
                Text('${tr(_weekdays[d.weekday - 1])} · ${whenLabel(d, DateTime.now())}', style: const TextStyle(fontSize: 13, color: Brand.goldDark, fontWeight: FontWeight.w600)),
                if (place.isNotEmpty) Text(place, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ]),
            ),
            const Icon(Icons.chevron_right_rounded),
          ]),
        ),
      ),
    );
  }
}
