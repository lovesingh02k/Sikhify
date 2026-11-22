import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../models.dart';
import '../services/i18n.dart';

/// The languages Gurbani can be shared in. Each keeps the Gurmukhi and adds that language's
/// script and meaning, so the person receiving it can read and understand it.
enum ShareLanguage { punjabi, hindi, english, gurmukhi }

/// Builds the text to share: a heading, then each line as the chosen language lays it out.
String gurbaniShareText({required String heading, required List<GurbaniLine> lines, required ShareLanguage language}) {
  final out = StringBuffer('$heading\n');
  for (final l in lines) {
    out.write('\n${l.gurmukhi}\n');
    switch (language) {
      case ShareLanguage.punjabi:
        if (l.punjabi != null) out.write('${l.punjabi}\n');
      case ShareLanguage.hindi:
        out.write('${l.devanagari}\n');
        final meaning = l.hindi ?? l.english;
        if (meaning != null && !l.header) out.write('$meaning\n');
      case ShareLanguage.english:
        if (l.translit != null) out.write('${l.translit}\n');
        if (l.english != null && !l.header) out.write('${l.english}\n');
      case ShareLanguage.gurmukhi:
        break;
    }
  }
  out.write('\n— shared from Sikhify');
  return out.toString().trimLeft(); // a single line has no heading
}

/// Asks which language to share in, then opens the phone's share menu.
Future<void> shareGurbani(BuildContext context, {required String heading, required List<GurbaniLine> lines}) async {
  final picked = await showModalBottomSheet<ShareLanguage>(
    context: context,
    showDragHandle: true,
    builder: (context) => SafeArea(
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
          child: Text(tr('Share in which language?'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
        ),
        _option(context, ShareLanguage.punjabi, 'ਪੰ', 'ਪੰਜਾਬੀ', tr('Gurmukhi with the Punjabi meaning')),
        _option(context, ShareLanguage.hindi, 'हि', 'हिंदी', tr('Gurbani in Hindi letters, with the Hindi meaning')),
        _option(context, ShareLanguage.english, 'En', 'English', tr('Gurmukhi, how to say it, and the English meaning')),
        _option(context, ShareLanguage.gurmukhi, 'ੴ', tr('Gurmukhi only'), tr('Just the Gurbani')),
        const SizedBox(height: 8),
      ]),
    ),
  );
  if (picked == null) return;
  await SharePlus.instance.share(ShareParams(text: gurbaniShareText(heading: heading, lines: lines, language: picked)));
}

Widget _option(BuildContext context, ShareLanguage value, String badge, String title, String subtitle) => ListTile(
      leading: CircleAvatar(
        backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
        child: Text(badge, style: TextStyle(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary)),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
      onTap: () => Navigator.pop(context, value),
    );
