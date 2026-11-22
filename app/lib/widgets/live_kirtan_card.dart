// Not shown in the app for now. To bring Live Kirtan back: put LiveKirtanCard() under the Hukamnama card on Home
// (and LiveKirtanCard(compact: true) at the top of Media), and re-add background audio (just_audio_background).
import 'package:flutter/material.dart';

import '../services/i18n.dart';
import '../services/live_kirtan.dart';
import '../services/settings.dart';
import '../theme.dart';
import 'audio_bar.dart';

/// Live Kirtan from Sri Harmandir Sahib: play or pause, and (unless [compact]) the choice of quality.
class LiveKirtanCard extends StatelessWidget {
  const LiveKirtanCard({super.key, this.compact = false});
  final bool compact;

  static String statusText(LiveStatus s) => switch (s) {
        LiveStatus.off => tr('Tap to listen'),
        LiveStatus.connecting => tr('Connecting…'),
        LiveStatus.playing => tr('Playing live'),
        LiveStatus.paused => tr('Paused'),
        LiveStatus.reconnecting => tr('Reconnecting…'),
        LiveStatus.failed => tr('Couldn’t connect. Check your internet and try again.'),
      };

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: Listenable.merge([LiveKirtan.status, Settings.instance]),
      builder: (context, _) {
        final s = LiveKirtan.status.value;
        final busy = s == LiveStatus.connecting || s == LiveStatus.reconnecting;
        final playing = s == LiveStatus.playing;
        final saver = Settings.instance.liveDataSaver;
        return Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 14, 14),
          decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(20)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    const LiveBadge(),
                    const SizedBox(width: 8),
                    Flexible(child: Text(tr('Sri Harmandir Sahib'), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Brand.gold, fontSize: 13, fontWeight: FontWeight.w700))),
                  ]),
                  const SizedBox(height: 5),
                  Text(tr(LiveKirtan.title), style: serif(23, color: Colors.white)),
                  const SizedBox(height: 3),
                  Text(statusText(s), style: const TextStyle(color: Colors.white70, fontSize: 13)),
                ]),
              ),
              const SizedBox(width: 10),
              IconButton.filled(
                iconSize: 34,
                style: IconButton.styleFrom(backgroundColor: Brand.gold, foregroundColor: Brand.navy, minimumSize: const Size.square(58)),
                tooltip: playing || busy ? tr('Pause') : tr('Play'),
                onPressed: LiveKirtan.toggle,
                icon: busy
                    ? const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 3, color: Brand.navy))
                    : Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded),
              ),
            ]),
            if (!compact) ...[
              const SizedBox(height: 12),
              Row(children: [
                Expanded(child: _Quality(label: tr('Normal'), detail: '43 MB/hr', selected: !saver, onTap: () => LiveKirtan.setDataSaver(false))),
                const SizedBox(width: 8),
                Expanded(child: _Quality(label: tr('Data saver'), detail: '13 MB/hr', selected: saver, onTap: () => LiveKirtan.setDataSaver(true))),
              ]),
              const SizedBox(height: 8),
              Text(tr('Live audio from the SGPC, Sri Amritsar'), style: const TextStyle(color: Colors.white54, fontSize: 11)),
            ],
          ]),
        );
      },
    );
  }
}

class _Quality extends StatelessWidget {
  const _Quality({required this.label, required this.detail, required this.selected, required this.onTap});
  final String label, detail;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
        selected: selected,
        button: true,
        child: Material(
          color: selected ? Brand.gold : Colors.white12,
          borderRadius: BorderRadius.circular(12),
          child: InkWell(
            borderRadius: BorderRadius.circular(12),
            onTap: onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 48),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: selected ? Brand.navy : Colors.white, fontSize: 13, fontWeight: FontWeight.w800)),
                  Text(detail, maxLines: 1, style: TextStyle(color: selected ? Brand.navy : Colors.white60, fontSize: 11)),
                ]),
              ),
            ),
          ),
        ),
      );
}
