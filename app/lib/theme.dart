import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Sikhify's colours: warm cream pages, deep navy and saffron gold.
class Brand {
  static const navy = Color(0xFF13274A);
  static const navyDeep = Color(0xFF0B1A33);
  static const gold = Color(0xFFE6A23C);
  static const goldDark = Color(0xFFC9861F);
  static const cream = Color(0xFFFBF5EA);
  static const sand = Color(0xFFF3EAD9);
  static const ink = Color(0xFF1B2333);
  static const page = cream;

  /// Navy fading into the night: hero cards and the splash.
  static const nightGradient = LinearGradient(colors: [navyDeep, navy], begin: Alignment.topLeft, end: Alignment.bottomRight);
}

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.navy,
    brightness: brightness,
    primary: dark ? Brand.gold : Brand.navy,
    secondary: Brand.gold,
    surface: dark ? const Color(0xFF14203A) : Colors.white,
    onSurface: dark ? const Color(0xFFF1ECE2) : Brand.ink,
  );
  final base = ThemeData(useMaterial3: true, colorScheme: scheme, brightness: brightness);
  return base.copyWith(
    scaffoldBackgroundColor: dark ? Brand.navyDeep : Brand.cream,
    textTheme: base.textTheme.apply(fontFamilyFallback: const ['NotoSansGurmukhi']),
    appBarTheme: AppBarTheme(
      backgroundColor: dark ? Brand.navyDeep : Brand.cream,
      foregroundColor: dark ? Colors.white : Brand.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      titleTextStyle: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: dark ? Colors.white : Brand.ink, fontFamilyFallback: const ['NotoSansGurmukhi']),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: dark ? const Color(0xFF111B31) : Colors.white,
      indicatorColor: Brand.gold.withValues(alpha: dark ? 0.25 : 0.22),
      surfaceTintColor: Colors.transparent,
      height: 66,
      labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
            color: s.contains(WidgetState.selected) ? (dark ? Brand.gold : Brand.navy) : (dark ? Colors.white60 : const Color(0xFF6B7180)),
          )),
      iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(
            color: s.contains(WidgetState.selected) ? (dark ? Brand.gold : Brand.navy) : (dark ? Colors.white60 : const Color(0xFF6B7180)),
          )),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: dark ? const Color(0xFF16233F) : Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: BorderSide(color: dark ? Colors.white10 : const Color(0xFFEDE3D1))),
      margin: EdgeInsets.zero,
    ),
    chipTheme: ChipThemeData(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      side: BorderSide(color: dark ? Colors.white24 : const Color(0xFFE3D7C2)),
      backgroundColor: dark ? const Color(0xFF16233F) : Colors.white,
      selectedColor: Brand.navy,
      labelStyle: TextStyle(color: dark ? Colors.white : Brand.ink, fontWeight: FontWeight.w600),
      secondaryLabelStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
      checkmarkColor: Colors.white,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: dark ? Brand.gold : Brand.navy,
        foregroundColor: dark ? Brand.navy : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    listTileTheme: ListTileThemeData(iconColor: dark ? Brand.gold : Brand.navy),
    dividerTheme: DividerThemeData(color: dark ? Colors.white12 : const Color(0xFFEDE3D1), space: 1),
  );
}

/// Big serif headings ("Welcome to Sikhify").
TextStyle serif(double size, {Color? color, FontWeight weight = FontWeight.w700}) =>
    TextStyle(fontFamily: 'serif', fontSize: size, fontWeight: weight, color: color, height: 1.15);

/// Section titles on the cream pages ("Quick Access", "Continue Learning").
TextStyle sectionTitle(BuildContext context) =>
    TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.onSurface);

/// Gurmukhi lines in the bundled Noto Sans Gurmukhi; the size follows the reader's setting.
TextStyle gurmukhiStyle(BuildContext context, double scale, {bool header = false}) => TextStyle(
      fontFamily: 'NotoSansGurmukhi',
      fontSize: (header ? 19 : 22) * scale,
      height: 1.6,
      fontWeight: header ? FontWeight.w700 : FontWeight.w600,
      color: header ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.onSurface,
    );

/// Gurbani in Hindi (Devanagari) letters: as large as the Gurmukhi when shown on its own, a little
/// smaller as a second line under it. ੴ comes from the Gurmukhi font.
TextStyle devanagariStyle(BuildContext context, double scale, {bool header = false, bool second = false}) => TextStyle(
      fontFamilyFallback: const ['NotoSansGurmukhi'],
      fontSize: (header ? 18 : (second ? 18 : 21)) * scale,
      height: 1.6,
      fontWeight: header || !second ? FontWeight.w700 : FontWeight.w600,
      color: header ? Theme.of(context).colorScheme.primary : (second ? Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.85) : Theme.of(context).colorScheme.onSurface),
    );

/// A rounded picture that fills its box (asset or web), with a soft placeholder while it loads.
class Pic extends StatefulWidget {
  const Pic(this.src, {super.key, this.radius = 14, this.fit = BoxFit.cover, this.width, this.height, this.alignment = Alignment.center});
  final String src;
  final double radius;
  final BoxFit fit;
  final double? width, height;
  final Alignment alignment;

  @override
  State<Pic> createState() => _PicState();
}

class _PicState extends State<Pic> {
  static const _headers = {'User-Agent': 'SikhifyApp/2.1 (https://www.sikhify.in)'};
  static const _maxRetries = 2;

  // Image hosts (Wikimedia especially) refuse some requests when a list asks for many pictures at
  // once; a failed picture is tried again after a pause instead of staying blank.
  int _attempt = 0;
  bool _retryScheduled = false;

  @override
  void didUpdateWidget(Pic old) {
    super.didUpdateWidget(old);
    if (old.src != widget.src) {
      _attempt = 0;
      _retryScheduled = false;
    }
  }

  void _retryLater(ImageProvider provider) {
    if (_retryScheduled || _attempt >= _maxRetries) return;
    _retryScheduled = true;
    Future<void>.delayed(Duration(seconds: 2 * (_attempt + 1)), () {
      if (!mounted) return;
      provider.evict();
      setState(() {
        _attempt++;
        _retryScheduled = false;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final w = widget;
    final placeholder = Container(color: Brand.sand, alignment: Alignment.center, child: const Icon(Icons.image_outlined, color: Brand.goldDark));
    final Widget img;
    if (w.src.startsWith('http')) {
      img = LayoutBuilder(builder: (context, box) {
        // Decoded at the size it is shown (not the photo's full size): far less memory in long lists.
        final dpr = MediaQuery.devicePixelRatioOf(context);
        final shownW = w.width ?? (box.maxWidth.isFinite ? box.maxWidth : null);
        final shownH = w.height ?? (box.maxHeight.isFinite ? box.maxHeight : 0.0);
        // Wide enough that a landscape photo (up to 2:1) still covers the box's height when cropped.
        final decodeWidth = shownW == null ? null : (math.max(shownW, shownH * 2) * dpr).clamp(64, 1600).round();
        final provider = ResizeImage.resizeIfNeeded(decodeWidth, null, NetworkImage(w.src, headers: _headers));
        return Image(
          key: ValueKey('${w.src}#$_attempt'),
          image: provider,
          fit: w.fit, width: w.width, height: w.height, alignment: w.alignment,
          errorBuilder: (_, _, _) {
            _retryLater(provider);
            return placeholder;
          },
          loadingBuilder: (c, child, p) => p == null ? child : placeholder,
        );
      });
    } else {
      img = Image.asset(w.src, fit: w.fit, width: w.width, height: w.height, alignment: w.alignment, errorBuilder: (_, _, _) => placeholder);
    }
    return ClipRRect(borderRadius: BorderRadius.circular(w.radius), child: SizedBox(width: w.width, height: w.height, child: img));
  }
}

/// A Gurdwara outline (onion dome with its kalash, two side domes, the hall) — Material has no such icon.
class GurdwaraIcon extends StatelessWidget {
  const GurdwaraIcon({super.key, this.size = 24, this.color});
  final double size;
  final Color? color;

  @override
  Widget build(BuildContext context) =>
      CustomPaint(size: Size.square(size), painter: _GurdwaraPainter(color ?? IconTheme.of(context).color ?? Brand.navy));
}

class _GurdwaraPainter extends CustomPainter {
  _GurdwaraPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size s) {
    final p = Paint()..color = color;
    final w = s.width, h = s.height;
    Path dome(double cx, double base, double r) => Path()
      ..moveTo(cx - r, base)
      ..cubicTo(cx - r * 1.25, base - r * 0.9, cx - r * 0.25, base - r * 1.25, cx, base - r * 1.9)
      ..cubicTo(cx + r * 0.25, base - r * 1.25, cx + r * 1.25, base - r * 0.9, cx + r, base)
      ..close();
    canvas.drawPath(dome(w * 0.5, h * 0.5, w * 0.2), p); // main dome
    canvas.drawRect(Rect.fromLTWH(w * 0.49, h * 0.04, w * 0.02, h * 0.1), p); // kalash
    canvas.drawCircle(Offset(w * 0.5, h * 0.05), w * 0.03, p);
    canvas.drawPath(dome(w * 0.17, h * 0.62, w * 0.09), p); // side domes
    canvas.drawPath(dome(w * 0.83, h * 0.62, w * 0.09), p);
    final hall = Path()..addRRect(RRect.fromLTRBR(w * 0.06, h * 0.5, w * 0.94, h * 0.95, Radius.circular(w * 0.03)));
    final door = Path()
      ..moveTo(w * 0.42, h * 0.95)
      ..lineTo(w * 0.42, h * 0.74)
      ..quadraticBezierTo(w * 0.5, h * 0.62, w * 0.58, h * 0.74)
      ..lineTo(w * 0.58, h * 0.95)
      ..close();
    canvas.drawPath(Path.combine(PathOperation.difference, hall, door), p);
  }

  @override
  bool shouldRepaint(_GurdwaraPainter old) => old.color != color;
}

/// The gold Khanda in a soft circle — list icons in Gurbani and Profile.
class KhandaBadge extends StatelessWidget {
  const KhandaBadge({super.key, this.size = 44});
  final double size;

  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(color: Brand.navy, borderRadius: BorderRadius.circular(size * 0.32)),
        padding: EdgeInsets.all(size * 0.2),
        child: Image.asset('assets/images/khanda.png'),
      );
}
