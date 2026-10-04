import 'package:flutter_timezone/flutter_timezone.dart';
import 'package:timezone/data/latest_all.dart' as timezone_data;
import 'package:timezone/timezone.dart' as timezone;

const fallbackTimezone = 'UTC';

bool _loaded = false;

void ensureTimezoneData() {
  if (_loaded) return;
  timezone_data.initializeTimeZones();
  _loaded = true;
}

/// Every IANA identifier the client can convert, sorted for pickers.
List<String> timezoneNames() {
  ensureTimezoneData();
  return timezone.timeZoneDatabase.locations.keys.toList()..sort();
}

bool isKnownTimezone(String name) {
  ensureTimezoneData();
  return timezone.timeZoneDatabase.locations.containsKey(name);
}

/// Matches identifiers by city or region, so "new york" finds
/// "America/New_York".
List<String> searchTimezones(String query, {int limit = 50}) {
  final needle = query.trim().toLowerCase().replaceAll(' ', '_');
  final names = timezoneNames();
  if (needle.isEmpty) return names.take(limit).toList();
  return names
      .where((name) => name.toLowerCase().contains(needle))
      .take(limit)
      .toList();
}

/// Converts a wall-clock time in [zone] to UTC, or returns null when the zone
/// is unknown.
DateTime? localToUtc(DateTime local, String zone) {
  if (!isKnownTimezone(zone)) return null;
  return timezone.TZDateTime(
    timezone.getLocation(zone),
    local.year,
    local.month,
    local.day,
    local.hour,
    local.minute,
    local.second,
  ).toUtc();
}

/// The device's IANA timezone, or UTC when the platform cannot report a zone
/// the client understands.
Future<String> detectDeviceTimezone() async {
  try {
    final detected = (await FlutterTimezone.getLocalTimezone()).identifier;
    return isKnownTimezone(detected) ? detected : fallbackTimezone;
  } on Object {
    return fallbackTimezone;
  }
}
