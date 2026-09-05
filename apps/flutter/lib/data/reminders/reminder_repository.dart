import 'package:dorago/data/api/api_client.dart';

class ReminderRecord {
  const ReminderRecord({
    required this.id,
    required this.planId,
    required this.triggerAtUtc,
  });

  factory ReminderRecord.fromJson(Map<String, dynamic> json) => ReminderRecord(
    id: json['id'] as String,
    planId: json['plan_id'] as String,
    triggerAtUtc: DateTime.parse(json['trigger_at_utc'] as String).toUtc(),
  );

  final String id;
  final String planId;
  final DateTime triggerAtUtc;
}

class ReminderRepository {
  const ReminderRepository(this._api);
  final ApiClient _api;

  Future<ReminderRecord> create(String planId, String reminderType) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      'plans/$planId/reminders',
      data: {'reminder_type': reminderType},
    );
    return ReminderRecord.fromJson(response.data!);
  }

  Future<List<ReminderRecord>> listAll() async {
    final response = await _api.dio.get<List<dynamic>>('reminders');
    return response.data!
        .cast<Map<String, dynamic>>()
        .map(ReminderRecord.fromJson)
        .toList();
  }

  Future<void> delete(String reminderId) =>
      _api.dio.delete<void>('reminders/$reminderId');
}
