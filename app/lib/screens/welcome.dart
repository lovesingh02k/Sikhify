import 'dart:async';

import 'package:flutter/material.dart';

import '../services/settings.dart';
import '../theme.dart';

/// The opening screen: Sri Harmandir Sahib at dusk, the gold Khanda and the Fateh.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key, required this.ready, required this.onDone});

  /// Finishes when the app's data has loaded.
  final Future<void> ready;
  final VoidCallback onDone;

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    // At least a moment on screen, and until the data is ready.
    Future.wait([widget.ready, Future<void>.delayed(const Duration(milliseconds: 1600))]).then((_) {
      if (mounted) widget.onDone();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Brand.navyDeep,
      body: Stack(fit: StackFit.expand, children: [
        // The temple fills the lower half; the night sky fades down into it.
        Align(
          alignment: Alignment.bottomCenter,
          child: FractionallySizedBox(
            heightFactor: 0.52,
            widthFactor: 1,
            child: ColorFiltered(
              colorFilter: const ColorFilter.mode(Color(0xFF1B2C55), BlendMode.multiply),
              child: Image.asset('assets/images/golden_temple.webp', fit: BoxFit.cover, alignment: const Alignment(0, 0.2)),
            ),
          ),
        ),
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              stops: [0, 0.45, 0.62, 1],
              colors: [Brand.navyDeep, Brand.navyDeep, Color(0x660B1A33), Color(0xEE0B1A33)],
            ),
          ),
        ),
        SafeArea(
          child: Column(children: [
            const Spacer(flex: 3),
            Image.asset('assets/images/khanda.png', width: 110, height: 110),
            const SizedBox(height: 18),
            Text('Sikhify', style: serif(54, color: Colors.white)),
            const SizedBox(height: 14),
            const Text('Waheguru Ji Ka Khalsa\nWaheguru Ji Ki Fateh', textAlign: TextAlign.center, style: TextStyle(color: Colors.white, fontSize: 16, height: 1.5)),
            const Spacer(flex: 6),
            const SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70)),
            const SizedBox(height: 36),
          ]),
        ),
      ]),
    );
  }
}

/// Three welcome pages, shown once.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key, required this.onDone});
  final VoidCallback onDone;

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pages = PageController();
  int _page = 0;

  static const _slides = [
    ('assets/images/gurus/guru-nanak-dev-ji.webp', 'Welcome to', 'Sikhify', 'Explore Gurbani, learn Sikh history, and stay connected with our roots.'),
    ('assets/images/golden_temple.webp', 'Begin each day with', 'Hukamnama', 'Read and listen to the daily Hukamnama from Sri Harmandir Sahib, Amritsar.'),
    ('assets/images/folio.webp', 'Your daily', 'Nitnem', 'All the Nitnem Banis with meanings — on your phone, even without internet.'),
  ];

  void _finish() {
    Settings.instance.onboarded = true;
    widget.onDone();
  }

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final last = _page == _slides.length - 1;
    return Scaffold(
      backgroundColor: Brand.cream,
      body: SafeArea(
        child: Column(children: [
          Expanded(
            child: PageView.builder(
              controller: _pages,
              itemCount: _slides.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (context, i) {
                final (img, small, big, text) = _slides[i];
                return Column(children: [
                  Expanded(
                    flex: 10,
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(28, 24, 28, 8),
                      child: Stack(alignment: Alignment.center, children: [
                        // A soft golden halo behind the painting.
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(colors: [Brand.gold.withValues(alpha: 0.45), Brand.cream.withValues(alpha: 0)]),
                          ),
                        ),
                        Container(
                          decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), boxShadow: [BoxShadow(color: Brand.goldDark.withValues(alpha: 0.25), blurRadius: 30, offset: const Offset(0, 12))]),
                          child: Pic(img, radius: 28, fit: BoxFit.cover),
                        ),
                      ]),
                    ),
                  ),
                  Expanded(
                    flex: 9,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 28),
                      // Scales down (never wraps or overflows) on narrow phones and with large text:
                      // the big word stays on one line ("Hukamnama", not "Hukamnam / a").
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.topCenter,
                        child: SizedBox(
                          width: MediaQuery.sizeOf(context).width - 56,
                          child: Column(mainAxisSize: MainAxisSize.min, children: [
                            const SizedBox(height: 14),
                            FittedBox(fit: BoxFit.scaleDown, child: Text(small, maxLines: 1, style: serif(26, color: Brand.ink, weight: FontWeight.w600))),
                            FittedBox(fit: BoxFit.scaleDown, child: Text(big, maxLines: 1, softWrap: false, style: serif(48, color: Brand.ink))),
                            const SizedBox(height: 12),
                            Text(text, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16, height: 1.5, color: Color(0xFF3D4455))),
                            const SizedBox(height: 8),
                          ]),
                        ),
                      ),
                    ),
                  ),
                ]);
              },
            ),
          ),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < _slides.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 250),
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: i == _page ? 22 : 9, height: 9,
                decoration: BoxDecoration(color: i == _page ? Brand.gold : const Color(0xFFD9CEBB), borderRadius: BorderRadius.circular(9)),
              ),
          ]),
          Padding(
            padding: const EdgeInsets.fromLTRB(28, 22, 28, 4),
            child: FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(56), backgroundColor: Brand.navyDeep, shape: const StadiumBorder()),
              onPressed: last ? _finish : () => _pages.nextPage(duration: const Duration(milliseconds: 350), curve: Curves.easeOut),
              child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [Text(last ? 'Get Started' : 'Next'), const SizedBox(width: 10), const Icon(Icons.arrow_forward_rounded)]),
            ),
          ),
          TextButton(onPressed: _finish, child: const Text('Skip', style: TextStyle(color: Brand.ink))),
          const SizedBox(height: 8),
        ]),
      ),
    );
  }
}
