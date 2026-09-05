import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/domain/models/plan_item.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class PlanFormDialog extends ConsumerStatefulWidget {
  const PlanFormDialog({required this.tripId, this.plan, super.key});
  final String tripId;
  final PlanItem? plan;
  @override
  ConsumerState<PlanFormDialog> createState() => _PlanFormDialogState();
}

class _PlanFormDialogState extends ConsumerState<PlanFormDialog> {
  final formKey = GlobalKey<FormState>();
  late PlanType type;
  late final TextEditingController title;
  late final TextEditingController timezone;
  late final TextEditingController endTimezone;
  late final TextEditingController provider;
  late final TextEditingController confirmation;
  late final TextEditingController location;
  late final TextEditingController address;
  late final TextEditingController cost;
  late final TextEditingController currency;
  late final TextEditingController notes;
  late final TextEditingController website;
  late final TextEditingController phone;
  late final TextEditingController email;
  late Map<String, dynamic> details;
  late DateTime start;
  DateTime? end;
  bool busy = false;
  String? error;

  @override
  void initState() {
    super.initState();
    final existing = widget.plan;
    type = existing?.type ?? PlanType.flight;
    title = TextEditingController(text: existing?.title);
    timezone = TextEditingController(text: existing?.startTimezone ?? 'UTC');
    endTimezone = TextEditingController(text: existing?.endTimezone ?? '');
    provider = TextEditingController(text: existing?.providerName);
    confirmation = TextEditingController(text: existing?.confirmationNumber);
    location = TextEditingController(text: existing?.locationName);
    address = TextEditingController(text: existing?.address);
    cost = TextEditingController(text: existing?.costAmount?.toString());
    currency = TextEditingController(text: existing?.costCurrency);
    notes = TextEditingController(text: existing?.notes);
    website = TextEditingController(text: existing?.websiteUrl);
    phone = TextEditingController(text: existing?.contactPhone);
    email = TextEditingController(text: existing?.contactEmail);
    details = Map<String, dynamic>.from(existing?.details ?? const {});
    start =
        existing?.startLocal ?? DateTime.now().add(const Duration(hours: 1));
    end = existing?.endLocal;
  }

  @override
  void dispose() {
    for (final controller in [
      title,
      timezone,
      endTimezone,
      provider,
      confirmation,
      location,
      address,
      cost,
      currency,
      notes,
      website,
      phone,
      email,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<DateTime?> chooseDateTime(DateTime initial) async {
    final date = await showDatePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDate: initial,
    );
    if (date == null || !mounted) return null;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(initial),
    );
    if (time == null) return null;
    return DateTime(date.year, date.month, date.day, time.hour, time.minute);
  }

  String localIso(DateTime value) =>
      DateFormat("yyyy-MM-dd'T'HH:mm:ss").format(value);

  Future<void> save() async {
    if (!formKey.currentState!.validate() || busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    final values = <String, dynamic>{
      'plan_type': type.wireValue,
      'title': title.text.trim(),
      'start_local': localIso(start),
      'start_timezone': timezone.text.trim(),
      'end_local': end == null ? null : localIso(end!),
      'end_timezone': end == null
          ? null
          : endTimezone.text.trim().isEmpty
          ? timezone.text.trim()
          : endTimezone.text.trim(),
      'is_all_day': false,
      'provider_name': nullable(provider.text),
      'confirmation_number': nullable(confirmation.text),
      'location_name': nullable(location.text),
      'address': nullable(address.text),
      'cost_amount': nullableNumber(cost.text),
      'cost_currency': nullable(currency.text)?.toUpperCase(),
      'notes': nullable(notes.text),
      'website_url': nullable(website.text),
      'contact_phone': nullable(phone.text),
      'contact_email': nullable(email.text),
      'status': widget.plan?.status ?? 'confirmed',
      'assigned_traveler_names': <String>[],
      'details': details,
    };
    try {
      final repository = ref.read(tripRepositoryProvider);
      if (widget.plan case final plan?) {
        await repository.updatePlan(plan, values);
      } else {
        await repository.createPlan(widget.tripId, values);
      }
      ref.invalidate(plansProvider(widget.tripId));
      ref.invalidate(tripsProvider);
      if (mounted) Navigator.pop(context, true);
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  String? nullable(String value) => value.trim().isEmpty ? null : value.trim();

  dynamic nullableNumber(String value) {
    final cleaned = value.trim();
    return cleaned.isEmpty ? null : double.tryParse(cleaned) ?? cleaned;
  }

  dynamic detailValue(String key, String value) {
    final cleaned = value.trim();
    if (cleaned.isEmpty) return null;
    if ({'party_size', 'ticket_count'}.contains(key)) {
      return int.tryParse(cleaned) ?? cleaned;
    }
    if (key == 'deposit_amount') {
      return double.tryParse(cleaned) ?? cleaned;
    }
    if ({'guest_names', 'stops', 'applicant_names'}.contains(key)) {
      return cleaned
          .split(',')
          .map((item) => item.trim())
          .where((item) => item.isNotEmpty)
          .toList();
    }
    return cleaned;
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.plan == null ? 'Add a plan' : 'Edit plan'),
    content: SizedBox(
      width: 520,
      child: Form(
        key: formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField<PlanType>(
                initialValue: type,
                decoration: const InputDecoration(labelText: 'Plan type'),
                items: PlanType.values
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(value.label),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() {
                  if (value != type) details = {};
                  type = value!;
                }),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: requiredValue,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: provider,
                decoration: const InputDecoration(
                  labelText: 'Provider or operator',
                ),
              ),
              const SizedBox(height: 12),
              _DateTimeButton(
                label: 'Starts',
                value: start,
                onTap: () async {
                  final value = await chooseDateTime(start);
                  if (value != null) setState(() => start = value);
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: timezone,
                decoration: const InputDecoration(
                  labelText: 'Start IANA timezone',
                ),
                validator: requiredValue,
              ),
              const SizedBox(height: 12),
              _DateTimeButton(
                label: end == null ? 'Add end time' : 'Ends',
                value: end,
                onTap: () async {
                  final value = await chooseDateTime(
                    end ?? start.add(const Duration(hours: 1)),
                  );
                  if (value != null) setState(() => end = value);
                },
                clear: end == null ? null : () => setState(() => end = null),
              ),
              if (end != null) ...[
                const SizedBox(height: 12),
                TextFormField(
                  controller: endTimezone,
                  decoration: const InputDecoration(
                    labelText: 'End IANA timezone',
                    hintText: 'Defaults to start timezone',
                  ),
                ),
              ],
              const SizedBox(height: 12),
              TextFormField(
                controller: confirmation,
                decoration: const InputDecoration(
                  labelText: 'Confirmation number',
                ),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: location,
                decoration: const InputDecoration(labelText: 'Location'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: address,
                decoration: const InputDecoration(labelText: 'Address'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: cost,
                      keyboardType: const TextInputType.numberWithOptions(
                        decimal: true,
                      ),
                      decoration: const InputDecoration(labelText: 'Cost'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  SizedBox(
                    width: 120,
                    child: TextFormField(
                      controller: currency,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'Currency',
                        hintText: 'USD',
                      ),
                    ),
                  ),
                ],
              ),
              for (final field in _detailFields(type)) ...[
                const SizedBox(height: 12),
                TextFormField(
                  key: ValueKey('${type.wireValue}-$field'),
                  initialValue: details[field] is List
                      ? (details[field] as List).join(', ')
                      : details[field]?.toString(),
                  decoration: InputDecoration(labelText: _fieldLabel(field)),
                  keyboardType:
                      {
                        'party_size',
                        'ticket_count',
                        'deposit_amount',
                      }.contains(field)
                      ? const TextInputType.numberWithOptions(decimal: true)
                      : TextInputType.text,
                  onChanged: (value) {
                    final parsed = detailValue(field, value);
                    if (parsed == null) {
                      details.remove(field);
                    } else {
                      details[field] = parsed;
                    }
                  },
                ),
              ],
              const SizedBox(height: 12),
              TextFormField(
                controller: website,
                keyboardType: TextInputType.url,
                decoration: const InputDecoration(labelText: 'Website'),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: phone,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Contact phone',
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(
                        labelText: 'Contact email',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: notes,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Notes'),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: 12),
                  child: Text(
                    error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: busy ? null : () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: busy ? null : save,
        child: Text(busy ? 'Saving…' : 'Save plan'),
      ),
    ],
  );
}

List<String> _detailFields(PlanType type) => switch (type) {
  PlanType.flight => const [
    'airline',
    'flight_number',
    'departure_airport',
    'arrival_airport',
    'departure_terminal',
    'departure_gate',
    'arrival_terminal',
    'arrival_gate',
    'record_locator',
    'ticket_number',
    'seat',
    'cabin_class',
    'aircraft',
    'boarding_group',
    'baggage_claim',
  ],
  PlanType.lodging => const [
    'property_name',
    'room_type',
    'guest_names',
    'cancellation_policy',
    'deposit_amount',
  ],
  PlanType.carRental => const [
    'rental_company',
    'pickup_location',
    'dropoff_location',
    'car_class',
    'membership_number',
    'insurance_policy',
    'fuel_policy',
    'driver_name',
  ],
  PlanType.rail ||
  PlanType.bus ||
  PlanType.ferry ||
  PlanType.cruise ||
  PlanType.shuttle ||
  PlanType.rideshare => const [
    'carrier',
    'departure_station',
    'arrival_station',
    'pickup_location',
    'dropoff_location',
    'route_number',
    'platform',
    'train_number',
    'seat_number',
    'coach_number',
    'ticket_number',
    'stops',
  ],
  PlanType.parking => const [
    'facility_name',
    'space_number',
    'vehicle_description',
  ],
  PlanType.dining => const [
    'venue_name',
    'party_size',
    'booking_reference',
    'dress_code',
    'cancellation_policy',
    'seating_area',
  ],
  PlanType.meeting ||
  PlanType.event ||
  PlanType.activity ||
  PlanType.tour ||
  PlanType.attraction ||
  PlanType.ticket => const [
    'venue_name',
    'ticket_count',
    'booking_reference',
    'organizer',
    'dress_code',
    'meeting_point',
    'ticket_type',
    'party_size',
  ],
  PlanType.insurance => const [
    'insurer',
    'policy_number',
    'coverage_summary',
    'emergency_phone',
  ],
  PlanType.visaAppointment => const [
    'consulate_name',
    'applicant_names',
    'appointment_reference',
    'visa_type',
  ],
  PlanType.genericReservation => const [
    'reservation_kind',
    'party_size',
    'booking_reference',
  ],
  PlanType.customNote => const [],
};

String _fieldLabel(String field) => field
    .split('_')
    .map((word) => '${word[0].toUpperCase()}${word.substring(1)}')
    .join(' ');

String? requiredValue(String? value) =>
    value == null || value.trim().isEmpty ? 'Required' : null;

class _DateTimeButton extends StatelessWidget {
  const _DateTimeButton({
    required this.label,
    required this.value,
    required this.onTap,
    this.clear,
  });
  final String label;
  final DateTime? value;
  final VoidCallback onTap;
  final VoidCallback? clear;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: OutlinedButton.icon(
          onPressed: onTap,
          icon: const Icon(Icons.event),
          label: Text(
            value == null
                ? label
                : '$label · ${DateFormat.yMMMd().add_jm().format(value!)}',
          ),
        ),
      ),
      if (clear != null)
        IconButton(
          onPressed: clear,
          tooltip: 'Remove end time',
          icon: const Icon(Icons.close),
        ),
    ],
  );
}
