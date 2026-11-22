// Live Kirtan is switched off for now (no card on Home or Media). To bring it back, see live_kirtan_card.dart.
import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import '../widgets/audio_bar.dart';
import 'settings.dart';

enum LiveStatus { off, connecting, playing, paused, reconnecting, failed }

/// The SGPC's live Kirtan broadcast from Sri Harmandir Sahib (the streams on sgpc.net/live-kirtan).
/// Reconnects by itself when the internet drops, and rejoins the broadcast at the live moment after a pause.
class LiveKirtan {
  LiveKirtan._();

  static const normalUrl = 'https://live.sgpc.net:8443/;';
  static const dataSaverUrl = 'https://live.sgpc.net:8442/;';
  static const title = 'Live Kirtan';
  static const subtitle = 'Sri Harmandir Sahib, Amritsar';

  /// About two and a half minutes of trying before asking the listener to try again.
  static const maxRetries = 8;
  static const _loadTimeout = Duration(seconds: 20);
  static const _stallTimeout = Duration(seconds: 25);

  static final status = ValueNotifier<LiveStatus>(LiveStatus.off);

  static bool _listening = false, _wanted = false, _connecting = false;
  static int _retries = 0;
  static Timer? _retry, _stall;

  static bool get isOn => Audio.nowPlaying.value?.live ?? false;
  static String get url => Settings.instance.liveDataSaver ? dataSaverUrl : normalUrl;

  /// How long to wait before reconnect number [attempt]: 2, 4, 8, 16, then 30 seconds.
  static Duration retryDelay(int attempt) => Duration(seconds: math.min(30, 1 << attempt.clamp(1, 5)));

  /// Play when stopped or paused; pause when playing or still connecting.
  static Future<void> toggle() async {
    final s = status.value;
    if (s == LiveStatus.playing || s == LiveStatus.connecting || s == LiveStatus.reconnecting) {
      _wanted = false;
      _clearTimers();
      status.value = LiveStatus.paused;
      await Audio.player.pause();
    } else {
      await start();
    }
  }

  static Future<void> start() async {
    _listen();
    _wanted = true;
    _retries = 0;
    _clearTimers();
    status.value = LiveStatus.connecting;
    await _connect();
  }

  /// Saves the quality, switching straight away if the broadcast is playing.
  static Future<void> setDataSaver(bool on) async {
    if (Settings.instance.liveDataSaver == on) return;
    Settings.instance.liveDataSaver = on;
    if (isOn && _wanted) await start();
  }

  static void _listen() {
    if (_listening) return;
    _listening = true;
    Audio.player.playerStateStream.listen(_onState, onError: (Object _) {});
    Audio.player.playbackEventStream.listen((_) {}, onError: (Object _) {
      if (!_connecting) _lost();
    });
    Audio.nowPlaying.addListener(_onNowPlaying);
  }

  /// The player was closed, or another recording took over.
  static void _onNowPlaying() {
    if (isOn) return;
    _wanted = false;
    _clearTimers();
    status.value = LiveStatus.off;
  }

  static Future<void> _connect() async {
    if (!_wanted) return;
    _connecting = true;
    try {
      await Audio.load(url, title: title, subtitle: subtitle, live: true).timeout(_loadTimeout);
      _connecting = false;
      if (!_wanted) return;
      unawaited(Audio.player.play().catchError((Object _) {}));
      _onState(Audio.player.playerState);
    } catch (_) {
      _connecting = false;
      _lost();
    }
  }

  static void _onState(PlayerState s) {
    if (!isOn || _connecting) return;
    if (s.playing) _wanted = true;
    switch (s.processingState) {
      case ProcessingState.ready:
        _clearTimers();
        if (s.playing) {
          _retries = 0;
          status.value = LiveStatus.playing;
        } else {
          _wanted = false;
          status.value = LiveStatus.paused;
        }
      case ProcessingState.loading || ProcessingState.buffering:
        if (s.playing) {
          _stall ??= Timer(_stallTimeout, () {
            _stall = null;
            _lost();
          });
        }
      case ProcessingState.completed || ProcessingState.idle:
        if (_wanted) _lost(); // a broadcast never ends by itself: the connection was lost
    }
  }

  static void _lost() {
    if (!_wanted || (_retry?.isActive ?? false)) return;
    _stall?.cancel();
    _stall = null;
    _retries++;
    if (_retries > maxRetries) {
      unawaited(_giveUp());
      return;
    }
    status.value = LiveStatus.reconnecting;
    _retry = Timer(retryDelay(_retries), _connect);
  }

  static Future<void> _giveUp() async {
    _wanted = false;
    _clearTimers();
    await Audio.stop();
    status.value = LiveStatus.failed;
  }

  static void _clearTimers() {
    _retry?.cancel();
    _stall?.cancel();
    _retry = null;
    _stall = null;
  }
}
