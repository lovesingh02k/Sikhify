import 'package:flutter/material.dart';

import '../services/i18n.dart';
import '../services/settings.dart';

/// Text size and which meanings to show — opened from the "Aa" button on every reading screen.
Future<void> showReadingSettings(BuildContext context) => showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => const SafeArea(child: SingleChildScrollView(child: ReadingSettings())),
    );

class ReadingSettings extends StatelessWidget {
  const ReadingSettings({super.key, this.inPage = false});

  /// On the Settings screen (not in a sheet).
  final bool inPage;

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    return ListenableBuilder(
      listenable: s,
      builder: (context, _) => Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        if (!inPage) Padding(padding: const EdgeInsets.fromLTRB(20, 0, 20, 8), child: Text(tr('Reading'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700))),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(children: [
            const Text('ਅ', style: TextStyle(fontSize: 16)),
            Expanded(child: Slider(value: s.fontScale, min: 0.8, max: 2.0, divisions: 12, label: '${(s.fontScale * 100).round()}%', onChanged: (v) => s.fontScale = v)),
            const Text('ਅ', style: TextStyle(fontSize: 28)),
          ]),
        ),
        // Which letters the Gurbani itself is shown in.
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
          child: Text(tr('Gurbani in'), style: const TextStyle(fontWeight: FontWeight.w700)),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
          child: SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'gurmukhi', label: Text('ਗੁਰਮੁਖੀ')),
              ButtonSegment(value: 'hindi', label: Text('हिंदी')),
              ButtonSegment(value: 'both', label: Text('ਗੁਰਮੁਖੀ + हिंदी')),
            ],
            selected: {s.gurbaniScript},
            showSelectedIcon: false,
            onSelectionChanged: (v) => s.gurbaniScript = v.first,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
          child: OutlinedButton.icon(
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(44), shape: const StadiumBorder()),
            onPressed: s.readInHindi,
            icon: const Icon(Icons.translate_rounded),
            label: Text(tr('Read in Hindi only (Gurbani + Hindi meaning)')),
          ),
        ),
        SwitchListTile(title: Text(tr('Transliteration')), subtitle: Text(tr('Gurbani in English letters')), value: s.showTranslit, onChanged: (v) => s.showTranslit = v),
        SwitchListTile(title: Text(tr('Punjabi meaning')), subtitle: const Text('Prof. Sahib Singh'), value: s.showPunjabi, onChanged: (v) => s.showPunjabi = v),
        SwitchListTile(
          title: Text(tr('Hindi meaning')),
          subtitle: Text(tr('Not yet available for Jaap Sahib, Tav-Prasad Savaiye and Benti Chaupai')),
          value: s.showHindi,
          onChanged: (v) => s.showHindi = v,
        ),
        SwitchListTile(title: Text(tr('English meaning')), subtitle: const Text('Dr. Sant Singh Khalsa'), value: s.showEnglish, onChanged: (v) => s.showEnglish = v),
        SwitchListTile(title: Text(tr('Keep screen on while reading')), value: s.keepAwake, onChanged: (v) => s.keepAwake = v),
        const SizedBox(height: 8),
      ]),
    );
  }
}
