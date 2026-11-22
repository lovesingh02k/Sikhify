import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../models.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/settings.dart';
import '../theme.dart';
import '../widgets/reading_settings.dart';

/// Learn Sikhism: topics as courses (each a set of lessons), filtered by category.
class LearnScreen extends StatefulWidget {
  const LearnScreen({super.key});

  @override
  State<LearnScreen> createState() => _LearnScreenState();
}

class _LearnScreenState extends State<LearnScreen> {
  String _filter = 'All';
  String _query = '';
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    final lib = Library.instance;
    final cats = lib.learnCategories.where((c) => lib.lessonsIn(c).isNotEmpty).toList();
    final shown = _filter == 'All' ? cats : [_filter];
    final q = _query.toLowerCase();
    final hits = q.isEmpty ? <Lesson>[] : lib.lessons.map(I18n.instance.lesson).where((l) => '${l.title} ${l.summary} ${l.category}'.toLowerCase().contains(q)).toList();
    // Lessons named after the search come first (stable: same order otherwise).
    int rank(Lesson l) => l.title.toLowerCase().startsWith(q) ? 0 : l.title.toLowerCase().contains(q) ? 1 : 2;
    final order = {for (final (i, l) in hits.indexed) l: i};
    hits.sort((a, b) => rank(a) != rank(b) ? rank(a) - rank(b) : order[a]! - order[b]!);
    return Scaffold(
      appBar: AppBar(
        title: _searching
            ? TextField(autofocus: true, decoration: InputDecoration(hintText: tr('Search lessons'), border: InputBorder.none), onChanged: (v) => setState(() => _query = v))
            : Text(tr('Learn')),
        actions: [
          IconButton(
            tooltip: _searching ? 'Close search' : 'Search lessons',
            icon: Icon(_searching ? Icons.close_rounded : Icons.search_rounded, size: 28),
            onPressed: () => setState(() { _searching = !_searching; _query = ''; }),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        if (q.isNotEmpty) ...[
          if (hits.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('No lessons match.', textAlign: TextAlign.center)),
          for (final l in hits) LessonTile(lesson: l),
        ] else ...[
          SizedBox(
            height: 40,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              for (final c in ['All', ...cats])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(label: Text(tr(c)), selected: _filter == c, showCheckmark: false, onSelected: (_) => setState(() => _filter = c)),
                ),
            ]),
          ),
          const SizedBox(height: 14),
          for (final c in shown) Padding(padding: const EdgeInsets.only(bottom: 12), child: _CourseCard(category: c)),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.fromLTRB(20, 18, 16, 18),
            decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(20)),
            child: Row(children: [
              Expanded(child: Text(tr('Learn. Grow. Connect.\nWith Sikhify'), style: const TextStyle(color: Colors.white, fontSize: 17, height: 1.4, fontWeight: FontWeight.w700))),
              Image.asset('assets/images/khanda.png', width: 54, height: 54),
            ]),
          ),
        ],
      ]),
    );
  }
}

/// A topic as a course: its painting, lesson count and reading time.
class _CourseCard extends StatelessWidget {
  const _CourseCard({required this.category});
  final String category;

  static const _titles = {
    'Basics': 'Introduction to Sikhism',
    'Gurus': 'The Ten Guru Sahibs',
    'Concepts': 'Core Concepts',
    'Practices': 'Sikh Practices',
    'Five Ks': 'The Five Ks',
    'Sikh History': 'Sikh History',
  };

  @override
  Widget build(BuildContext context) {
    final lessons = Library.instance.lessonsIn(category).map(I18n.instance.lesson).toList();
    final title = I18n.instance.learnSection(category)?.$1 ?? _titles[category] ?? category;
    final minutes = lessons.fold<int>(0, (n, l) => n + l.minutes);
    final read = Settings.instance.lessonsRead.where((id) => lessons.any((l) => l.id == id)).length;
    final time = minutes >= 60 ? '${minutes ~/ 60}h ${minutes % 60}m' : '$minutes ${tr('min')}';
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => CourseScreen(category: category, title: title))),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            Pic(Library.artFor(category), width: 92, height: 76, radius: 12),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text('${lessons.length} ${tr('Lessons')} · $time', style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                if (read > 0) ...[
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(value: read / lessons.length, minHeight: 5, color: Brand.gold, backgroundColor: Brand.sand),
                  ),
                ],
              ]),
            ),
            const Icon(Icons.chevron_right_rounded, size: 28),
          ]),
        ),
      ),
    );
  }
}

/// The lessons of one topic, in order.
class CourseScreen extends StatelessWidget {
  const CourseScreen({super.key, required this.category, required this.title});
  final String category, title;

  @override
  Widget build(BuildContext context) {
    final lessons = Library.instance.lessonsIn(category).map(I18n.instance.lesson).toList();
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: ListenableBuilder(
        listenable: Settings.instance,
        builder: (context, _) => ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
          Pic(Library.artFor(category), height: 170, radius: 20, width: double.infinity),
          const SizedBox(height: 16),
          for (var i = 0; i < lessons.length; i++) LessonTile(lesson: lessons[i], number: i + 1),
        ]),
      ),
    );
  }
}

class LessonTile extends StatelessWidget {
  const LessonTile({super.key, required this.lesson, this.number});
  final Lesson lesson;
  final int? number;

  @override
  Widget build(BuildContext context) {
    final read = Settings.instance.lessonsRead.contains(lesson.id);
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: ListTile(
          contentPadding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
          leading: CircleAvatar(
            backgroundColor: read ? Brand.gold : Brand.sand,
            foregroundColor: Brand.navy,
            child: read ? const Icon(Icons.check_rounded) : Text(number != null ? '$number' : lesson.category.characters.first, style: const TextStyle(fontWeight: FontWeight.w800)),
          ),
          title: Text(lesson.title, style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text('${lesson.minutes} ${tr('min')} · ${lesson.summary}', maxLines: 2, overflow: TextOverflow.ellipsis),
          onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => LessonScreen(lesson: lesson))),
        ),
      ),
    );
  }
}

/// Reads one lesson; it becomes "Continue Learning" on Home and is ticked when finished.
class LessonScreen extends StatefulWidget {
  const LessonScreen({super.key, required this.lesson});
  final Lesson lesson;

  @override
  State<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends State<LessonScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => Settings.instance.lastLesson = widget.lesson.id);
  }

  @override
  Widget build(BuildContext context) {
    final l = I18n.instance.lesson(widget.lesson);
    final s = Settings.instance;
    final lessons = Library.instance.lessonsIn(l.category);
    final i = lessons.indexWhere((x) => x.id == l.id);
    final next = i >= 0 && i + 1 < lessons.length ? I18n.instance.lesson(lessons[i + 1]) : null;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Scaffold(
      body: ListenableBuilder(
        listenable: s,
        builder: (context, _) {
          final scale = s.fontScale;
          final body = TextStyle(fontSize: 16 * scale, height: 1.65, color: Theme.of(context).colorScheme.onSurface);
          return CustomScrollView(slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 230,
              foregroundColor: Colors.white,
              backgroundColor: Brand.navy,
              actions: [
                IconButton(
                  tooltip: 'Bookmark',
                  icon: Icon(s.isBookmarked('lesson', l.id) ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
                  onPressed: () => s.toggleBookmark(Bookmark('lesson', l.id, l.title, l.category)),
                ),
                IconButton(tooltip: 'Share', icon: const Icon(Icons.share_outlined), onPressed: () => SharePlus.instance.share(ShareParams(text: '${l.title} — ${l.summary}\n\nLearn more on Sikhify: https://www.sikhify.in/learn-sikhism'))),
                IconButton(tooltip: 'Text size', icon: const Icon(Icons.text_fields_rounded), onPressed: () => showReadingSettings(context)),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Stack(fit: StackFit.expand, children: [
                  Pic(Library.artFor(l.category, l.id), radius: 0),
                  const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x660B1A33), Color(0xE60B1A33)]))),
                  Positioned(
                    left: 20, right: 20, bottom: 18,
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${tr(l.category).toUpperCase()} · ${l.minutes} ${tr('MIN READ')}', style: const TextStyle(color: Brand.gold, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 0.8)),
                      const SizedBox(height: 6),
                      Text(l.title, style: serif(28, color: Colors.white)),
                      if (l.gurmukhi != null && l.gurmukhi!.isNotEmpty) Text(l.gurmukhi!, style: const TextStyle(color: Colors.white70, fontSize: 17)),
                    ]),
                  ),
                ]),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
              sliver: SliverList.list(children: [
                Text(l.summary, style: body.copyWith(fontSize: 17 * scale, fontWeight: FontWeight.w600)),
                for (final sec in l.sections) ...[
                  const SizedBox(height: 18),
                  if (sec.heading.isNotEmpty) Text(sec.heading, style: TextStyle(fontSize: 19 * scale, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary)),
                  for (final p in sec.paragraphs) Padding(padding: const EdgeInsets.only(top: 8), child: Text(p, style: body)),
                  for (final item in sec.list)
                    Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Padding(padding: EdgeInsets.only(top: 9 * scale), child: Container(width: 6, height: 6, decoration: const BoxDecoration(color: Brand.gold, shape: BoxShape.circle))),
                        const SizedBox(width: 10),
                        Expanded(child: Text(item, style: body)),
                      ]),
                    ),
                ],
                const SizedBox(height: 28),
                s.lessonsRead.contains(l.id)
                    ? Row(children: [const Icon(Icons.check_circle_rounded, color: Brand.goldDark), const SizedBox(width: 8), Text(tr('Lesson complete'), style: TextStyle(color: muted, fontWeight: FontWeight.w700))])
                    : FilledButton.icon(
                        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
                        onPressed: () => s.markLessonRead(l.id),
                        icon: const Icon(Icons.check_rounded),
                        label: Text(tr('Mark as complete')),
                      ),
                if (next != null) ...[
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                    onPressed: () {
                      s.markLessonRead(l.id);
                      Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => LessonScreen(lesson: next)));
                    },
                    icon: const Icon(Icons.arrow_forward_rounded),
                    label: Text('${tr('Next')}: ${next.title}', maxLines: 1, overflow: TextOverflow.ellipsis),
                  ),
                ],
              ]),
            ),
          ]);
        },
      ),
    );
  }
}
