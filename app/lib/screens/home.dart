import 'package:flutter/material.dart';

import '../models.dart';
import '../services/banidb.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/settings.dart';
import '../services/site_api.dart';
import '../theme.dart';
import '../widgets/home_banners.dart';
import 'contribute.dart';
import 'explore.dart';
import 'festivals.dart';
import 'gurbani.dart';
import 'gurdwaras.dart';
import 'hukamnama.dart';
import 'learn.dart';
import 'nitnem.dart';
import 'profile.dart';
import 'quiz.dart';
import 'reader.dart';
import 'store.dart';

void push(BuildContext context, Widget screen) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));

/// Home: the Fateh, today's Hukamnama, quick access, the lesson to continue, Nitnem and festivals.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.openTab});

  /// Switches the bottom navigation: 1 Learn, 2 Media, 3 Profile.
  final ValueChanged<int> openTab;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late Future<Hukamnama> _h = BaniDb.instance.hukamnama(BaniDb.todayInIndia());
  late Future<List<Festival>> _festivals = SiteApi.instance.upcomingFestivals();
  late Future<List<HomeBanner>> _banners = SiteApi.instance.homeBanners();
  late Future<List<Entry>> _events = SiteApi.instance.upcomingEvents();

  Future<void> _refresh() async => setState(() {
        _h = BaniDb.instance.hukamnama(BaniDb.todayInIndia());
        _festivals = SiteApi.instance.upcomingFestivals();
        _banners = SiteApi.instance.homeBanners();
        _events = SiteApi.instance.upcomingEvents();
      });

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _refresh,
          child: ListView(padding: const EdgeInsets.fromLTRB(18, 10, 18, 24), children: [
            Row(children: [
              Image.asset('assets/images/khanda.png', width: 34, height: 34),
              const SizedBox(width: 8),
              Text('Sikhify', style: serif(30, color: Theme.of(context).colorScheme.onSurface)),
              const Spacer(),
              IconButton(tooltip: 'Reminders', icon: const Icon(Icons.notifications_none_rounded, size: 28), onPressed: () => push(context, const RemindersScreen())),
              GestureDetector(
                onTap: () => widget.openTab(3),
                child: ListenableBuilder(listenable: s, builder: (context, _) => Avatar(name: s.name, size: 40)),
              ),
            ]),
            const SizedBox(height: 14),
            Text('Waheguru Ji Ka Khalsa\nWaheguru Ji Ki Fateh 🙏', style: TextStyle(fontSize: 19, height: 1.35, fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.onSurface)),
            const SizedBox(height: 16),
            HomeBanners(future: _banners),
            _HukamnamaCard(future: _h),
            const SizedBox(height: 22),
            _SectionHeader(title: tr('Quick Access'), action: tr('See All'), onAction: () => push(context, QuickAccessScreen(openTab: widget.openTab))),
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: QuickTile(icon: Icons.menu_book_rounded, label: tr('Learn'), onTap: () => widget.openTab(1))),
              const SizedBox(width: 10),
              Expanded(child: QuickTile(icon: Icons.auto_stories_rounded, label: tr('Gurbani'), onTap: () => push(context, const GurbaniScreen()))),
              const SizedBox(width: 10),
              Expanded(child: QuickTile(icon: Icons.play_circle_fill_rounded, label: tr('Media'), onTap: () => widget.openTab(2))),
              const SizedBox(width: 10),
              Expanded(child: QuickTile(iconWidget: const GurdwaraIcon(size: 34), label: tr('Gurdwaras'), onTap: () => push(context, const GurdwarasScreen()))),
            ]),
            const SizedBox(height: 14),
            const _ExploreStrip(),
            const SizedBox(height: 22),
            FutureBuilder<List<Entry>>(
              future: _events,
              builder: (context, snap) {
                final list = snap.data ?? const <Entry>[];
                if (list.isEmpty) return const SizedBox.shrink();
                return Padding(
                  padding: const EdgeInsets.only(bottom: 22),
                  child: Column(children: [
                    _SectionHeader(title: tr('Upcoming Events'), action: tr('See All'), onAction: () => push(context, const EntryListScreen(typeKey: 'event'))),
                    const SizedBox(height: 10),
                    for (final e in list) Padding(padding: const EdgeInsets.only(bottom: 10), child: EventRow(event: e)),
                  ]),
                );
              },
            ),
            const _NitnemStrip(),
            const SizedBox(height: 14),
            const DailyQuizCard(),
            const SizedBox(height: 22),
            _SectionHeader(title: tr('Continue Learning'), action: tr('Continue'), onAction: () => _openLesson(context)),
            const SizedBox(height: 10),
            ListenableBuilder(listenable: s, builder: (context, _) => _ContinueCard(onTap: () => _openLesson(context))),
            const SizedBox(height: 22),
            _SectionHeader(title: tr('Upcoming Festivals'), action: tr('See All'), onAction: () => push(context, const FestivalsScreen())),
            const SizedBox(height: 10),
            FutureBuilder<List<Festival>>(
              future: _festivals,
              builder: (context, snap) {
                if (snap.hasError) return const Text('Festivals couldn’t load. Pull down to try again.');
                if (!snap.hasData) return const LinearProgressIndicator(color: Brand.gold);
                final list = snap.data!.take(3).toList();
                if (list.isEmpty) return const Text('No festivals in the next weeks.');
                return Column(children: [
                  for (final f in list) Padding(padding: const EdgeInsets.only(bottom: 10), child: FestivalRow(festival: f)),
                ]);
              },
            ),
          ]),
        ),
      ),
    );
  }

  void _openLesson(BuildContext context) {
    final lib = Library.instance;
    final lesson = lib.lesson(Settings.instance.lastLesson ?? '') ?? lib.lessons.first;
    push(context, LessonScreen(lesson: lesson));
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.action, this.onAction});
  final String title;
  final String? action;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) => Row(children: [
        Text(title, style: sectionTitle(context)),
        const Spacer(),
        if (action != null)
          InkWell(
            onTap: onAction,
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(children: [
                Text(action!, style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
                const SizedBox(width: 4),
                Icon(Icons.arrow_forward_rounded, size: 18, color: Theme.of(context).colorScheme.primary),
              ]),
            ),
          ),
      ]);
}

/// The person's initial in a navy circle (or the Khanda before a name is set).
class Avatar extends StatelessWidget {
  const Avatar({super.key, required this.name, this.size = 40});
  final String name;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(color: Brand.navy, shape: BoxShape.circle, border: Border.all(color: Brand.gold, width: 2)),
        alignment: Alignment.center,
        padding: EdgeInsets.all(name.isEmpty ? size * 0.2 : 0),
        child: name.isEmpty
            ? Image.asset('assets/images/khanda.png')
            : Text(name.characters.first.toUpperCase(), style: TextStyle(color: Brand.gold, fontWeight: FontWeight.w800, fontSize: size * 0.42)),
      );
}

class QuickTile extends StatelessWidget {
  const QuickTile({super.key, this.icon, this.iconWidget, required this.label, required this.onTap});
  final IconData? icon;
  final Widget? iconWidget;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
              IconTheme(data: IconThemeData(color: Theme.of(context).colorScheme.primary), child: iconWidget ?? Icon(icon, size: 34)),
              const SizedBox(height: 8),
              Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
            ]),
          ),
        ),
      );
}

class _HukamnamaCard extends StatelessWidget {
  const _HukamnamaCard({required this.future});
  final Future<Hukamnama> future;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => push(context, const HukamnamaScreen(embedded: false)),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: SizedBox(
          height: 178,
          child: Stack(fit: StackFit.expand, children: [
            Image.asset('assets/images/golden_temple.webp', fit: BoxFit.cover, alignment: const Alignment(0.6, 0)),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: [Color(0xF00B1A33), Color(0xB313274A), Color(0x0013274A)], stops: [0, 0.48, 0.85]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
              child: FutureBuilder<Hukamnama>(
                future: future,
                builder: (context, snap) {
                  final h = snap.data;
                  final today = h == null || h.date == BaniDb.todayInIndia();
                  return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    // One line always: on narrow phones or with large text it shrinks instead of breaking ("Hukamnam / a").
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(tr(today ? 'Daily Hukamnama' : 'Latest Hukamnama'), maxLines: 1, softWrap: false,
                          style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800)),
                    ),
                    const SizedBox(height: 2),
                    Text(h != null ? '${tr('Sri Harmandir Sahib')} · ${longDate(h.date)}' : tr('Sri Harmandir Sahib'),
                        maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white70)),
                    const SizedBox(height: 8),
                    if (h != null && h.opening.isNotEmpty)
                      SizedBox(
                        width: 220,
                        child: Text(h.opening.first.gurmukhi, maxLines: 2, overflow: TextOverflow.ellipsis,
                            style: const TextStyle(color: Colors.white, fontSize: 15, height: 1.4, fontWeight: FontWeight.w600)),
                      ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(22)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        Text(tr('Read Today'), style: const TextStyle(color: Brand.navy, fontWeight: FontWeight.w800)),
                        const SizedBox(width: 6),
                        const Icon(Icons.arrow_forward_rounded, color: Brand.navy, size: 18),
                      ]),
                    ),
                  ]);
                },
              ),
            ),
          ]),
        ),
      ),
    );
  }
}

class _NitnemStrip extends StatelessWidget {
  const _NitnemStrip();

  @override
  Widget build(BuildContext context) {
    final lib = Library.instance;
    final s = Settings.instance;
    return ListenableBuilder(
      listenable: s,
      builder: (context, _) {
        final time = lib.timeFor(DateTime.now());
        final banis = time.baniIds.map(lib.bani).whereType<BaniInfo>().toList();
        final done = banis.where((b) => s.isDone(b.id)).length;
        final next = banis.where((b) => !s.isDone(b.id)).firstOrNull;
        return Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => next != null ? push(context, BaniReader(bani: next)) : push(context, const NitnemScreen()),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(children: [
                SizedBox(
                  width: 52, height: 52,
                  child: Stack(alignment: Alignment.center, children: [
                    CircularProgressIndicator(value: banis.isEmpty ? 0 : done / banis.length, strokeWidth: 5, color: Brand.gold, backgroundColor: Brand.sand),
                    Text('$done/${banis.length}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                  ]),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('${tr(time.label)} ${tr('Nitnem')} · ${tr(time.sub)}', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                    const SizedBox(height: 2),
                    Text(next != null ? '${tr('Continue with')} ${next.name}' : tr('Complete for now — Waheguru!'), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  ]),
                ),
                const Icon(Icons.play_circle_fill_rounded, color: Brand.gold, size: 36),
              ]),
            ),
          ),
        );
      },
    );
  }
}

class _ContinueCard extends StatelessWidget {
  const _ContinueCard({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final lib = Library.instance;
    final lesson = I18n.instance.lesson(lib.lesson(Settings.instance.lastLesson ?? '') ?? lib.lessons.first);
    final inCategory = lib.lessonsIn(lesson.category);
    final n = inCategory.indexWhere((l) => l.id == lesson.id) + 1;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Row(children: [
          Pic(Library.artFor(lesson.category, lesson.id), radius: 0, width: 110, height: 86),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(lesson.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
              const SizedBox(height: 4),
              Text('${tr(lesson.category)} · ${tr('Lesson')} $n · ${lesson.minutes} ${tr('min')}', style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ]),
          ),
          const Icon(Icons.chevron_right_rounded),
          const SizedBox(width: 8),
        ]),
      ),
    );
  }
}

/// Every section of the app, from "Quick Access → See All".
class QuickAccessScreen extends StatelessWidget {
  const QuickAccessScreen({super.key, required this.openTab});
  final ValueChanged<int> openTab;

  @override
  Widget build(BuildContext context) {
    void tab(int i) {
      Navigator.of(context).pop();
      openTab(i);
    }
    final items = <(IconData?, String, VoidCallback)>[
      (Icons.wb_sunny_rounded, tr('Hukamnama'), () => push(context, const HukamnamaScreen(embedded: false))),
      (Icons.wb_twilight_rounded, tr('Nitnem'), () => push(context, const NitnemScreen())),
      (Icons.auto_stories_rounded, tr('Gurbani'), () => push(context, const GurbaniScreen())),
      (Icons.search_rounded, tr('Search Gurbani'), () => push(context, const GurbaniSearchScreen())),
      (Icons.menu_book_rounded, tr('Learn'), () => tab(1)),
      (Icons.people_alt_rounded, tr('The Ten Gurus'), () => push(context, const GurusScreen())),
      (Icons.timeline_rounded, tr('Sikh History'), () => push(context, const HistoryScreen())),
      (Icons.gavel_rounded, tr('Rehat Maryada'), () => push(context, const RehatScreen())),
      (Icons.help_outline_rounded, tr('FAQ'), () => push(context, const FaqScreen())),
      (Icons.child_care_rounded, tr('Kids'), () => push(context, const KidsScreen())),
      (Icons.play_circle_fill_rounded, tr('Kirtan & Katha'), () => tab(2)),
      (null, tr('Gurdwaras'), () => push(context, const GurdwarasScreen())),
      (Icons.calendar_month_rounded, tr('Festivals'), () => push(context, const FestivalsScreen())),
      (Icons.event_rounded, tr('Events'), () => push(context, const EntryListScreen(typeKey: 'event'))),
      (Icons.storefront_rounded, tr('Sikh Store'), () => push(context, const StoreScreen())),
      (Icons.folder_special_rounded, tr('Directory'), () => push(context, const DirectoryScreen())),
      (Icons.article_rounded, 'Blog', () => push(context, const EntryListScreen(typeKey: 'blog'))),
      (Icons.download_rounded, 'Downloads', () => push(context, const EntryListScreen(typeKey: 'download'))),
      (Icons.bookmark_rounded, tr('Bookmarks'), () => push(context, const BookmarksScreen())),
      (Icons.offline_pin_rounded, tr('Offline'), () => push(context, const OfflineScreen())),
      (Icons.notifications_rounded, tr('Reminders'), () => push(context, const RemindersScreen())),
      (Icons.volunteer_activism_rounded, tr('Add / Suggest / Report'), () => push(context, const ContributeScreen())),
      (Icons.public_rounded, tr('More from sikhify.in'), () => push(context, const WebsitePagesScreen())),
      (Icons.person_rounded, tr('Profile'), () => tab(3)),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(tr('All sections'))),
      body: GridView.count(
        padding: const EdgeInsets.all(18),
        crossAxisCount: 3,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        children: [for (final (icon, label, onTap) in items) QuickTile(icon: icon, iconWidget: icon == null ? const GurdwaraIcon(size: 34) : null, label: label, onTap: onTap)],
      ),
    );
  }
}

/// The rest of the website's sections, one swipe away on Home.
class _ExploreStrip extends StatelessWidget {
  const _ExploreStrip();

  @override
  Widget build(BuildContext context) {
    final items = <(String, IconData, Widget)>[
      (tr('Sikh Store'), Icons.storefront_rounded, const StoreScreen()),
      (tr('The Ten Gurus'), Icons.people_alt_rounded, const GurusScreen()),
      (tr('Sikh History'), Icons.timeline_rounded, const HistoryScreen()),
      (tr('Kids'), Icons.child_care_rounded, const KidsScreen()),
      (tr('Festivals'), Icons.calendar_month_rounded, const FestivalsScreen()),
      (tr('Events'), Icons.event_rounded, const EntryListScreen(typeKey: 'event')),
      (tr('Rehat Maryada'), Icons.gavel_rounded, const RehatScreen()),
      (tr('FAQ'), Icons.help_outline_rounded, const FaqScreen()),
      (tr('Directory'), Icons.folder_special_rounded, const DirectoryScreen()),
    ];
    return SizedBox(
      height: 40,
      child: ListView(scrollDirection: Axis.horizontal, children: [
        for (final (label, icon, screen) in items)
          Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(avatar: Icon(icon, size: 18, color: Brand.goldDark), label: Text(label), onPressed: () => push(context, screen)),
          ),
      ]),
    );
  }
}
