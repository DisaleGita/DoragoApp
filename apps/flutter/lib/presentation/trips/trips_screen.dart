import 'package:dorago/application/providers.dart';
import 'package:dorago/core/formatters.dart';
import 'package:dorago/data/trips/trip_repository.dart';
import 'package:dorago/domain/models/trip.dart';
import 'package:dorago/presentation/shared/app_shell.dart';
import 'package:dorago/presentation/trips/trip_form_dialog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

class TripsScreen extends ConsumerStatefulWidget {
  const TripsScreen({super.key});
  @override
  ConsumerState<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends ConsumerState<TripsScreen> {
  String query = '';
  String status = 'upcoming';

  @override
  Widget build(BuildContext context) {
    final trips = ref.watch(tripsProvider);
    final nextUp = ref.watch(nextUpProvider);
    final lastSync = ref.watch(lastSuccessfulSyncProvider).value;
    final use24HourTime =
        ref.watch(sessionProvider).user?['time_format_24h'] as bool? ?? false;
    final syncNotice = ref.watch(syncNoticeProvider);
    return PageFrame(
      child: RefreshIndicator(
        onRefresh: () => ref.read(tripsProvider.notifier).reload(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 14),
              sliver: SliverToBoxAdapter(
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Your trips',
                            style: TextStyle(
                              fontSize: 30,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            lastSync == null
                                ? 'Everything ahead, organized.'
                                : 'Last synced ${DateFormat.MMMd().add_jm().format(lastSync)}',
                            style: const TextStyle(color: Colors.blueGrey),
                          ),
                        ],
                      ),
                    ),
                    FilledButton.icon(
                      onPressed: () => showDialog<bool>(
                        context: context,
                        builder: (_) => const TripFormDialog(),
                      ),
                      icon: const Icon(Icons.add),
                      label: const Text('New trip'),
                    ),
                  ],
                ),
              ),
            ),
            if (syncNotice != null)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                sliver: SliverToBoxAdapter(
                  child: MaterialBanner(
                    content: Text(syncNotice),
                    leading: const Icon(Icons.cloud_off_outlined),
                    actions: [
                      TextButton(
                        onPressed: () =>
                            ref.read(tripsProvider.notifier).reload(),
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                ),
              ),
            if (nextUp.value case final item?)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
                sliver: SliverToBoxAdapter(
                  child: _NextUpCard(
                    nextUp: item,
                    use24HourTime: use24HourTime,
                  ),
                ),
              ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              sliver: SliverToBoxAdapter(
                child: Column(
                  children: [
                    TextField(
                      onChanged: (value) =>
                          setState(() => query = value.trim().toLowerCase()),
                      decoration: const InputDecoration(
                        hintText: 'Search trips',
                        prefixIcon: Icon(Icons.search),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(
                            value: 'upcoming',
                            label: Text('Upcoming'),
                          ),
                          ButtonSegment(
                            value: 'current',
                            label: Text('Current'),
                          ),
                          ButtonSegment(
                            value: 'completed',
                            label: Text('Past'),
                          ),
                          ButtonSegment(
                            value: 'archived',
                            label: Text('Archived'),
                          ),
                        ],
                        selected: {status},
                        onSelectionChanged: (value) =>
                            setState(() => status = value.first),
                        showSelectedIcon: false,
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],
                ),
              ),
            ),
            ...trips.when(
              loading: () => const [
                SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                ),
              ],
              error: (error, stack) => [
                SliverFillRemaining(
                  child: _Empty(
                    icon: Icons.cloud_off,
                    title: 'Trips unavailable',
                    message: 'Connect to the internet and try again.',
                    action: () => ref.read(tripsProvider.notifier).reload(),
                  ),
                ),
              ],
              data: (items) {
                final filtered = items.where((trip) {
                  final matchesQuery =
                      query.isEmpty ||
                      trip.title.toLowerCase().contains(query) ||
                      trip.primaryDestination.toLowerCase().contains(query);
                  final today = DateUtils.dateOnly(DateTime.now());
                  final matchesStatus = switch (status) {
                    'archived' => trip.isArchived,
                    'current' =>
                      !trip.isArchived &&
                          (trip.status == 'current' ||
                              (!trip.startDate.isAfter(today) &&
                                  !trip.endDate.isBefore(today))),
                    'completed' =>
                      !trip.isArchived &&
                          (trip.status == 'completed' ||
                              trip.endDate.isBefore(today)),
                    _ =>
                      !trip.isArchived &&
                          !trip.endDate.isBefore(today) &&
                          trip.status != 'completed',
                  };
                  return matchesQuery && matchesStatus;
                }).toList();
                if (filtered.isEmpty) {
                  return const [
                    SliverFillRemaining(
                      child: _Empty(
                        icon: Icons.flight_takeoff,
                        title: 'No trips found',
                        message:
                            'Create a trip or import a reservation to get started.',
                      ),
                    ),
                  ];
                }
                return [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                    sliver: SliverList.separated(
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) =>
                          _TripCard(trip: filtered[index]),
                    ),
                  ),
                ];
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _NextUpCard extends StatelessWidget {
  const _NextUpCard({required this.nextUp, required this.use24HourTime});
  final NextUp nextUp;
  final bool use24HourTime;

  @override
  Widget build(BuildContext context) {
    final plan = nextUp.plan;
    final difference = plan.startUtc.difference(DateTime.now().toUtc());
    final relative = difference.inMinutes < 60
        ? 'in ${difference.inMinutes.clamp(1, 59)} min'
        : difference.inHours < 24
        ? 'in ${difference.inHours} hr'
        : 'in ${difference.inDays} day${difference.inDays == 1 ? '' : 's'}';
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.go('/trips/${nextUp.trip.id}'),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.circle,
                    size: 10,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'NEXT UP · ${nextUp.trip.title.toUpperCase()}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.7,
                      ),
                    ),
                  ),
                  Text(relative, style: const TextStyle(fontSize: 12)),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  const CircleAvatar(child: Icon(Icons.schedule)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          plan.title,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        Text(
                          '${formatClock(plan.startLocal, use24HourTime: use24HourTime)} · ${plan.startTimezone}'
                          '${plan.locationName == null ? '' : ' · ${plan.locationName}'}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.blueGrey),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TripCard extends StatelessWidget {
  const _TripCard({required this.trip});
  final Trip trip;
  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => context.go('/trips/${trip.id}'),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: Theme.of(
                  context,
                ).colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                Icons.public,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    trip.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    trip.primaryDestination,
                    style: const TextStyle(color: Colors.blueGrey),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${DateFormat.MMMd().format(trip.startDate)} – ${DateFormat.yMMMd().format(trip.endDate)}  •  ${trip.planCount} plans',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right),
          ],
        ),
      ),
    ),
  );
}

class _Empty extends StatelessWidget {
  const _Empty({
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });
  final IconData icon;
  final String title;
  final String message;
  final VoidCallback? action;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 52, color: Colors.blueGrey),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 6),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.blueGrey),
          ),
          if (action != null) ...[
            const SizedBox(height: 16),
            OutlinedButton(onPressed: action, child: const Text('Try again')),
          ],
        ],
      ),
    ),
  );
}
