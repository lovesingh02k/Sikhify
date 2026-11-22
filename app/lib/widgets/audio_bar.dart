import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';

import '../services/live_kirtan.dart';
import '../theme.dart';

/// What is playing, for the mini player.
class NowPlaying {
  const NowPlaying(this.url, this.title, this.subtitle, {this.live = false});
  final String url, title, subtitle;

  /// A live broadcast: no length and nothing to seek to.
  final bool live;
}

/// One player for the whole app, so starting a recording stops the one before it.
class Audio {
  Audio._();
  static final player = AudioPlayer();
  static final nowPlaying = ValueNotifier<NowPlaying?>(null);
  static String? get current => nowPlaying.value?.url;

  /// Gets a recording or broadcast ready. A live broadcast stays "now playing" if it fails, so it can reconnect.
  static Future<void> load(String url, {required String title, String subtitle = '', bool live = false}) async {
    nowPlaying.value = NowPlaying(url, title, subtitle, live: live);
    try {
      await player.setUrl(url);
    } catch (e) {
      if (!live) nowPlaying.value = null;
      rethrow;
    }
  }

  static Future<void> play(String url, {String title = 'Gurbani', String subtitle = ''}) async {
    if (current != url) await load(url, title: title, subtitle: subtitle);
    await player.play();
  }

  static Future<void> stop() async {
    await player.stop();
    nowPlaying.value = null;
  }
}

String formatDuration(Duration d) {
  final h = d.inHours, m = d.inMinutes.remainder(60), s = d.inSeconds.remainder(60);
  return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}' : '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
}

/// A play card on a reading screen: starts this recording (the mini player then follows it everywhere).
class AudioBar extends StatefulWidget {
  const AudioBar({super.key, required this.url, required this.label, this.credit, this.title, this.subtitle});
  final String url;
  final String label;
  final String? credit;

  /// Shown in the mini player.
  final String? title, subtitle;

  @override
  State<AudioBar> createState() => _AudioBarState();
}

class _AudioBarState extends State<AudioBar> {
  String? _error;
  bool _loading = false;

  bool get _mine => Audio.current == widget.url;

  Future<void> _toggle() async {
    final p = Audio.player;
    if (_mine && p.playing) return p.pause();
    setState(() { _loading = true; _error = null; });
    try {
      await Audio.play(widget.url, title: widget.title ?? widget.label, subtitle: widget.subtitle ?? widget.credit ?? '');
    } catch (_) {
      if (mounted) setState(() => _error = 'This recording isn’t available right now.');
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final p = Audio.player;
    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 6, 14, 6),
        child: StreamBuilder<PlayerState>(
          stream: p.playerStateStream,
          builder: (context, snap) {
            final playing = _mine && (snap.data?.playing ?? false) && snap.data?.processingState != ProcessingState.completed;
            return Row(children: [
              IconButton.filled(
                style: IconButton.styleFrom(backgroundColor: Brand.gold, foregroundColor: Brand.navy),
                onPressed: _loading ? null : _toggle,
                icon: _loading
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2.4, color: Brand.navy))
                    : Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded),
                tooltip: playing ? 'Pause' : 'Play',
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
                  Text(widget.label, style: const TextStyle(fontWeight: FontWeight.w700), maxLines: 1, overflow: TextOverflow.ellipsis),
                  if (_error != null)
                    Text(_error!, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.error))
                  else if (widget.credit != null)
                    Text(_mine ? (playing ? 'Playing' : 'Paused') : widget.credit!, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant), maxLines: 1, overflow: TextOverflow.ellipsis),
                ]),
              ),
            ]);
          },
        ),
      ),
    );
  }
}

/// The red "LIVE" tag.
class LiveBadge extends StatelessWidget {
  const LiveBadge({super.key});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(color: const Color(0xFFD32F2F), borderRadius: BorderRadius.circular(5)),
        child: const Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 10, height: 1.2, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
      );
}

/// The navy player above the bottom navigation while something plays (as in the Gurbani design).
class MiniPlayer extends StatelessWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<NowPlaying?>(
      valueListenable: Audio.nowPlaying,
      builder: (context, now, _) {
        if (now == null) return const SizedBox.shrink();
        final p = Audio.player;
        return Container(
          margin: const EdgeInsets.fromLTRB(12, 0, 12, 8),
          padding: const EdgeInsets.fromLTRB(12, 10, 8, 8),
          decoration: BoxDecoration(color: Brand.navy, borderRadius: BorderRadius.circular(20), boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4))]),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Row(children: [
              const KhandaBadge(size: 40),
              const SizedBox(width: 10),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    if (now.live) ...[const LiveBadge(), const SizedBox(width: 6)],
                    Flexible(child: Text(now.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700))),
                  ]),
                  if (now.subtitle.isNotEmpty) Text(now.subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white60, fontSize: 12)),
                ]),
              ),
              StreamBuilder<PlayerState>(
                stream: p.playerStateStream,
                builder: (context, s) {
                  final st = s.data;
                  final loading = st?.processingState == ProcessingState.loading || st?.processingState == ProcessingState.buffering;
                  final playing = (st?.playing ?? false) && st?.processingState != ProcessingState.completed;
                  return IconButton.filled(
                    style: IconButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Brand.navy),
                    tooltip: playing ? 'Pause' : 'Play',
                    onPressed: () => now.live ? LiveKirtan.toggle() : (playing ? p.pause() : (st?.processingState == ProcessingState.completed ? p.seek(Duration.zero).then((_) => p.play()) : p.play())),
                    icon: loading && playing
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.2, color: Brand.navy))
                        : Icon(playing ? Icons.pause_rounded : Icons.play_arrow_rounded),
                  );
                },
              ),
              IconButton(tooltip: 'Close player', onPressed: Audio.stop, icon: const Icon(Icons.close_rounded, color: Colors.white70)),
            ]),
            if (!now.live) StreamBuilder<Duration>(
              stream: p.positionStream,
              builder: (context, pos) {
                final total = p.duration ?? Duration.zero;
                final at = pos.data ?? Duration.zero;
                return Row(children: [
                  Expanded(
                    child: SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 3,
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                        overlayShape: SliderComponentShape.noOverlay,
                        activeTrackColor: Colors.white,
                        inactiveTrackColor: Colors.white24,
                        thumbColor: Colors.white,
                      ),
                      child: Slider(
                        value: total.inMilliseconds == 0 ? 0 : at.inMilliseconds.clamp(0, total.inMilliseconds) / total.inMilliseconds,
                        onChanged: total == Duration.zero ? null : (v) => p.seek(total * v),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text('${formatDuration(at)} / ${formatDuration(total)}', style: const TextStyle(color: Colors.white70, fontSize: 11)),
                  const SizedBox(width: 6),
                ]);
              },
            ),
          ]),
        );
      },
    );
  }
}
