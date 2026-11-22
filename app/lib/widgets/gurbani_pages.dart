import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../models.dart';
import '../services/i18n.dart';
import '../services/settings.dart';
import '../theme.dart';
import 'go_to_dialog.dart';
import 'gurbani_view.dart';

/// A Bani as the pages of a Gutka: paper pages with a gold border, the Bani's name at the top and
/// the page number (in Gurmukhi numerals) at the bottom; the next page slides over the last one.
/// Each page holds as many whole lines as fit the screen
/// at the reader's text size and chosen meanings; pages are worked out again when those change,
/// keeping the same line in view. The header (author, audio) opens page 1; the footer closes the last page.
class GurbaniPages extends StatefulWidget {
  const GurbaniPages({super.key, required this.lines, this.title, this.header, this.footer, this.initialLine = 0, this.onLineChanged, this.controller});

  final List<GurbaniLine> lines;

  /// Shown at the top of every page, like the running head of a printed Gutka.
  final String? title;
  final Widget? header;
  final Widget? footer;

  /// The line to open on (its page is shown first).
  final int initialLine;

  /// The first line of the page now shown, to carry on from there next time.
  final ValueChanged<int>? onLineChanged;

  /// Lets the screen jump back to page 1.
  final GurbaniPagesController? controller;

  @override
  State<GurbaniPages> createState() => _GurbaniPagesState();
}

/// Turns pages from outside (the app bar's "back to the start").
class GurbaniPagesController {
  _GurbaniPagesState? _state;
  void toStart() => _state?._goTo(0);
}

class _GurbaniPagesState extends State<GurbaniPages> {
  // The page sits on the "desk" with a margin, a gold frame inset in it, and the text inside the frame.
  static const _pageMargin = EdgeInsets.fromLTRB(12, 10, 12, 4);
  static const _frameInset = 9.0;
  static const _textPadding = EdgeInsets.fromLTRB(14, 4, 14, 4);
  static const _runningHead = 30.0;
  static const _runningFoot = 28.0;
  // Room kept for the header and footer on the first and last pages (they scroll if they need more).
  static const _headerRoom = 130.0;
  static const _footerRoom = 84.0;

  PageController? _pages;
  List<int> _starts = const [0]; // first line index of each page
  String _layoutKey = '';
  late int _line = widget.initialLine.clamp(0, math.max(0, widget.lines.length - 1));
  int _page = 0;

  @override
  void initState() {
    super.initState();
    widget.controller?._state = this;
  }

  @override
  void dispose() {
    if (widget.controller?._state == this) widget.controller?._state = null;
    _pages?.dispose();
    super.dispose();
  }

  void _goTo(int page) {
    if (!(_pages?.hasClients ?? false)) return;
    // A far page is opened straight away rather than flicking through every page between.
    if ((page - _page).abs() > 2) {
      _pages!.jumpToPage(page);
    } else {
      _pages!.animateToPage(page, duration: const Duration(milliseconds: 350), curve: Curves.easeOut);
    }
  }

  /// "Go to page": the reader types the page number.
  Future<void> _askPage(int count) async {
    final n = await askNumber(context, title: tr('Go to page'), label: tr('Page number'), min: 1, max: count, current: _page + 1);
    if (n != null && mounted) _goTo(n - 1);
  }

  int _pageOfLine(int line) {
    var p = 0;
    for (var i = 0; i < _starts.length; i++) {
      if (_starts[i] <= line) p = i;
    }
    return p;
  }

  /// Height of one line as [LineTile] draws it, plus the gap before a new paragraph.
  double _lineHeight(BuildContext context, int k, double width, Settings s) {
    final line = widget.lines[k];
    final scaler = MediaQuery.textScalerOf(context);
    final base = DefaultTextStyle.of(context).style;
    double measure(String text, TextStyle style) {
      final tp = TextPainter(
        text: TextSpan(text: text, style: base.merge(style)),
        textDirection: TextDirection.ltr,
        textScaler: scaler,
      )..layout(maxWidth: width);
      final h = tp.height;
      tp.dispose();
      return h;
    }

    final scale = s.fontScale;
    final meaningStyle = TextStyle(fontSize: 15 * scale, height: 1.45);
    var h = 18.0;
    if (s.showGurmukhi) h += measure(line.gurmukhi, gurmukhiStyle(context, scale, header: line.header));
    if (s.showDevanagari) h += measure(line.devanagari, devanagariStyle(context, scale, header: line.header, second: s.showGurmukhi));
    for (final (show, text) in [(s.showTranslit, line.translit), (s.showPunjabi, line.punjabi), (s.showHindi, line.hindi), (s.showEnglish, line.english)]) {
      if (show && text != null) h += 3 + measure(text, meaningStyle);
    }
    final prev = k > 0 ? widget.lines[k - 1] : null;
    if (prev != null && line.paragraph != null && prev.paragraph != line.paragraph) h += 14;
    return h;
  }

  void _paginate(BuildContext context, BoxConstraints box, Settings s) {
    // 3.5 = the two gold frame lines and the gap between them, on each side.
    final width = box.maxWidth - _pageMargin.horizontal - (_frameInset + 3.5) * 2 - _textPadding.horizontal;
    final height = box.maxHeight - _pageMargin.vertical - (_frameInset + 3.5) * 2 - _textPadding.vertical - _runningHead - _runningFoot;
    final key = [width, height, s.fontScale, s.gurbaniScript, s.showTranslit, s.showPunjabi, s.showHindi, s.showEnglish, MediaQuery.textScalerOf(context).scale(10), widget.lines.length].join('|');
    if (key == _layoutKey) return;
    _layoutKey = key;

    final starts = <int>[0];
    var used = widget.header != null ? _headerRoom : 0.0;
    for (var k = 0; k < widget.lines.length; k++) {
      final h = _lineHeight(context, k, width, s);
      // A new page when this line doesn't fit (a line taller than a whole page gets its own page and scrolls).
      if (used + h > height && used > 0) {
        starts.add(k);
        used = 0;
      }
      used += h;
    }
    if (widget.footer != null && used + _footerRoom > height) starts.add(widget.lines.length); // footer on a page of its own
    _starts = starts;

    // Same line in view as before (or where the reader left off).
    _page = _pageOfLine(_line).clamp(0, _starts.length - 1);
    final old = _pages;
    _pages = PageController(initialPage: _page);
    if (old != null) WidgetsBinding.instance.addPostFrameCallback((_) => old.dispose());
  }

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    return ListenableBuilder(
      listenable: s,
      builder: (context, _) => LayoutBuilder(
        builder: (context, box) {
          // The page indicator takes the bottom; pages get the rest.
          const barHeight = 52.0;
          final pageBox = BoxConstraints(maxWidth: box.maxWidth, maxHeight: math.max(120, box.maxHeight - barHeight));
          _paginate(context, pageBox, s);
          final count = _starts.length;
          final dark = Theme.of(context).brightness == Brightness.dark;
          final desk = dark ? const Color(0xFF0A1428) : const Color(0xFFE8DCC4);
          return Column(
            children: [
              Expanded(
                child: ColoredBox(
                  color: desk,
                  child: PageView.builder(
                    key: ValueKey(_layoutKey),
                    controller: _pages,
                    itemCount: count,
                    onPageChanged: (p) {
                      setState(() => _page = p);
                      _line = _starts[p];
                      widget.onLineChanged?.call(_line);
                    },
                    itemBuilder: (context, p) => _turning(p, box.maxWidth, _paper(context, p, count, s, dark)),
                  ),
                ),
              ),
              Container(
                height: barHeight,
                color: desk,
                child: Row(
                  children: [
                    IconButton(tooltip: tr('Previous page'), onPressed: _page > 0 ? () => _goTo(_page - 1) : null, icon: const Icon(Icons.chevron_left_rounded, size: 30)),
                    Expanded(
                      // Tap the page number to type the page to go to.
                      child: Tooltip(
                        message: tr('Go to page'),
                        child: InkWell(
                          borderRadius: BorderRadius.circular(10),
                          onTap: count > 1 ? () => _askPage(count) : null,
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Row(mainAxisSize: MainAxisSize.min, children: [
                                Text('${tr('Page')} ${_page + 1} / $count', style: const TextStyle(fontWeight: FontWeight.w700)),
                                if (count > 1) ...[const SizedBox(width: 4), const Icon(Icons.edit_note_rounded, size: 20, color: Brand.goldDark)],
                              ]),
                              const SizedBox(height: 6),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(value: count <= 1 ? 1 : (_page + 1) / count, minHeight: 4, color: Brand.gold, backgroundColor: Brand.gold.withValues(alpha: 0.18)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    IconButton(tooltip: tr('Next page'), onPressed: _page < count - 1 ? () => _goTo(_page + 1) : null, icon: const Icon(Icons.chevron_right_rounded, size: 30)),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  /// One page of the Gutka: paper, a double gold frame, the running head, the lines and the page number.
  Widget _paper(BuildContext context, int p, int count, Settings s, bool dark) {
    final from = _starts[p];
    final to = p + 1 < count ? _starts[p + 1] : widget.lines.length;
    final paper = dark ? const Color(0xFF15233F) : const Color(0xFFFFFAEE);
    final gold = dark ? Brand.gold.withValues(alpha: 0.55) : Brand.goldDark.withValues(alpha: 0.6);
    return Padding(
      padding: _pageMargin,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: paper,
          borderRadius: const BorderRadius.horizontal(left: Radius.circular(4), right: Radius.circular(12)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: dark ? 0.45 : 0.16),
              blurRadius: 10,
              offset: const Offset(2, 4),
            ),
          ],
        ),
        child: Stack(
          children: [
            // The binding: a soft shade along the left edge, where the pages are sewn.
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 18,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(4)),
                  gradient: LinearGradient(
                    colors: [
                      Colors.black.withValues(alpha: dark ? 0.35 : 0.12),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(_frameInset),
              child: DecoratedBox(
                decoration: BoxDecoration(border: Border.all(color: gold, width: 1.4)),
                child: Padding(
                  padding: const EdgeInsets.all(2.5),
                  child: DecoratedBox(
                    decoration: BoxDecoration(border: Border.all(color: gold.withValues(alpha: 0.5), width: 0.7)),
                    child: Column(
                      children: [
                        SizedBox(
                          height: _runningHead,
                          child: Center(
                            child: Text(
                              widget.title ?? '',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontFamily: 'NotoSansGurmukhi', fontSize: 13, fontWeight: FontWeight.w700, color: gold, letterSpacing: 0.3),
                            ),
                          ),
                        ),
                        Expanded(
                          child: SingleChildScrollView(
                            padding: _textPadding,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (p == 0 && widget.header != null) widget.header!,
                                for (var k = from; k < to; k++)
                                  Padding(
                                    padding: EdgeInsets.only(top: k > from && widget.lines[k].paragraph != null && widget.lines[k - 1].paragraph != widget.lines[k].paragraph ? 14 : 0),
                                    child: LineTile(line: widget.lines[k], settings: s),
                                  ),
                                if (p == count - 1 && widget.footer != null) widget.footer!,
                              ],
                            ),
                          ),
                        ),
                        SizedBox(
                          height: _runningFoot,
                          child: Center(
                            child: Text(
                              '— ${gurmukhiNumber(p + 1)} —',
                              style: TextStyle(fontFamily: 'NotoSansGurmukhi', fontSize: 14, fontWeight: FontWeight.w700, color: gold),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// The page-turn: the page underneath stays put and dims a little while the next one slides over it,
  /// casting a soft shadow on its left edge.
  Widget _turning(int p, double width, Widget page) {
    final controller = _pages;
    if (controller == null) return page;
    return AnimatedBuilder(
      animation: controller,
      child: page,
      builder: (context, child) {
        var at = _page.toDouble();
        if (controller.hasClients && controller.position.haveDimensions) at = controller.page ?? at;
        final delta = p - at; // < 0: this page is going under; > 0: this page is coming over
        if (delta <= -1 || delta >= 1 || delta == 0) return child!;
        if (delta < 0) {
          final t = -delta;
          return Transform.translate(
            offset: Offset(t * width, 0), // held in place under the incoming page
            child: Transform.scale(
              scale: 1 - 0.04 * t,
              child: Stack(
                children: [
                  child!,
                  Positioned.fill(
                    child: IgnorePointer(
                      child: ColoredBox(color: Colors.black.withValues(alpha: 0.18 * t)),
                    ),
                  ),
                ],
              ),
            ),
          );
        }
        return Stack(
          clipBehavior: Clip.none,
          children: [
            Positioned(
              left: -22,
              top: 0,
              bottom: 0,
              width: 22,
              child: IgnorePointer(
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        Colors.transparent,
                        Colors.black.withValues(alpha: 0.22 * (1 - delta)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            child!,
          ],
        );
      },
    );
  }
}

/// 1, 2, 3 … in Gurmukhi numerals (੧, ੨, ੩ …).
String gurmukhiNumber(int n) => n.toString().split('').map((d) => String.fromCharCode(0x0A66 + int.parse(d))).join();

/// Gurbani as Gutka pages or as a scrolling list, whichever the reader chose (book view is the default).
class GurbaniBody extends StatelessWidget {
  const GurbaniBody({super.key, required this.lines, this.title, this.header, this.footer});
  final List<GurbaniLine> lines;
  final String? title;
  final Widget? header;
  final Widget? footer;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: Settings.instance,
        builder: (context, _) => Settings.instance.pageView
            ? GurbaniPages(key: ValueKey('${title ?? ''}-${lines.length}-${lines.isEmpty ? '' : lines.first.gurmukhi}'), lines: lines, title: title, header: header, footer: footer)
            : GurbaniList(lines: lines, header: header, footer: footer),
      );
}

/// The app-bar button that switches between book view and the scrolling list.
class BookViewButton extends StatelessWidget {
  const BookViewButton({super.key, this.onChanged});

  /// Called just before the view changes (e.g. to remember the scroll position).
  final VoidCallback? onChanged;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: Settings.instance,
        builder: (context, _) {
          final book = Settings.instance.pageView;
          return IconButton(
            tooltip: book ? tr('Scroll view') : tr('Page view'),
            icon: Icon(book ? Icons.view_agenda_outlined : Icons.auto_stories_outlined),
            onPressed: () {
              onChanged?.call();
              Settings.instance.pageView = !book;
            },
          );
        },
      );
}
