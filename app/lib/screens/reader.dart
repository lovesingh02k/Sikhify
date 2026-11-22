import 'dart:async';

import 'package:flutter/material.dart';
import 'package:wakelock_plus/wakelock_plus.dart';

import '../models.dart';
import '../services/banidb.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/settings.dart';
import '../widgets/audio_bar.dart';
import '../widgets/gurbani_pages.dart';
import '../widgets/go_to_dialog.dart';
import '../widgets/gurbani_view.dart';
import '../widgets/reading_settings.dart';

/// Reads a Bani: bundled text for Nitnem (offline), BaniDB for the others (kept for offline after).
/// Carries on from where it was left, can play a recitation, and can be ticked off for today.
class BaniReader extends StatefulWidget {
  const BaniReader({super.key, required this.bani});
  final BaniInfo bani;

  @override
  State<BaniReader> createState() => _BaniReaderState();
}

class _BaniReaderState extends State<BaniReader> {
  late Future<List<GurbaniLine>> _lines;
  final _scroll = ScrollController();
  final _pageTurner = GurbaniPagesController();
  bool _restored = false;

  @override
  void initState() {
    super.initState();
    _lines = _load();
    if (Settings.instance.keepAwake) WakelockPlus.enable();
    _scroll.addListener(_remember);
  }

  Future<List<GurbaniLine>> _load() async {
    final bundled = Library.instance.bundledText(widget.bani.id);
    if (bundled != null) return bundled;
    if (widget.bani.baniDbId == null) throw const LoadError('This Bani isn’t available yet.');
    return BaniDb.instance.bani(widget.bani.baniDbId!);
  }

  Timer? _saveTimer;
  void _remember() {
    _saveTimer?.cancel();
    _saveTimer = Timer(const Duration(milliseconds: 400), () {
      if (_scroll.hasClients) Settings.instance.savePosition(widget.bani.id, _scroll.offset);
    });
  }

  void _restore() {
    if (_restored) return;
    _restored = true;
    final at = Settings.instance.position(widget.bani.id);
    if (at <= 0) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scroll.hasClients) _scroll.jumpTo(at.clamp(0, _scroll.position.maxScrollExtent));
    });
  }

  @override
  void dispose() {
    _saveTimer?.cancel();
    if (_scroll.hasClients) Settings.instance.savePosition(widget.bani.id, _scroll.offset);
    _scroll.dispose();
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final b = widget.bani;
    final s = Settings.instance;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(b.gurmukhiName.isNotEmpty ? b.gurmukhiName : b.name),
            Text(
              b.name,
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ],
        ),
        actions: [
          ListenableBuilder(
            listenable: s,
            builder: (context, _) => IconButton(
              tooltip: 'Bookmark',
              icon: Icon(s.isBookmarked('bani', b.id) ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
              onPressed: () => s.toggleBookmark(Bookmark('bani', b.id, b.name, b.gurmukhiName)),
            ),
          ),
          ListenableBuilder(
            listenable: s,
            builder: (context, _) => IconButton(
              tooltip: s.pageView ? tr('Scroll view') : tr('Page view'),
              icon: Icon(s.pageView ? Icons.view_agenda_outlined : Icons.auto_stories_outlined),
              onPressed: () {
                if (_scroll.hasClients) Settings.instance.savePosition(b.id, _scroll.offset);
                _restored = false; // back in scroll view, carry on from the saved spot
                s.pageView = !s.pageView;
              },
            ),
          ),
          IconButton(
            tooltip: 'Back to the start',
            icon: const Icon(Icons.vertical_align_top_rounded),
            onPressed: () {
              if (s.pageView) {
                _pageTurner.toStart();
              } else if (_scroll.hasClients) {
                _scroll.animateTo(0, duration: const Duration(milliseconds: 400), curve: Curves.easeOut);
              }
            },
          ),
          IconButton(tooltip: 'Text size and meanings', icon: const Icon(Icons.text_fields_rounded), onPressed: () => showReadingSettings(context)),
        ],
      ),
      body: FutureBuilder<List<GurbaniLine>>(
        future: _lines,
        builder: (context, snap) {
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _lines = _load()));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final header = Padding(
            padding: const EdgeInsets.only(bottom: 12, top: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text([b.author, if (b.ang != null) 'Ang ${b.ang}'].join(' · '), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                if (b.audio != null) ...[
                  const SizedBox(height: 10),
                  AudioBar(url: b.audio!.url, label: 'Listen — ${b.name}', credit: [b.audio!.by, b.audio!.duration].whereType<String>().join(' · '), title: b.name, subtitle: b.audio!.by ?? b.author),
                ],
              ],
            ),
          );
          final footer = b.nitnem
              ? ListenableBuilder(
                  listenable: s,
                  builder: (context, _) => Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: s.isDone(b.id)
                        ? OutlinedButton.icon(onPressed: () => s.setDone(b.id, false), icon: const Icon(Icons.check_circle), label: Text(tr('Done for today')))
                        : FilledButton.icon(
                            onPressed: () {
                              s.setDone(b.id, true);
                              s.savePosition(b.id, 0);
                              s.savePageLine(b.id, 0);
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${b.name} marked done for today. Waheguru!')));
                            },
                            icon: const Icon(Icons.check),
                            label: Text(tr('Mark as done for today')),
                          ),
                  ),
                )
              : null;
          return ListenableBuilder(
            listenable: s,
            builder: (context, _) {
              if (s.pageView) {
                return GurbaniPages(
                  key: ValueKey('pages-${b.id}'),
                  lines: snap.data!,
                  title: b.gurmukhiName.isNotEmpty ? b.gurmukhiName : b.name,
                  header: header,
                  footer: footer,
                  controller: _pageTurner,
                  initialLine: s.pageLine(b.id),
                  onLineChanged: (line) => s.savePageLine(b.id, line),
                );
              }
              _restore();
              return GurbaniList(lines: snap.data!, controller: _scroll, header: header, footer: footer);
            },
          );
        },
      ),
    );
  }
}

/// Reads one Shabad or Ang (bundled, or loaded from BaniDB).
class ShabadReader extends StatefulWidget {
  const ShabadReader({super.key, required this.load, required this.title, this.navigateAng, this.bookmark});
  final Future<ShabadData> Function() load;

  /// Lets this Shabad or Ang be saved to Bookmarks.
  final Bookmark? bookmark;
  final String title;

  /// For Ang pages: open the previous / next Ang.
  final void Function(int ang)? navigateAng;

  @override
  State<ShabadReader> createState() => _ShabadReaderState();
}

class _ShabadReaderState extends State<ShabadReader> {
  late Future<ShabadData> _data = widget.load();

  @override
  void initState() {
    super.initState();
    if (Settings.instance.keepAwake) WakelockPlus.enable();
  }

  @override
  void dispose() {
    WakelockPlus.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        actions: [
          if (widget.bookmark case final bm?)
            ListenableBuilder(
              listenable: Settings.instance,
              builder: (context, _) => IconButton(
                tooltip: 'Bookmark',
                icon: Icon(Settings.instance.isBookmarked(bm.type, bm.id) ? Icons.bookmark_rounded : Icons.bookmark_border_rounded),
                onPressed: () => Settings.instance.toggleBookmark(bm),
              ),
            ),
          if (widget.navigateAng case final open?)
            IconButton(
              tooltip: tr('Go to Ang'),
              icon: const Icon(Icons.numbers_rounded),
              onPressed: () async {
                final n = await askNumber(context, title: tr('Go to Ang'), label: tr('Ang number'), min: 1, max: 1430);
                if (n != null) open(n);
              },
            ),
          const BookViewButton(),
          IconButton(tooltip: 'Text size and meanings', icon: const Icon(Icons.text_fields_rounded), onPressed: () => showReadingSettings(context)),
        ],
      ),
      body: FutureBuilder<ShabadData>(
        future: _data,
        builder: (context, snap) {
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _data = widget.load()));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final d = snap.data!;
          return GurbaniBody(
            title: widget.title,
            lines: d.lines,
            header: Padding(
              padding: const EdgeInsets.only(top: 8, bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (d.subtitle != null && d.subtitle!.isNotEmpty) Text(d.subtitle!, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  if (d.audio != null) ...[const SizedBox(height: 10), AudioBar(url: d.audio!.url, label: 'Listen', title: d.title, subtitle: d.writer ?? '')],
                ],
              ),
            ),
            footer: widget.navigateAng != null && d.ang != null
                ? Padding(
                    padding: const EdgeInsets.only(top: 20),
                    child: Row(
                      children: [
                        if (d.ang! > 1) OutlinedButton.icon(onPressed: () => widget.navigateAng!(d.ang! - 1), icon: const Icon(Icons.chevron_left), label: Text('Ang ${d.ang! - 1}')),
                        const Spacer(),
                        if (d.ang! < 1430) FilledButton.icon(onPressed: () => widget.navigateAng!(d.ang! + 1), icon: const Icon(Icons.chevron_right), label: Text('Ang ${d.ang! + 1}')),
                      ],
                    ),
                  )
                : null,
          );
        },
      ),
    );
  }
}
