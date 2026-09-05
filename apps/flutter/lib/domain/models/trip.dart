class Trip {
  const Trip({
    required this.id,
    required this.title,
    required this.primaryDestination,
    required this.startDate,
    required this.endDate,
    required this.timezone,
    required this.status,
    required this.version,
    this.planCount = 0,
    this.totalCostGrouped = const {},
    this.isArchived = false,
    this.notes,
  });

  factory Trip.fromJson(Map<String, dynamic> json) => Trip(
    id: json['id'] as String,
    title: json['title'] as String,
    primaryDestination: json['primary_destination'] as String,
    startDate: DateTime.parse(json['start_date'] as String),
    endDate: DateTime.parse(json['end_date'] as String),
    timezone: json['timezone'] as String,
    status: json['status'] as String,
    version: json['version'] as int,
    planCount: json['plan_count'] as int? ?? 0,
    totalCostGrouped:
        (json['total_cost_grouped'] as Map<String, dynamic>? ?? {}).map(
          (key, value) => MapEntry(key, (value as num).toDouble()),
        ),
    isArchived: json['is_archived'] as bool? ?? false,
    notes: json['notes'] as String?,
  );

  final String id;
  final String title;
  final String primaryDestination;
  final DateTime startDate;
  final DateTime endDate;
  final String timezone;
  final String status;
  final int version;
  final int planCount;
  final Map<String, double> totalCostGrouped;
  final bool isArchived;
  final String? notes;
}
