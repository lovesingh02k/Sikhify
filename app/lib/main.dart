import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'screens/home.dart';
import 'screens/hukamnama.dart';
import 'screens/nitnem.dart';
import 'screens/quiz.dart';
import 'screens/learn.dart';
import 'screens/media.dart';
import 'screens/profile.dart';
import 'screens/welcome.dart';
import 'services/i18n.dart';
import 'services/library.dart';
import 'services/links.dart';
import 'services/quiz.dart';
import 'services/reminders.dart';
import 'services/settings.dart';
import 'theme.dart';
import 'widgets/audio_bar.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SikhifyApp());
}

/// Loads settings and the bundled Gurbani while the splash shows, then reminders in the background.
Future<void> _load() async {
  await Future.wait([Settings.load(), Library.load(), I18n.instance.load(), Quiz.load()]);
  Reminders.restore().catchError((Object _) {}); // never holds up the app
}

class SikhifyApp extends StatefulWidget {
  const SikhifyApp({super.key});

  @override
  State<SikhifyApp> createState() => _SikhifyAppState();
}

enum _Stage { splash, onboarding, app }

class _SikhifyAppState extends State<SikhifyApp> {
  final _ready = _load();
  _Stage _stage = _Stage.splash;
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    _ready.then((_) => setState(() => _loaded = true));
  }

  @override
  Widget build(BuildContext context) {
    // Built inside the listener, so a theme change (light / dark / phone) applies at once.
    return _loaded ? ListenableBuilder(listenable: Settings.instance, builder: (context, _) => _app()) : _app();
  }

  Widget _app() {
    final themeMode = _loaded ? Settings.instance.themeMode : ThemeMode.light;
    return MaterialApp(
      title: 'Sikhify',
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      themeMode: themeMode,
      builder: (context, child) {
        final dark = Theme.of(context).brightness == Brightness.dark;
        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: (dark || _stage == _Stage.splash ? SystemUiOverlayStyle.light : SystemUiOverlayStyle.dark).copyWith(statusBarColor: Colors.transparent),
          child: child!,
        );
      },
      home: switch (_stage) {
        _Stage.splash => SplashScreen(
            ready: _ready,
            onDone: () => setState(() => _stage = Settings.instance.onboarded ? _Stage.app : _Stage.onboarding),
          ),
        _Stage.onboarding => OnboardingScreen(onDone: () => setState(() => _stage = _Stage.app)),
        _Stage.app => const Shell(),
      },
    );
  }
}

/// Home, Learn, Media and Profile, kept alive while switching; the mini player sits above the tabs.
class Shell extends StatefulWidget {
  const Shell({super.key});

  @override
  State<Shell> createState() => _ShellState();
}

class _ShellState extends State<Shell> {
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    // A tapped reminder opens what it is about: today's quiz, the Hukamnama, or Nitnem.
    Reminders.onOpen = _openReminder;
    Reminders.launchedFrom().then((key) {
      if (key != null && mounted) _openReminder(key);
    }).catchError((Object _) {});
    // A shared quiz link opens that quiz (whether the app was closed or already open).
    Links.onLink = _openLink;
    Links.listen();
    Links.initial().then((link) {
      if (link != null && mounted) _openLink(link);
    });
  }

  void _openLink(Uri link) {
    final quiz = Links.parseQuiz(link);
    if (quiz == null) return;
    final questions = Quiz.byIds(quiz.ids);
    Navigator.of(context).push(MaterialPageRoute<void>(
      builder: (_) => questions.isEmpty ? const DailyQuizScreen() : FriendQuizScreen(questions: questions, friendScore: quiz.ids.length == questions.length ? quiz.score : null),
    ));
  }

  @override
  void dispose() {
    if (Reminders.onOpen == _openReminder) Reminders.onOpen = null;
    if (Links.onLink == _openLink) Links.onLink = null;
    super.dispose();
  }

  void _openReminder(String key) {
    final Widget screen = switch (key) {
      'quiz' => const DailyQuizScreen(),
      'hukamnama' => const HukamnamaScreen(embedded: false),
      _ => const NitnemScreen(),
    };
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen));
  }

  @override
  Widget build(BuildContext context) {
    // Re-built on a language change too, so the tab labels follow it.
    return ListenableBuilder(listenable: Settings.instance, builder: (context, _) => PopScope(
      canPop: _tab == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _tab = 0); // Back from another tab goes Home first.
      },
      child: Scaffold(
        // Keyed by language, so switching it re-builds every tab in the new language (the open tab stays).
        body: ListenableBuilder(
          listenable: Settings.instance,
          builder: (context, _) {
            final lang = Settings.instance.language;
            return IndexedStack(index: _tab, children: [
              HomeScreen(key: ValueKey('home-$lang'), openTab: (i) => setState(() => _tab = i)),
              LearnScreen(key: ValueKey('learn-$lang')),
              MediaScreen(key: ValueKey('media-$lang')),
              ProfileScreen(key: ValueKey('profile-$lang')),
            ]);
          },
        ),
        bottomNavigationBar: Column(mainAxisSize: MainAxisSize.min, children: [
          const MiniPlayer(),
          NavigationBar(
            selectedIndex: _tab,
            onDestinationSelected: (i) => setState(() => _tab = i),
            destinations: [
              NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home_rounded), label: tr('Home')),
              NavigationDestination(icon: const Icon(Icons.menu_book_outlined), selectedIcon: const Icon(Icons.menu_book_rounded), label: tr('Learn')),
              NavigationDestination(icon: const Icon(Icons.music_note_outlined), selectedIcon: const Icon(Icons.music_note_rounded), label: tr('Media')),
              NavigationDestination(icon: const Icon(Icons.person_outline_rounded), selectedIcon: const Icon(Icons.person_rounded), label: tr('Profile')),
            ],
          ),
        ]),
      ),
    ));
  }
}
