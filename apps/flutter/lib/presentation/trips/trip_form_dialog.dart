import 'package:dorago/application/providers.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/domain/models/trip.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

class TripFormDialog extends ConsumerStatefulWidget {
  const TripFormDialog({this.trip, super.key});
  final Trip? trip;
  @override
  ConsumerState<TripFormDialog> createState() => _TripFormDialogState();
}

class _TripFormDialogState extends ConsumerState<TripFormDialog> {
  final formKey = GlobalKey<FormState>();
  late final TextEditingController title;
  late final TextEditingController destination;
  late final TextEditingController timezone;
  late DateTime start;
  late DateTime end;
  bool busy = false;
  String? error;

  @override
  void initState() {
    super.initState();
    final now = DateUtils.dateOnly(DateTime.now());
    title = TextEditingController(text: widget.trip?.title);
    destination = TextEditingController(text: widget.trip?.primaryDestination);
    timezone = TextEditingController(text: widget.trip?.timezone ?? 'UTC');
    start = widget.trip?.startDate ?? now;
    end = widget.trip?.endDate ?? now.add(const Duration(days: 3));
  }

  @override
  void dispose() {
    title.dispose();
    destination.dispose();
    timezone.dispose();
    super.dispose();
  }

  Future<void> chooseDate(bool isStart) async {
    final current = isStart ? start : end;
    final selected = await showDatePicker(
      context: context,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
      initialDate: current,
    );
    if (selected != null) {
      setState(() {
        if (isStart) {
          start = selected;
          if (end.isBefore(start)) end = start;
        } else {
          end = selected;
        }
      });
    }
  }

  Future<void> save() async {
    if (!formKey.currentState!.validate() || end.isBefore(start)) return;
    setState(() {
      busy = true;
      error = null;
    });
    final values = {
      'title': title.text.trim(),
      'primary_destination': destination.text.trim(),
      'additional_destinations': <String>[],
      'start_date': DateFormat('yyyy-MM-dd').format(start),
      'end_date': DateFormat('yyyy-MM-dd').format(end),
      'timezone': timezone.text.trim(),
      'purpose': 'leisure',
      'status': widget.trip?.status ?? 'upcoming',
      'travelers': <Object>[],
    };
    if (widget.trip != null) {
      values.remove('additional_destinations');
      values.remove('travelers');
    }
    try {
      final repository = ref.read(tripRepositoryProvider);
      if (widget.trip case final trip?) {
        await repository.updateTrip(trip, values);
      } else {
        await repository.createTrip(values);
      }
      ref.invalidate(tripsProvider);
      if (mounted) Navigator.of(context).pop(true);
    } on Object catch (caught) {
      setState(() => error = readableFailure(caught).message);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.trip == null ? 'Create a trip' : 'Edit trip'),
    content: SizedBox(
      width: 480,
      child: Form(
        key: formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: title,
                decoration: const InputDecoration(labelText: 'Trip name'),
                validator: requiredValue,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: destination,
                decoration: const InputDecoration(
                  labelText: 'Primary destination',
                ),
                validator: requiredValue,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: timezone,
                decoration: const InputDecoration(
                  labelText: 'IANA timezone',
                  hintText: 'America/Chicago',
                ),
                validator: requiredValue,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _DateButton(
                      label: 'Starts',
                      date: start,
                      onTap: () => chooseDate(true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DateButton(
                      label: 'Ends',
                      date: end,
                      onTap: () => chooseDate(false),
                    ),
                  ),
                ],
              ),
              if (end.isBefore(start))
                const Padding(
                  padding: EdgeInsets.only(top: 8),
                  child: Text(
                    'End date must not precede start date.',
                    style: TextStyle(color: Colors.redAccent),
                  ),
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
        child: Text(busy ? 'Saving…' : 'Save trip'),
      ),
    ],
  );
}

String? requiredValue(String? value) =>
    value == null || value.trim().isEmpty ? 'Required' : null;

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.date,
    required this.onTap,
  });
  final String label;
  final DateTime date;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    onPressed: onTap,
    icon: const Icon(Icons.calendar_today_outlined),
    label: Text('$label\n${DateFormat.yMMMd().format(date)}'),
  );
}
