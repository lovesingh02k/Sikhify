import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/banidb.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/reminders.dart';
import '../services/settings.dart';
import '../services/share_app.dart';
import '../theme.dart';
import '../widgets/reading_settings.dart';
import 'contribute.dart';
import 'home.dart';
import 'learn.dart';
import 'reader.dart';

/// Profile: your name (on the phone only), bookmarks, offline Gurbani, reminders and settings.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    void open(Widget w) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => w));
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [Image.asset('assets/images/khanda.png', width: 28, height: 28), const SizedBox(width: 8), Text(tr('Profile'))]),
        actions: [IconButton(tooltip: 'Reading settings', icon: const Icon(Icons.settings_rounded), onPressed: () => open(const _ReadingScreen()))],
      ),
      body: ListenableBuilder(
        listenable: s,
        builder: (context, _) => ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), children: [
          Center(child: Avatar(name: s.name, size: 96)),
          const SizedBox(height: 12),
          Center(
            child: InkWell(
              borderRadius: BorderRadius.circular(8),
              onTap: () => _editName(context),
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: Row(mainAxisSize: MainAxisSize.min, children: [
                  Text(s.name.isEmpty ? tr('Add your name') : s.name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                  const SizedBox(width: 6),
                  const Icon(Icons.edit_rounded, size: 18),
                ]),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Card(
            child: Column(children: [
              _Item(Icons.bookmark_border_rounded, tr('My Bookmarks'), '${s.bookmarks.length}', () => open(const BookmarksScreen())),
              _Item(Icons.download_rounded, tr('Offline Gurbani'), null, () => open(const OfflineScreen())),
              _Item(Icons.notifications_none_rounded, tr('Reminders'), null, () => open(const RemindersScreen())),
              _Item(Icons.palette_outlined, tr('Appearance'), tr(switch (s.themeMode) { ThemeMode.light => 'Light', ThemeMode.dark => 'Dark', _ => 'Phone' }), () => _appearance(context)),
              _Item(Icons.translate_rounded, tr('Language'), I18n.languages[s.language], () => _language(context)),
              _Item(Icons.text_fields_rounded, tr('Meanings & text size'), null, () => open(const _ReadingScreen())),
            ]),
          ),
          const SizedBox(height: 12),
          Card(
            child: Column(children: [
              _Item(Icons.info_outline_rounded, tr('About Sikhify'), null, () => open(const AboutScreen())),
              _Item(Icons.volunteer_activism_outlined, tr('Add / Suggest / Report'), null, () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const ContributeScreen()))),
              _Item(Icons.share_outlined, tr('Share App'), null, () => _shareApp(context)),
              _Item(Icons.mail_outline_rounded, tr('Contact us'), 'sikhify.in@gmail.com', () => launchUrl(Uri.parse('mailto:sikhify.in@gmail.com'))),
              _Item(Icons.public_rounded, tr('Visit sikhify.in'), null, () => launchUrl(Uri.parse('https://www.sikhify.in'), mode: LaunchMode.externalApplication)),
            ]),
          ),
        ]),
      ),
    );
  }

  /// Send the app itself (the APK) — or the website link.
  void _shareApp(BuildContext context) => showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (sheet) => SafeArea(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            ListTile(
              leading: const Icon(Icons.android_rounded, color: Brand.goldDark),
              title: Text(tr('Share the app (APK file)'), style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(tr('Send Sikhify on WhatsApp, Bluetooth or Nearby Share — they can install it directly.')),
              onTap: () async {
                Navigator.pop(sheet);
                if (!await ShareApp.shareApk() && context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('The app file can’t be shared from this phone; sharing the link instead.'))));
                  await ShareApp.shareLink();
                }
              },
            ),
            ListTile(
              leading: const Icon(Icons.link_rounded),
              title: Text(tr('Share the website link'), style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text(ShareApp.link),
              onTap: () {
                Navigator.pop(sheet);
                ShareApp.shareLink();
              },
            ),
            const SizedBox(height: 8),
          ]),
        ),
      );

  void _language(BuildContext context) => showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: ListenableBuilder(
            listenable: Settings.instance,
            builder: (context, _) => RadioGroup<String>(
              groupValue: Settings.instance.language,
              onChanged: (v) {
                if (v == null) return;
                Settings.instance.language = v;
                Reminders.restore(); // notifications in the new language too
                Navigator.pop(context);
              },
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                for (final MapEntry(key: code, value: name) in I18n.languages.entries) RadioListTile(value: code, title: Text(name)),
                const Padding(
                  padding: EdgeInsets.fromLTRB(20, 4, 20, 12),
                  child: Text('Menus, lessons, the Gurus, Sikh History, FAQ and Rehat Maryada change language. Gurbani always stays in Gurmukhi; choose its meanings under "Meanings & text size".', style: TextStyle(fontSize: 12)),
                ),
              ]),
            ),
          ),
        ),
      );

  Future<void> _editName(BuildContext context) async {
    final c = TextEditingController(text: Settings.instance.name);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr('Your name')),
        content: TextField(controller: c, autofocus: true, textCapitalization: TextCapitalization.words, decoration: const InputDecoration(hintText: 'e.g. Love Singh')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(tr('Cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, c.text), child: Text(tr('Save'))),
        ],
      ),
    );
    if (name != null) Settings.instance.name = name;
  }

  void _appearance(BuildContext context) => showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (context) => SafeArea(
          child: ListenableBuilder(
            listenable: Settings.instance,
            builder: (context, _) => RadioGroup<ThemeMode>(
              groupValue: Settings.instance.themeMode,
              onChanged: (m) => Settings.instance.themeMode = m ?? ThemeMode.system,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                RadioListTile(value: ThemeMode.system, title: Text(tr('Same as phone'))),
                RadioListTile(value: ThemeMode.light, title: Text(tr('Light'))),
                RadioListTile(value: ThemeMode.dark, title: Text(tr('Dark'))),
              ]),
            ),
          ),
        ),
      );
}

class _Item extends StatelessWidget {
  const _Item(this.icon, this.title, this.trailing, this.onTap);
  final IconData icon;
  final String title;
  final String? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        trailing: Row(mainAxisSize: MainAxisSize.min, children: [
          if (trailing != null) Text(trailing!, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const Icon(Icons.chevron_right_rounded),
        ]),
        onTap: onTap,
      );
}

class _ReadingScreen extends StatelessWidget {
  const _ReadingScreen();

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(tr('Meanings & text size'))),
        body: ListView(children: const [
          Padding(
            padding: EdgeInsets.fromLTRB(20, 8, 20, 4),
            child: Text('Gurbani is always shown in Gurmukhi. Choose the transliteration and the meanings you want under each line, and the text size.'),
          ),
          ReadingSettings(inPage: true),
        ]),
      );
}

/// Banis, Shabads, Angs and lessons saved with the bookmark button.
class BookmarksScreen extends StatelessWidget {
  const BookmarksScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    return Scaffold(
      appBar: AppBar(title: Text(tr('My Bookmarks'))),
      body: ListenableBuilder(
        listenable: s,
        builder: (context, _) {
          final list = s.bookmarks;
          if (list.isEmpty) {
            return const Center(
              child: Padding(padding: EdgeInsets.all(32), child: Text('Nothing saved yet. Tap the bookmark on a Bani, Shabad, Ang or lesson to keep it here.', textAlign: TextAlign.center)),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: list.length,
            separatorBuilder: (_, _) => const SizedBox(height: 10),
            itemBuilder: (context, i) {
              final b = list[i];
              return Card(
                child: ListTile(
                  leading: Icon(switch (b.type) { 'lesson' => Icons.menu_book_rounded, 'ang' => Icons.auto_stories_rounded, _ => Icons.music_note_rounded }),
                  title: Text(b.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: b.subtitle.isEmpty ? null : Text(b.subtitle),
                  trailing: IconButton(tooltip: 'Remove', icon: const Icon(Icons.bookmark_remove_outlined), onPressed: () => s.toggleBookmark(b)),
                  onTap: () => openBookmark(context, b),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

void openBookmark(BuildContext context, Bookmark b) {
  final lib = Library.instance;
  final Widget? screen = switch (b.type) {
    'lesson' => lib.lesson(b.id) == null ? null : LessonScreen(lesson: lib.lesson(b.id)!),
    'bani' => lib.bani(b.id) == null ? null : BaniReader(bani: lib.bani(b.id)!),
    'shabad' => ShabadReader(title: 'Shabad', load: () => BaniDb.instance.shabad(int.parse(b.id)), bookmark: b),
    'ang' => ShabadReader(title: 'Ang ${b.id}', load: () => BaniDb.instance.ang(int.parse(b.id)), bookmark: b),
    _ => null,
  };
  if (screen != null) push(context, screen);
}

/// What works without internet, and saving the rest of the Banis for offline reading.
class OfflineScreen extends StatefulWidget {
  const OfflineScreen({super.key});

  @override
  State<OfflineScreen> createState() => _OfflineScreenState();
}

class _OfflineScreenState extends State<OfflineScreen> {
  int _files = 0, _bytes = 0;
  String? _progress;

  @override
  void initState() {
    super.initState();
    _count();
  }

  Future<Directory> _dir() async => Directory('${(await getApplicationSupportDirectory()).path}/gurbani_cache');

  Future<void> _count() async {
    final d = await _dir();
    var n = 0, b = 0;
    if (await d.exists()) {
      await for (final f in d.list()) {
        if (f is File) {
          n++;
          b += await f.length();
        }
      }
    }
    if (mounted) setState(() { _files = n; _bytes = b; });
  }

  Future<void> _downloadAll() async {
    final banis = Library.instance.banis.where((b) => !b.nitnem && b.baniDbId != null).toList();
    var failed = 0;
    for (final (i, b) in banis.indexed) {
      setState(() => _progress = 'Saving ${b.name} (${i + 1} of ${banis.length})…');
      try {
        await BaniDb.instance.bani(b.baniDbId!);
      } catch (_) {
        failed++;
      }
    }
    setState(() => _progress = null);
    await _count();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(failed == 0 ? 'All Banis are saved for offline reading.' : '$failed couldn’t be saved — check the internet and try again.')));
    }
  }

  Future<void> _clear() async {
    final d = await _dir();
    if (await d.exists()) await d.delete(recursive: true);
    await _count();
  }

  @override
  Widget build(BuildContext context) {
    final mb = (_bytes / 1048576).toStringAsFixed(1);
    return Scaffold(
      appBar: AppBar(title: Text(tr('Offline Gurbani'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Card(
          child: ListTile(
            leading: Icon(Icons.offline_pin_rounded, color: Brand.goldDark),
            title: Text('Always offline', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text('All 7 Nitnem Banis with meanings, 29 popular Shabads and every Learn lesson come with the app.'),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.save_alt_rounded),
            title: const Text('Saved on this phone', style: TextStyle(fontWeight: FontWeight.w700)),
            subtitle: Text('$_files Banis, Angs, Shabads and Hukamnamas you opened · $mb MB'),
          ),
        ),
        const SizedBox(height: 16),
        if (_progress != null) ...[const LinearProgressIndicator(color: Brand.gold), const SizedBox(height: 8), Text(_progress!)],
        FilledButton.icon(
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
          onPressed: _progress == null ? _downloadAll : null,
          icon: const Icon(Icons.download_rounded),
          label: const Text('Save all Banis for offline'),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
          onPressed: _progress == null && _files > 0 ? _clear : null,
          icon: const Icon(Icons.delete_outline_rounded),
          label: const Text('Clear saved Gurbani'),
        ),
      ]),
    );
  }
}

/// Daily reminders for Nitnem and the Hukamnama.
class RemindersScreen extends StatelessWidget {
  const RemindersScreen({super.key});

  String _time(BuildContext context, int minutes) => TimeOfDay(hour: minutes ~/ 60, minute: minutes % 60).format(context);

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    return Scaffold(
      appBar: AppBar(title: Text(tr('Reminders'))),
      body: ListenableBuilder(
        listenable: s,
        builder: (context, _) => ListView(padding: const EdgeInsets.all(16), children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
            child: Text(tr('A gentle notification each day. Tap the time to change it.')),
          ),
          for (final k in Reminders.kinds)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: SwitchListTile(
                  title: Text(tr(k.title), style: const TextStyle(fontWeight: FontWeight.w700)),
                  subtitle: InkWell(
                    onTap: s.reminder(k.key) == null ? null : () => _pick(context, k),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Text(s.reminder(k.key) == null ? tr('Off') : '${tr('Every day at')} ${_time(context, s.reminder(k.key)!)}  ✎',
                          style: TextStyle(color: s.reminder(k.key) == null ? null : Brand.goldDark, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  value: s.reminder(k.key) != null,
                  onChanged: (on) async {
                    if (on && !await Reminders.requestPermission()) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Allow notifications for Sikhify in your phone settings to get reminders.')));
                      }
                      return;
                    }
                    await Reminders.set(k, on ? k.defaultMinutes : null);
                  },
                ),
              ),
            ),
        ]),
      ),
    );
  }

  Future<void> _pick(BuildContext context, ReminderKind k) async {
    final m = Settings.instance.reminder(k.key) ?? k.defaultMinutes;
    final t = await showTimePicker(context: context, initialTime: TimeOfDay(hour: m ~/ 60, minute: m % 60));
    if (t != null) await Reminders.set(k, t.hour * 60 + t.minute);
  }
}

class AboutScreen extends StatelessWidget {
  const AboutScreen({super.key});

  /// Shown in About and kept in step with pubspec.yaml's version.
  static const version = '1.0.0';

  @override
  Widget build(BuildContext context) {
    final muted = TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.5);
    Widget label(String text) => Padding(
          padding: const EdgeInsets.only(top: 22, bottom: 8),
          child: Text(text, style: const TextStyle(color: Brand.goldDark, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1.6)),
        );
    return Scaffold(
      appBar: AppBar(title: Text(tr('About Sikhify'))),
      body: ListView(padding: const EdgeInsets.fromLTRB(20, 8, 20, 32), children: [
        label('APPLICATION INFORMATION'),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(children: [
              Image.asset('assets/images/khanda.png', width: 72, height: 72),
              const SizedBox(height: 8),
              Text('Sikhify', style: serif(34, color: Theme.of(context).colorScheme.onSurface)),
              const SizedBox(height: 4),
              Text('${tr('Version')} $version', style: muted),
            ]),
          ),
        ),
        label('DEVELOPMENT & ENGINEERING'),
        Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => launchUrl(Uri.parse('https://googlixlabs.com/'), mode: LaunchMode.externalApplication),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                Text('Googlix Labs', style: serif(26, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 6),
                const Text('Design · Development · Technology', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 10),
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Icon(Icons.public_rounded, size: 18, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 6),
                  Text('googlixlabs.com', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700)),
                ]),
              ]),
            ),
          ),
        ),
        const SizedBox(height: 14),
        Center(child: Text('© 2026 Googlix Labs', style: muted)),
        label('SOURCES'),
        Text('Gurbani text and meanings: BaniDB (banidb.com) — English by Dr. Sant Singh Khalsa, Punjabi by Prof. Sahib Singh. '
            'Hukamnama from Sri Harmandir Sahib, Amritsar; audio published by the SGPC. Lessons, Kirtan & Katha, Gurdwaras and festivals: sikhify.in.', style: muted),
        label('IMAGES'),
        Text('Sri Harmandir Sahib photo: Oleg Yunakov, CC BY-SA 3.0, via Wikimedia Commons. '
            'Paintings of the Guru Sahibs, Sri Harmandir Sahib (William Carpenter, 1854) and the illuminated folio: museum collections, public domain. '
            'Paintings are artistic depictions made after the Gurus’ lifetimes. Maps: © OpenStreetMap contributors. Font: Noto Sans Gurmukhi (SIL Open Font License).', style: muted),
        const SizedBox(height: 8),
        TextButton.icon(onPressed: () => launchUrl(Uri.parse('https://www.sikhify.in/image-credits'), mode: LaunchMode.externalApplication), icon: const Icon(Icons.open_in_new_rounded, size: 18), label: const Text('All image credits')),
      ]),
    );
  }
}
