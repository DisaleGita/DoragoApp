import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/domain/models/plan_item.dart';
import 'package:dorago/domain/models/trip.dart';
import 'package:dorago/presentation/shared/app_shell.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ImportScreen extends ConsumerStatefulWidget {
  const ImportScreen({this.initialTripId, super.key});
  final String? initialTripId;
  @override
  ConsumerState<ImportScreen> createState() => _ImportScreenState();
}

class _ImportScreenState extends ConsumerState<ImportScreen> {
  static const newTripValue = '__new_trip__';
  final source = TextEditingController();
  final newTripTitle = TextEditingController();
  final newTripDestination = TextEditingController();
  final newTripStartDate = TextEditingController();
  final newTripEndDate = TextEditingController();
  final newTripTimezone = TextEditingController();
  bool busy = false;
  String? error;
  Map<String, dynamic>? review;
  final selected = <String>{};
  final overrides = <String, Map<String, dynamic>>{};
  String? targetTripId;
  bool createNewTrip = false;

  @override
  void initState() {
    super.initState();
    targetTripId = widget.initialTripId;
  }

  @override
  void dispose() {
    for (final controller in [
      source,
      newTripTitle,
      newTripDestination,
      newTripStartDate,
      newTripEndDate,
      newTripTimezone,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> parseText() async {
    if (source.text.trim().isEmpty) return;
    await _parse(
      () => ref
          .read(importRepositoryProvider)
          .parseText(source.text.trim(), tripId: targetTripId),
    );
  }

  Future<void> chooseFile() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: const ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
    );
    if (file == null) return;
    final bytes = await file.readAsBytes();
    await _parse(
      () => ref
          .read(importRepositoryProvider)
          .parseFile(fileName: file.name, bytes: bytes, tripId: targetTripId),
    );
  }

  Future<void> _parse(Future<Map<String, dynamic>> Function() operation) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await operation();
      final proposals = (result['plans'] as List<dynamic>)
          .cast<Map<String, dynamic>>();
      setState(() {
        review = result;
        if (createNewTrip) {
          newTripTitle.text = result['proposed_trip_title'] as String? ?? '';
          newTripDestination.text =
              result['proposed_destination'] as String? ?? '';
          newTripStartDate.text =
              result['proposed_start_date'] as String? ?? '';
          newTripEndDate.text = result['proposed_end_date'] as String? ?? '';
        }
        selected
          ..clear()
          ..addAll(
            proposals.map((proposal) => proposal['proposal_id'] as String),
          );
        overrides.clear();
      });
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> accept() async {
    final current = review;
    if (current == null || selected.isEmpty) return;
    if (!createNewTrip && targetTripId == null) return;
    if (createNewTrip &&
        [
          newTripTitle,
          newTripDestination,
          newTripStartDate,
          newTripEndDate,
          newTripTimezone,
        ].any((controller) => controller.text.trim().isEmpty)) {
      setState(
        () => error =
            'Complete the new trip title, destination, dates, and IANA timezone.',
      );
      return;
    }
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final tripId = await ref
          .read(importRepositoryProvider)
          .accept(
            importId: current['import_id'] as String,
            tripId: createNewTrip ? null : targetTripId,
            newTrip: createNewTrip
                ? {
                    'title': newTripTitle.text.trim(),
                    'primary_destination': newTripDestination.text.trim(),
                    'additional_destinations': <String>[],
                    'start_date': newTripStartDate.text.trim(),
                    'end_date': newTripEndDate.text.trim(),
                    'timezone': newTripTimezone.text.trim(),
                    'purpose': 'leisure',
                    'status': 'upcoming',
                    'travelers': <Map<String, dynamic>>[],
                  }
                : null,
            proposals: selected
                .map(
                  (id) => {
                    'proposal_id': id,
                    'overrides': overrides[id] ?? <String, dynamic>{},
                  },
                )
                .toList(),
          );
      ref.invalidate(plansProvider(tripId));
      ref.invalidate(tripsProvider);
      if (mounted) context.go('/trips/$tripId');
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final trips = ref.watch(tripsProvider).value ?? const <Trip>[];
    if (!createNewTrip &&
        targetTripId != null &&
        !trips.any((trip) => trip.id == targetTripId)) {
      targetTripId = null;
    }
    return PageFrame(
      maxWidth: 820,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text(
            'Import travel',
            style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          const Text(
            'Paste a confirmation or upload a PDF or image. You will review every field before anything is saved.',
            style: TextStyle(color: Colors.blueGrey),
          ),
          const SizedBox(height: 20),
          DropdownButtonFormField<String>(
            key: ValueKey('$targetTripId-$createNewTrip'),
            initialValue: createNewTrip ? newTripValue : targetTripId,
            decoration: const InputDecoration(labelText: 'Add to trip'),
            items: [
              for (final trip in trips)
                DropdownMenuItem(value: trip.id, child: Text(trip.title)),
              const DropdownMenuItem(
                value: newTripValue,
                child: Text('Create a new trip from this import'),
              ),
            ],
            onChanged: (value) => setState(() {
              createNewTrip = value == newTripValue;
              targetTripId = createNewTrip ? null : value;
            }),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: source,
            minLines: 7,
            maxLines: 14,
            decoration: const InputDecoration(
              labelText: 'Travel confirmation text',
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton.icon(
                onPressed: busy ? null : parseText,
                icon: const Icon(Icons.auto_awesome),
                label: Text(busy ? 'Parsing…' : 'Parse text'),
              ),
              OutlinedButton.icon(
                onPressed: busy ? null : chooseFile,
                icon: const Icon(Icons.upload_file),
                label: const Text('Upload PDF or image'),
              ),
            ],
          ),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(top: 14),
              child: Text(
                error!,
                style: const TextStyle(color: Colors.redAccent),
              ),
            ),
          if (review != null) ...[
            const SizedBox(height: 28),
            _ReviewHeader(review: review!),
            if (createNewTrip) ...[
              const SizedBox(height: 12),
              _NewTripFields(
                title: newTripTitle,
                destination: newTripDestination,
                startDate: newTripStartDate,
                endDate: newTripEndDate,
                timezone: newTripTimezone,
              ),
            ],
            const SizedBox(height: 12),
            for (final proposal
                in (review!['plans'] as List<dynamic>)
                    .cast<Map<String, dynamic>>())
              _ProposalCard(
                proposal: proposal,
                selected: selected.contains(proposal['proposal_id']),
                onSelected: (value) => setState(() {
                  if (value) {
                    selected.add(proposal['proposal_id'] as String);
                  } else {
                    selected.remove(proposal['proposal_id']);
                  }
                }),
                onOverride: (field, value) {
                  final id = proposal['proposal_id'] as String;
                  overrides.putIfAbsent(id, () => {})[field] = value;
                },
              ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed:
                  busy ||
                      (!createNewTrip && targetTripId == null) ||
                      selected.isEmpty
                  ? null
                  : accept,
              icon: const Icon(Icons.check),
              label: Text(
                'Add ${selected.length} selected plan${selected.length == 1 ? '' : 's'}',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _NewTripFields extends StatelessWidget {
  const _NewTripFields({
    required this.title,
    required this.destination,
    required this.startDate,
    required this.endDate,
    required this.timezone,
  });

  final TextEditingController title;
  final TextEditingController destination;
  final TextEditingController startDate;
  final TextEditingController endDate;
  final TextEditingController timezone;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'New trip details',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: title,
            decoration: const InputDecoration(labelText: 'Trip title'),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: destination,
            decoration: const InputDecoration(labelText: 'Primary destination'),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: startDate,
                  decoration: const InputDecoration(
                    labelText: 'Start date',
                    hintText: 'YYYY-MM-DD',
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: endDate,
                  decoration: const InputDecoration(
                    labelText: 'End date',
                    hintText: 'YYYY-MM-DD',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          TextField(
            controller: timezone,
            decoration: const InputDecoration(
              labelText: 'Trip IANA timezone',
              hintText: 'America/Chicago',
            ),
          ),
        ],
      ),
    ),
  );
}

class _ReviewHeader extends StatelessWidget {
  const _ReviewHeader({required this.review});
  final Map<String, dynamic> review;
  @override
  Widget build(BuildContext context) {
    final warnings = (review['warnings'] as List<dynamic>? ?? const [])
        .cast<String>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Review before adding',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
        ),
        Text(
          'Parser confidence: ${((review['overall_confidence'] as num) * 100).round()}%',
        ),
        for (final warning in warnings)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.warning_amber, color: Colors.amber),
            title: Text(warning),
          ),
      ],
    );
  }
}

class _ProposalCard extends StatelessWidget {
  const _ProposalCard({
    required this.proposal,
    required this.selected,
    required this.onSelected,
    required this.onOverride,
  });
  final Map<String, dynamic> proposal;
  final bool selected;
  final ValueChanged<bool> onSelected;
  final void Function(String field, dynamic value) onOverride;

  dynamic extracted(String key) {
    final field = (proposal['fields'] as Map<String, dynamic>)[key];
    return field is Map<String, dynamic> ? field['value'] : null;
  }

  String? inferredLocal(String dateKey, String timeKey) {
    final date = extracted(dateKey);
    final time = extracted(timeKey);
    return date == null || time == null ? null : '${date}T$time';
  }

  dynamic overrideValue(String key, String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty) return null;
    if (key == 'party_size') return int.tryParse(trimmed) ?? trimmed;
    if (key == 'cost_amount') return double.tryParse(trimmed) ?? trimmed;
    if (key == 'traveler_names') {
      return trimmed
          .split(',')
          .map((name) => name.trim())
          .where((name) => name.isNotEmpty)
          .toList();
    }
    return trimmed;
  }

  @override
  Widget build(BuildContext context) {
    final id = proposal['proposal_id'] as String;
    final start =
        inferredLocal('departure_date', 'departure_time') ??
        inferredLocal('check_in_date', 'check_in_time') ??
        inferredLocal('reservation_date', 'reservation_time');
    final end =
        inferredLocal('arrival_date', 'arrival_time') ??
        inferredLocal('check_out_date', 'check_out_time');
    final fields = (proposal['fields'] as Map<String, dynamic>).entries.where((
      entry,
    ) {
      final value = entry.value;
      const representedElsewhere = {
        'departure_date',
        'departure_time',
        'check_in_date',
        'check_in_time',
        'reservation_date',
        'reservation_time',
        'arrival_date',
        'arrival_time',
        'check_out_date',
        'check_out_time',
        'start_timezone',
        'end_timezone',
      };
      return value is Map<String, dynamic> &&
          value['value'] != null &&
          !representedElsewhere.contains(entry.key);
    });
    final warnings = (proposal['warnings'] as List<dynamic>? ?? const [])
        .cast<String>();
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: selected,
              onChanged: (value) => onSelected(value ?? false),
              title: Text(proposal['title'] as String? ?? 'Untitled plan'),
              subtitle: Text(
                '${proposal['plan_type']} · ${((proposal['overall_confidence'] as num) * 100).round()}% confidence',
              ),
            ),
            DropdownButtonFormField<PlanType>(
              initialValue: PlanType.fromWire(proposal['plan_type'] as String),
              decoration: const InputDecoration(labelText: 'Plan type'),
              items: [
                for (final type in PlanType.values)
                  DropdownMenuItem(value: type, child: Text(type.label)),
              ],
              onChanged: (value) => onOverride('plan_type', value?.wireValue),
            ),
            const SizedBox(height: 10),
            if (proposal['is_duplicate'] == true)
              Text(
                proposal['duplicate_reason'] as String? ?? 'Possible duplicate',
                style: const TextStyle(color: Colors.amber),
              ),
            for (final warning in warnings)
              Text('• $warning', style: const TextStyle(color: Colors.amber)),
            const SizedBox(height: 10),
            TextFormField(
              key: ValueKey('$id-title'),
              initialValue: proposal['title'] as String?,
              decoration: const InputDecoration(labelText: 'Title'),
              onChanged: (value) => onOverride(
                'title',
                value.trim().isEmpty ? null : value.trim(),
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              key: ValueKey('$id-end'),
              initialValue: end,
              decoration: const InputDecoration(
                labelText: 'Local end (optional)',
                hintText: '2026-09-05T16:30:00',
              ),
              onChanged: (value) => onOverride(
                'end_local',
                value.trim().isEmpty ? null : value.trim(),
              ),
            ),
            const SizedBox(height: 10),
            TextFormField(
              key: ValueKey('$id-start'),
              initialValue: start,
              decoration: const InputDecoration(
                labelText: 'Local start',
                hintText: '2026-09-05T14:30:00',
              ),
              onChanged: (value) => onOverride('start_local', value.trim()),
            ),
            const SizedBox(height: 10),
            TextFormField(
              key: ValueKey('$id-timezone'),
              initialValue: extracted('start_timezone') as String?,
              decoration: const InputDecoration(
                labelText: 'Start IANA timezone',
                hintText: 'America/Chicago',
              ),
              onChanged: (value) => onOverride('start_timezone', value.trim()),
            ),
            const SizedBox(height: 12),
            TextFormField(
              key: ValueKey('$id-end-timezone'),
              initialValue: extracted('end_timezone') as String?,
              decoration: const InputDecoration(
                labelText: 'End IANA timezone (optional)',
              ),
              onChanged: (value) => onOverride(
                'end_timezone',
                value.trim().isEmpty ? null : value.trim(),
              ),
            ),
            for (final field in fields) ...[
              const SizedBox(height: 10),
              TextFormField(
                key: ValueKey('$id-${field.key}'),
                initialValue:
                    (field.value as Map<String, dynamic>)['value'] is List
                    ? ((field.value as Map<String, dynamic>)['value'] as List)
                          .join(', ')
                    : '${(field.value as Map<String, dynamic>)['value']}',
                decoration: InputDecoration(
                  labelText:
                      '${field.key.replaceAll('_', ' ')} · ${(((field.value as Map<String, dynamic>)['confidence'] as num) * 100).round()}% confidence',
                ),
                onChanged: (value) =>
                    onOverride(field.key, overrideValue(field.key, value)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
