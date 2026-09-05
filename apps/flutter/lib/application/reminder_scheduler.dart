import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:timezone/data/latest_all.dart' as timezone_data;
import 'package:timezone/timezone.dart' as timezone;

class ReminderScheduler {
  ReminderScheduler(this._plugin);
  final FlutterLocalNotificationsPlugin _plugin;
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    timezone_data.initializeTimeZones();
    await _plugin.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
      ),
    );
    _initialized = true;
  }

  Future<void> requestPermission() async {
    await initialize();
    if (kIsWeb) {
      await _plugin
          .resolvePlatformSpecificImplementation<
            WebFlutterLocalNotificationsPlugin
          >()
          ?.requestNotificationsPermission();
      return;
    }
    await _plugin
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();
    await _plugin
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >()
        ?.requestPermissions(alert: true, badge: true, sound: true);
  }

  Future<void> schedule({
    required String reminderId,
    required String title,
    required DateTime triggerAtUtc,
    required String planId,
  }) async {
    await requestPermission();
    if (!triggerAtUtc.isAfter(DateTime.now().toUtc())) return;
    await _plugin.zonedSchedule(
      id: notificationId(reminderId),
      title: title,
      body: 'Your travel plan is coming up.',
      scheduledDate: timezone.TZDateTime.from(triggerAtUtc, timezone.UTC),
      notificationDetails: const NotificationDetails(
        android: AndroidNotificationDetails(
          'dorago_reminders',
          'Travel reminders',
          channelDescription: 'Notifications for itinerary plans',
        ),
        iOS: DarwinNotificationDetails(),
      ),
      androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
      payload: planId,
    );
  }

  Future<void> cancel(String reminderId) async {
    await initialize();
    await _plugin.cancel(id: notificationId(reminderId));
  }

  Future<void> cancelAll() async {
    await initialize();
    await _plugin.cancelAll();
  }

  int notificationId(String reminderId) =>
      int.parse(reminderId.replaceAll('-', '').substring(0, 8), radix: 16) &
      0x7fffffff;
}
