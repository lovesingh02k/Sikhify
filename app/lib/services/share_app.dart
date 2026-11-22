import 'dart:io';

import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Sharing Sikhify with someone: the app file itself (APK) or the website link.
class ShareApp {
  ShareApp._();
  static const _channel = MethodChannel('in.sikhify.app/apk');
  static const link = 'https://www.sikhify.in';

  /// Shares a copy of the installed app as "Sikhify.apk" (WhatsApp, Bluetooth, Nearby Share…).
  /// Returns false when that isn't possible (then share [shareLink] instead).
  static Future<bool> shareApk() async {
    try {
      if (await _channel.invokeMethod<bool>('isSplit') == true) return false;
      final source = await _channel.invokeMethod<String>('apkPath');
      if (source == null) return false;
      // The installed file is called base.apk; a copy with a clear name is what gets sent.
      final dir = await getTemporaryDirectory();
      final copy = await File(source).copy('${dir.path}/Sikhify.apk');
      await SharePlus.instance.share(ShareParams(
        files: [XFile(copy.path, mimeType: 'application/vnd.android.package-archive', name: 'Sikhify.apk')],
        text: 'Sikhify app — Nitnem, Gurbani, Hukamnama and more. Open Sikhify.apk to install it.',
      ));
      return true;
    } catch (_) {
      return false;
    }
  }

  static Future<void> shareLink() => SharePlus.instance.share(ShareParams(text: 'Sikhify — Nitnem, Gurbani, Hukamnama and more: $link'));
}
