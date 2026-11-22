import 'package:flutter/material.dart';

import '../models.dart';
import '../services/i18n.dart';
import '../services/settings.dart';
import '../theme.dart';
import 'share_gurbani.dart';

/// Gurbani lines with the meanings the reader chose (Settings), in a scrolling list.
/// Long-press a line to copy or share it.
class GurbaniList extends StatelessWidget {
  const GurbaniList({super.key, required this.lines, this.controller, this.header, this.footer, this.padding});

  final List<GurbaniLine> lines;
  final ScrollController? controller;
  final Widget? header;
  final Widget? footer;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final s = Settings.instance;
    return ListenableBuilder(
      listenable: s,
      builder: (context, _) {
        final extra = (header != null ? 1 : 0);
        return ListView.builder(
          controller: controller,
          padding: padding ?? const EdgeInsets.fromLTRB(20, 8, 20, 120),
          itemCount: lines.length + extra + (footer != null ? 1 : 0),
          itemBuilder: (context, i) {
            if (header != null && i == 0) return header!;
            final k = i - extra;
            if (k >= lines.length) return footer!;
            final prev = k > 0 ? lines[k - 1] : null;
            final newPara = prev != null && lines[k].paragraph != null && prev.paragraph != lines[k].paragraph;
            return Padding(padding: EdgeInsets.only(top: newPara ? 14 : 0), child: LineTile(line: lines[k], settings: s));
          },
        );
      },
    );
  }
}

class LineTile extends StatelessWidget {
  const LineTile({super.key, required this.line, required this.settings});
  final GurbaniLine line;
  final Settings settings;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final scale = settings.fontScale;
    Widget meaning(String? text, {String? lang, bool italic = false, Color? color}) => text == null
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Text(text, style: TextStyle(fontSize: 15 * scale, height: 1.45, color: color ?? muted, fontStyle: italic ? FontStyle.italic : null)),
          );
    return InkWell(
      borderRadius: BorderRadius.circular(10),
      onLongPress: () => _actions(context),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 9),
        child: Column(
          crossAxisAlignment: line.header ? CrossAxisAlignment.center : CrossAxisAlignment.start,
          children: [
            if (settings.showGurmukhi) Text(line.gurmukhi, textAlign: line.header ? TextAlign.center : TextAlign.start, style: gurmukhiStyle(context, scale, header: line.header)),
            if (settings.showDevanagari)
              Text(line.devanagari,
                  textAlign: line.header ? TextAlign.center : TextAlign.start, style: devanagariStyle(context, scale, header: line.header, second: settings.showGurmukhi)),
            if (settings.showTranslit) meaning(line.translit, italic: true, color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.85)),
            if (settings.showPunjabi) meaning(line.punjabi),
            if (settings.showHindi) meaning(line.hindi),
            if (settings.showEnglish) meaning(line.english),
          ],
        ),
      ),
    );
  }

  void _actions(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(leading: const Icon(Icons.share_outlined), title: Text(tr('Share this line')), onTap: () {
            Navigator.pop(sheet);
            shareGurbani(context, heading: '', lines: [line]);
          }),
        ]),
      ),
    );
  }
}

/// "Couldn't load" with a retry button.
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.wifi_off_rounded, size: 48, color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Try again')),
          ]),
        ),
      );
}
