import 'package:flutter/services.dart';

/// Links into the app. A shared quiz is `https://www.sikhify.in/quiz?q=QUESTION_IDS&s=SCORE`:
/// with the app installed Android opens it here (App Links, verified by the website's
/// /.well-known/assetlinks.json); without it, the website shows a page with "Open in the app".
class Links {
  Links._();
  static const _channel = MethodChannel('in.sikhify.app/links');

  /// Opens what a link points to (set by the app's main screen).
  static void Function(Uri link)? onLink;

  /// Listens for links that arrive while the app is already open.
  static void listen() {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'link') {
        final uri = Uri.tryParse('${call.arguments}');
        if (uri != null) onLink?.call(uri);
      }
    });
  }

  /// The link that started the app, if it was opened from one.
  static Future<Uri?> initial() async {
    try {
      final s = await _channel.invokeMethod<String>('initialLink');
      return s == null ? null : Uri.tryParse(s);
    } catch (_) {
      return null; // not on Android (tests)
    }
  }

  /// The link to share for a set of quiz questions, with the sharer's score when they finished.
  static String quiz(List<String> questionIds, {int? score}) => Uri.https('www.sikhify.in', '/quiz', {
        'q': questionIds.join(','),
        if (score != null) 's': '$score',
      }).toString();

  /// The question ids and the friend's score in a quiz link (https://…/quiz?… or sikhify://quiz?…), or null.
  static ({List<String> ids, int? score})? parseQuiz(Uri link) {
    final isQuiz = link.path.startsWith('/quiz') || (link.scheme == 'sikhify' && link.host == 'quiz');
    if (!isQuiz) return null;
    final ids = (link.queryParameters['q'] ?? '').split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).take(10).toList();
    return (ids: ids, score: int.tryParse(link.queryParameters['s'] ?? ''));
  }
}
