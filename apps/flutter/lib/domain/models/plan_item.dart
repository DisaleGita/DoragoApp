enum PlanType {
  flight('flight'),
  lodging('lodging'),
  carRental('car_rental'),
  rail('rail'),
  bus('bus'),
  ferry('ferry'),
  cruise('cruise'),
  shuttle('shuttle'),
  rideshare('rideshare'),
  parking('parking'),
  dining('dining'),
  meeting('meeting'),
  event('event'),
  activity('activity'),
  tour('tour'),
  attraction('attraction'),
  ticket('ticket'),
  insurance('insurance'),
  visaAppointment('visa_appointment'),
  customNote('custom_note'),
  genericReservation('generic_reservation');

  const PlanType(this.wireValue);
  final String wireValue;

  static PlanType fromWire(String value) =>
      values.firstWhere((type) => type.wireValue == value);

  String get label => switch (this) {
    PlanType.carRental => 'Rental Car',
    PlanType.rail => 'Train',
    PlanType.rideshare => 'Taxi/Rideshare',
    PlanType.dining => 'Restaurant',
    PlanType.insurance => 'Travel Insurance',
    PlanType.visaAppointment => 'Visa Appointment',
    PlanType.customNote => 'Custom Note',
    PlanType.genericReservation => 'Generic Reservation',
    _ => '${name[0].toUpperCase()}${name.substring(1)}',
  };
}

class PlanItem {
  const PlanItem({
    required this.id,
    required this.tripId,
    required this.type,
    required this.title,
    required this.startLocal,
    required this.startTimezone,
    required this.startUtc,
    required this.version,
    this.endLocal,
    this.endTimezone,
    this.endUtc,
    this.providerName,
    this.confirmationNumber,
    this.locationName,
    this.address,
    this.costAmount,
    this.costCurrency,
    this.notes,
    this.websiteUrl,
    this.contactPhone,
    this.contactEmail,
    this.status = 'confirmed',
    this.details = const {},
  });

  factory PlanItem.fromJson(Map<String, dynamic> json) => PlanItem(
    id: json['id'] as String,
    tripId: json['trip_id'] as String,
    type: PlanType.fromWire(json['plan_type'] as String),
    title: json['title'] as String,
    startLocal: DateTime.parse(json['start_local'] as String),
    startTimezone: json['start_timezone'] as String,
    startUtc: DateTime.parse(json['start_utc'] as String).toUtc(),
    endLocal: json['end_local'] == null
        ? null
        : DateTime.parse(json['end_local'] as String),
    endTimezone: json['end_timezone'] as String?,
    endUtc: json['end_utc'] == null
        ? null
        : DateTime.parse(json['end_utc'] as String).toUtc(),
    providerName: json['provider_name'] as String?,
    confirmationNumber: json['confirmation_number'] as String?,
    locationName: json['location_name'] as String?,
    address: json['address'] as String?,
    costAmount: (json['cost_amount'] as num?)?.toDouble(),
    costCurrency: json['cost_currency'] as String?,
    notes: json['notes'] as String?,
    websiteUrl: json['website_url'] as String?,
    contactPhone: json['contact_phone'] as String?,
    contactEmail: json['contact_email'] as String?,
    status: json['status'] as String? ?? 'confirmed',
    details: json['details'] as Map<String, dynamic>? ?? const {},
    version: json['version'] as int,
  );

  final String id;
  final String tripId;
  final PlanType type;
  final String title;
  final DateTime startLocal;
  final String startTimezone;
  final DateTime startUtc;
  final DateTime? endLocal;
  final String? endTimezone;
  final DateTime? endUtc;
  final String? providerName;
  final String? confirmationNumber;
  final String? locationName;
  final String? address;
  final double? costAmount;
  final String? costCurrency;
  final String? notes;
  final String? websiteUrl;
  final String? contactPhone;
  final String? contactEmail;
  final String status;
  final Map<String, dynamic> details;
  final int version;
}
