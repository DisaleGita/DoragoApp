import 'package:dorago/domain/models/plan_item.dart';
import 'package:flutter_test/flutter_test.dart';

Map<String, dynamic> _planJson(Object? costAmount) => {
  'id': 'plan-1',
  'trip_id': 'trip-1',
  'plan_type': 'flight',
  'title': 'SFO → HND',
  'start_local': '2026-11-10T11:05:00',
  'start_timezone': 'America/Los_Angeles',
  'start_utc': '2026-11-10T19:05:00Z',
  'cost_amount': costAmount,
  'cost_currency': 'USD',
  'version': 1,
};

void main() {
  test('cost amounts sent as API decimal strings are parsed', () {
    expect(PlanItem.fromJson(_planJson('2369.20')).costAmount, 2369.20);
  });

  test('numeric and missing cost amounts are still accepted', () {
    expect(PlanItem.fromJson(_planJson(12.5)).costAmount, 12.5);
    expect(PlanItem.fromJson(_planJson(null)).costAmount, isNull);
  });
}
