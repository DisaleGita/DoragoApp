import 'package:dorago/application/providers.dart';
import 'package:dorago/core/formatters.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/domain/models/plan_item.dart';
import 'package:dorago/domain/models/travel_document.dart';
import 'package:dorago/domain/models/trip.dart';
import 'package:dorago/presentation/plans/plan_form_dialog.dart';
import 'package:dorago/presentation/trips/trip_form_dialog.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class TripDetailScreen extends ConsumerWidget {
  const TripDetailScreen({required this.tripId, super.key});
  final String tripId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final trips = ref.watch(tripsProvider);
    return trips.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => const Center(child: Text('Trip unavailable.')),
      data: (items) {
        final matches = items.where((trip) => trip.id == tripId);
        if (matches.isEmpty) {
          return const Center(child: Text('Trip not found.'));
        }
        return _TripDetail(trip: matches.first);
      },
    );
  }
}

class _TripDetail extends ConsumerWidget {
  const _TripDetail({required this.trip});
  final Trip trip;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final plans = ref.watch(plansProvider(trip.id));
    final documents = ref.watch(documentsProvider(trip.id));
    return DefaultTabController(
      length: 4,
      child: Column(
        children: [
          Material(
            color: Theme.of(context).scaffoldBackgroundColor,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 12, 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => context.go('/trips'),
                    tooltip: 'Back to trips',
                    icon: const Icon(Icons.arrow_back),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          trip.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                        Text(
                          trip.primaryDestination,
                          style: const TextStyle(color: Colors.blueGrey),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    tooltip: 'Copy itinerary summary',
                    onPressed: () => _share(context, plans.value ?? const []),
                    icon: const Icon(Icons.share_outlined),
                  ),
                  PopupMenuButton<String>(
                    tooltip: 'Trip actions',
                    onSelected: (value) => _action(context, ref, value),
                    itemBuilder: (_) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: Text('Edit Trip Details'),
                      ),
                      PopupMenuItem(
                        value: 'archive',
                        child: Text(
                          trip.isArchived ? 'Unarchive Trip' : 'Archive Trip',
                        ),
                      ),
                      const PopupMenuDivider(),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Text('Delete Trip'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 840),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Column(
                    children: [
                      _Hero(trip: trip),
                      const SizedBox(height: 12),
                      TabBar(
                        isScrollable: true,
                        tabs: [
                          const Tab(
                            icon: Icon(Icons.schedule),
                            text: 'Timeline',
                          ),
                          Tab(
                            icon: const Icon(Icons.description_outlined),
                            text: 'Docs (${documents.value?.length ?? 0})',
                          ),
                          const Tab(
                            icon: Icon(Icons.map_outlined),
                            text: 'Map / Places',
                          ),
                          const Tab(
                            icon: Icon(Icons.info_outline),
                            text: 'Trip Info',
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Expanded(
                        child: TabBarView(
                          children: [
                            _Timeline(trip: trip, plans: plans),
                            _Documents(tripId: trip.id, documents: documents),
                            _Places(plans: plans),
                            _TripInfo(trip: trip, plans: plans),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _share(BuildContext context, List<PlanItem> plans) async {
    final dates =
        '${DateFormat.yMMMd().format(trip.startDate)} – ${DateFormat.yMMMd().format(trip.endDate)}';
    await Clipboard.setData(
      ClipboardData(
        text:
            '✈️ ${trip.title} (${trip.primaryDestination})\nDates: $dates\nPlans: ${plans.length}\nOrganized with Dorago.',
      ),
    );
    if (context.mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Itinerary copied.')));
    }
  }

  Future<void> _action(
    BuildContext context,
    WidgetRef ref,
    String value,
  ) async {
    final repository = ref.read(tripRepositoryProvider);
    if (value == 'edit') {
      await showDialog<bool>(
        context: context,
        builder: (_) => TripFormDialog(trip: trip),
      );
      return;
    }
    if (value == 'archive') {
      await repository.updateTrip(trip, {
        'is_archived': !trip.isArchived,
        'status': trip.isArchived ? 'upcoming' : 'archived',
      });
      ref.invalidate(tripsProvider);
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Delete this trip?'),
        content: const Text(
          'The trip and its itinerary will be removed from your account.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await repository.deleteTrip(trip);
      ref.invalidate(tripsProvider);
      if (context.mounted) context.go('/trips');
    }
  }
}

class _Hero extends ConsumerWidget {
  const _Hero({required this.trip});
  final Trip trip;
  @override
  Widget build(BuildContext context, WidgetRef ref) => Card(
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  trip.status.toUpperCase(),
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.primary,
                    fontWeight: FontWeight.w700,
                    fontSize: 11,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  trip.primaryDestination,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${DateFormat.MMMd().format(trip.startDate)} – ${DateFormat.yMMMd().format(trip.endDate)}',
                ),
              ],
            ),
          ),
          Column(
            children: [
              FilledButton.icon(
                onPressed: () => showDialog<bool>(
                  context: context,
                  builder: (_) => PlanFormDialog(tripId: trip.id),
                ),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Add Plan'),
              ),
              TextButton.icon(
                onPressed: () => context.go('/import?trip_id=${trip.id}'),
                icon: const Icon(Icons.auto_awesome, size: 16),
                label: const Text('Import AI'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _Timeline extends ConsumerWidget {
  const _Timeline({required this.trip, required this.plans});
  final Trip trip;
  final AsyncValue<List<PlanItem>> plans;

  @override
  Widget build(BuildContext context, WidgetRef ref) => plans.when(
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (error, stack) => const Center(child: Text('Timeline unavailable.')),
    data: (items) {
      if (items.isEmpty) {
        return const Center(
          child: Text('No plans yet. Add one or import a reservation.'),
        );
      }
      final groups = <DateTime, List<PlanItem>>{};
      for (final plan in items) {
        final day = DateUtils.dateOnly(plan.startLocal);
        groups.putIfAbsent(day, () => []).add(plan);
      }
      return ListView(
        padding: const EdgeInsets.only(bottom: 24),
        children: [
          for (final entry in groups.entries) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
              child: Text(
                DateFormat('EEEE, MMMM d').format(entry.key),
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            for (final plan in entry.value)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _PlanCard(plan: plan),
              ),
          ],
        ],
      );
    },
  );
}

class _PlanCard extends ConsumerWidget {
  const _PlanCard({required this.plan});
  final PlanItem plan;

  @override
  Widget build(BuildContext context, WidgetRef ref) => Card(
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(child: Icon(_icon(plan.type), size: 19)),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  plan.type.label.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.blueGrey,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  plan.title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '${formatClock(plan.startLocal, use24HourTime: ref.watch(sessionProvider).user?['time_format_24h'] as bool? ?? false)} · ${plan.startTimezone}',
                  style: const TextStyle(color: Colors.blueGrey),
                ),
                if (plan.locationName != null) Text(plan.locationName!),
                if (plan.confirmationNumber case final confirmation?)
                  TextButton.icon(
                    onPressed: () =>
                        Clipboard.setData(ClipboardData(text: confirmation)),
                    icon: const Icon(Icons.copy, size: 14),
                    label: Text('Confirmation $confirmation'),
                  ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            onSelected: (value) => _action(context, ref, value),
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'edit', child: Text('Edit')),
              PopupMenuItem(value: 'duplicate', child: Text('Duplicate')),
              PopupMenuItem(value: 'reminder', child: Text('Add reminder')),
              PopupMenuDivider(),
              PopupMenuItem(value: 'delete', child: Text('Delete')),
            ],
          ),
        ],
      ),
    ),
  );

  Future<void> _action(
    BuildContext context,
    WidgetRef ref,
    String value,
  ) async {
    if (value == 'edit') {
      await showDialog<bool>(
        context: context,
        builder: (_) => PlanFormDialog(tripId: plan.tripId, plan: plan),
      );
      return;
    }
    if (value == 'duplicate') {
      await ref.read(tripRepositoryProvider).duplicatePlan(plan.id);
      ref.invalidate(plansProvider(plan.tripId));
      return;
    }
    if (value == 'reminder') {
      final type = await showDialog<String>(
        context: context,
        builder: (dialogContext) => SimpleDialog(
          title: const Text('Remind me'),
          children: [
            for (final option in const {
              '30_minutes_before': '30 minutes before',
              '1_hour_before': '1 hour before',
              '2_hours_before': '2 hours before',
              '1_day_before': '1 day before',
              'at_start': 'At start time',
            }.entries)
              SimpleDialogOption(
                onPressed: () => Navigator.pop(dialogContext, option.key),
                child: Text(option.value),
              ),
          ],
        ),
      );
      if (type == null) return;
      final reminder = await ref
          .read(reminderRepositoryProvider)
          .create(plan.id, type);
      await ref
          .read(reminderSchedulerProvider)
          .schedule(
            reminderId: reminder.id,
            title: plan.title,
            triggerAtUtc: reminder.triggerAtUtc,
            planId: plan.id,
          );
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Reminder scheduled.')));
      }
      return;
    }
    await ref.read(tripRepositoryProvider).deletePlan(plan);
    ref.invalidate(plansProvider(plan.tripId));
    ref.invalidate(tripsProvider);
  }

  IconData _icon(PlanType type) => switch (type) {
    PlanType.flight => Icons.flight,
    PlanType.lodging => Icons.hotel,
    PlanType.carRental => Icons.directions_car,
    PlanType.rail => Icons.train,
    PlanType.bus => Icons.directions_bus,
    PlanType.ferry || PlanType.cruise => Icons.directions_boat,
    PlanType.dining => Icons.restaurant,
    PlanType.meeting => Icons.groups,
    PlanType.parking => Icons.local_parking,
    PlanType.customNote => Icons.note,
    _ => Icons.place,
  };
}

class _Documents extends ConsumerWidget {
  const _Documents({required this.tripId, required this.documents});
  final String tripId;
  final AsyncValue<List<TravelDocument>> documents;

  @override
  Widget build(BuildContext context, WidgetRef ref) => documents.when(
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (error, stack) =>
        const Center(child: Text('Documents unavailable.')),
    data: (items) => ListView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      children: [
        FilledButton.icon(
          onPressed: () => _upload(context, ref),
          icon: const Icon(Icons.upload_file),
          label: const Text('Upload document'),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.all(32),
            child: Text('No documents yet.', textAlign: TextAlign.center),
          ),
        for (final document in items)
          Card(
            child: ListTile(
              leading: const Icon(Icons.description_outlined),
              title: Text(document.fileName),
              subtitle: Text(
                '${document.category.replaceAll('_', ' ')} · ${(document.fileSizeBytes / 1024).ceil()} KB',
              ),
              onTap: () async {
                final bytes = await ref
                    .read(documentRepositoryProvider)
                    .download(document.id);
                await FilePicker.saveFile(
                  dialogTitle: 'Save travel document',
                  fileName: document.fileName,
                  bytes: bytes,
                );
              },
              trailing: IconButton(
                tooltip: 'Delete document',
                icon: const Icon(Icons.delete_outline),
                onPressed: () async {
                  await ref
                      .read(documentRepositoryProvider)
                      .delete(document.id);
                  ref.invalidate(documentsProvider(tripId));
                },
              ),
            ),
          ),
      ],
    ),
  );

  Future<void> _upload(BuildContext context, WidgetRef ref) async {
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: const ['pdf', 'png', 'jpg', 'jpeg', 'webp'],
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      await ref
          .read(documentRepositoryProvider)
          .upload(tripId: tripId, fileName: file.name, bytes: bytes);
      ref.invalidate(documentsProvider(tripId));
    } on Object catch (caught) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(readableFailure(caught).message)),
        );
      }
    }
  }
}

class _Places extends StatelessWidget {
  const _Places({required this.plans});
  final AsyncValue<List<PlanItem>> plans;
  @override
  Widget build(BuildContext context) => plans.when(
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (error, stack) => const Center(child: Text('Places unavailable.')),
    data: (items) {
      final located = items.where(
        (plan) => plan.address != null || plan.locationName != null,
      );
      if (located.isEmpty) {
        return const Center(child: Text('No places on this itinerary yet.'));
      }
      return ListView(
        padding: const EdgeInsets.symmetric(vertical: 12),
        children: [
          for (final plan in located)
            Card(
              child: ListTile(
                leading: const Icon(Icons.place_outlined),
                title: Text(plan.locationName ?? plan.title),
                subtitle: Text(plan.address ?? plan.title),
                trailing: const Icon(Icons.open_in_new),
                onTap: () => launchUrl(
                  Uri.https('www.google.com', '/maps/search/', {
                    'api': '1',
                    'query': plan.address ?? plan.locationName ?? plan.title,
                  }),
                  mode: LaunchMode.externalApplication,
                ),
              ),
            ),
        ],
      );
    },
  );
}

class _TripInfo extends StatelessWidget {
  const _TripInfo({required this.trip, required this.plans});
  final Trip trip;
  final AsyncValue<List<PlanItem>> plans;
  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.symmetric(vertical: 12),
    children: [
      Card(
        child: Column(
          children: [
            ListTile(
              title: const Text('Dates'),
              subtitle: Text(
                '${DateFormat.yMMMd().format(trip.startDate)} – ${DateFormat.yMMMd().format(trip.endDate)}',
              ),
            ),
            ListTile(
              title: const Text('Timezone'),
              subtitle: Text(trip.timezone),
            ),
            ListTile(title: const Text('Status'), subtitle: Text(trip.status)),
            ListTile(
              title: const Text('Plans'),
              subtitle: Text('${plans.value?.length ?? trip.planCount}'),
            ),
            if (trip.notes != null)
              ListTile(title: const Text('Notes'), subtitle: Text(trip.notes!)),
          ],
        ),
      ),
    ],
  );
}
