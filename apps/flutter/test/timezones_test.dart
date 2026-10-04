import 'package:dorago/core/timezones.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('searching by city finds the IANA timezone', () {
    expect(searchTimezones('new york'), contains('America/New_York'));
    expect(searchTimezones('TOKYO'), ['Asia/Tokyo']);
  });

  test('only real timezones are accepted', () {
    expect(isKnownTimezone('Europe/Lisbon'), isTrue);
    expect(isKnownTimezone('Mars/Base'), isFalse);
    expect(localToUtc(DateTime(2026, 11, 10, 11), 'Mars/Base'), isNull);
  });

  test('local wall-clock times convert to UTC with daylight saving', () {
    expect(
      localToUtc(DateTime(2026, 7, 1, 9), 'America/Chicago'),
      DateTime.utc(2026, 7, 1, 14),
    );
    expect(
      localToUtc(DateTime(2026, 12, 1, 9), 'America/Chicago'),
      DateTime.utc(2026, 12, 1, 15),
    );
  });

  test('a westbound flight that lands earlier on the clock is in order', () {
    final departs = localToUtc(DateTime(2026, 11, 18, 17, 30), 'Asia/Tokyo')!;
    final lands = localToUtc(
      DateTime(2026, 11, 18, 10, 45),
      'America/Los_Angeles',
    )!;
    expect(lands.isAfter(departs), isTrue);
  });
}
