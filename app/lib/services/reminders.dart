import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as tzdata;
import 'package:timezone/timezone.dart' as tz;

import 'i18n.dart';
import 'settings.dart';

/// A daily reminder the reader can switch on, with its default time.
class ReminderKind {
  const ReminderKind(this.key, this.id, this.title, this.body, this.defaultMinutes);
  final String key;
  final int id;
  final String title, body;
  final int defaultMinutes;
}

/// Daily reminders scheduled on the phone (no server, no account): Nitnem times and the Hukamnama.
class Reminders {
  Reminders._();

  static const kinds = [
    ReminderKind('morning', 1, 'Morning Nitnem', 'Amrit Vela: time for Japji Sahib and the morning Banis.', 5 * 60),
    ReminderKind('hukamnama', 2, 'Today’s Hukamnama', 'Read and listen to today’s Hukamnama from Sri Harmandir Sahib.', 7 * 60),
    ReminderKind('evening', 3, 'Rehras Sahib', 'Evening Nitnem: time for Rehras Sahib.', 18 * 60 + 30),
    ReminderKind('night', 4, 'Sohila Sahib', 'Before sleep: Sohila Sahib.', 21 * 60 + 30),
    ReminderKind('quiz', 5, 'Daily Quiz', '5 new questions are ready. Can you get them all right?', 16 * 60),
  ];

  /// Opens the screen a tapped reminder is about (set by the app's main screen); gets the reminder's key.
  static void Function(String key)? onOpen;

  /// The reminder that started the app, if it was opened from one (asked once, at start).
  static Future<String?> launchedFrom() async {
    await init();
    final details = await _plugin.getNotificationAppLaunchDetails();
    return details?.didNotificationLaunchApp == true ? details?.notificationResponse?.payload : null;
  }

  static final _plugin = FlutterLocalNotificationsPlugin();
  static bool _ready = false;

  static Future<void> init() async {
    if (_ready) return;
    try {
      tzdata.initializeTimeZones();
      final zone = await FlutterTimezone.getLocalTimezone();
      tz.setLocalLocation(tz.getLocation(zone.identifier));
    } catch (e) {
      debugPrint('Time zone not found, using UTC: $e');
    }
    await _plugin.initialize(
      settings: const InitializationSettings(android: AndroidInitializationSettings('@mipmap/ic_launcher')),
      onDidReceiveNotificationResponse: (r) {
        if (r.payload != null) onOpen?.call(r.payload!);
      },
    );
    _ready = true;
  }

  /// Asks Android 13+ for permission to show notifications. False when refused.
  static Future<bool> requestPermission() async {
    await init();
    final android = _plugin.resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
    return await android?.requestNotificationsPermission() ?? true;
  }

  /// Turns a reminder on at `minutes` after midnight, or off when null.
  static Future<void> set(ReminderKind kind, int? minutes) async {
    await init();
    Settings.instance.setReminder(kind.key, minutes);
    await _plugin.cancel(id: kind.id);
    if (minutes == null) return;
    final now = tz.TZDateTime.now(tz.local);
    var at = tz.TZDateTime(tz.local, now.year, now.month, now.day, minutes ~/ 60, minutes % 60);
    if (!at.isAfter(now)) at = at.add(const Duration(days: 1));
    await _plugin.zonedSchedule(
      id: kind.id,
      title: tr(kind.title),
      body: tr(kind.body),
      scheduledDate: at,
      payload: kind.key,
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails('daily', 'Daily reminders', channelDescription: 'Nitnem and Hukamnama reminders', importance: Importance.high, priority: Priority.high),
      ),
      // Inexact is fine for a reminder and needs no "exact alarm" permission.
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      matchDateTimeComponents: DateTimeComponents.time,
    );
  }

  /// Re-schedules the saved reminders (after an update the schedule is kept, but this keeps it in step).
  static Future<void> restore() async {
    for (final k in kinds) {
      final m = Settings.instance.reminder(k.key);
      if (m != null) await set(k, m);
    }
  }
}
