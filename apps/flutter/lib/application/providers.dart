import 'dart:async';

import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/data/auth/auth_repository.dart';
import 'package:dorago/data/auth/token_store.dart';
import 'package:dorago/data/documents/document_repository.dart';
import 'package:dorago/data/imports/import_repository.dart';
import 'package:dorago/data/offline/offline_database.dart';
import 'package:dorago/data/offline/offline_store.dart';
import 'package:dorago/data/profile/profile_repository.dart';
import 'package:dorago/data/reminders/reminder_repository.dart';
import 'package:dorago/data/sync/sync_repository.dart';
import 'package:dorago/data/trips/trip_repository.dart';
import 'package:dorago/domain/models/plan_item.dart';
import 'package:dorago/domain/models/trip.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dorago/application/reminder_scheduler.dart';

final tokenStoreProvider = Provider(
  (ref) => const TokenStore(FlutterSecureStorage()),
);
final apiClientProvider = Provider(
  (ref) => ApiClient(ref.read(tokenStoreProvider)),
);
final offlineDatabaseProvider = Provider((ref) {
  final database = OfflineDatabase();
  ref.onDispose(database.close);
  return database;
});
final offlineStoreProvider = Provider(
  (ref) => OfflineStore(ref.read(offlineDatabaseProvider)),
);
final authRepositoryProvider = Provider(
  (ref) =>
      AuthRepository(ref.read(apiClientProvider), ref.read(tokenStoreProvider)),
);
final tripRepositoryProvider = Provider(
  (ref) => TripRepository(
    ref.read(apiClientProvider),
    ref.read(offlineStoreProvider),
  ),
);
final documentRepositoryProvider = Provider(
  (ref) => DocumentRepository(
    ref.read(apiClientProvider),
    ref.read(offlineStoreProvider),
  ),
);
final importRepositoryProvider = Provider(
  (ref) => ImportRepository(ref.read(apiClientProvider)),
);
final reminderRepositoryProvider = Provider(
  (ref) => ReminderRepository(ref.read(apiClientProvider)),
);
final reminderSchedulerProvider = Provider(
  (ref) => ReminderScheduler(FlutterLocalNotificationsPlugin()),
);
final profileRepositoryProvider = Provider(
  (ref) => ProfileRepository(ref.read(apiClientProvider)),
);
final syncRepositoryProvider = Provider(
  (ref) => SyncRepository(
    ref.read(apiClientProvider),
    ref.read(offlineDatabaseProvider),
  ),
);

enum SessionStatus { loading, unauthenticated, authenticated }

class SessionState {
  const SessionState(this.status, {this.user});
  final SessionStatus status;
  final Map<String, dynamic>? user;
}

class SessionController extends Notifier<SessionState> {
  @override
  SessionState build() {
    unawaited(_restore());
    return const SessionState(SessionStatus.loading);
  }

  Future<void> _restore() async {
    final user = await ref.read(authRepositoryProvider).restore();
    if (!ref.mounted) return;
    state = SessionState(
      user == null
          ? SessionStatus.unauthenticated
          : SessionStatus.authenticated,
      user: user,
    );
  }

  Future<int> requestOtp(String email) =>
      ref.read(authRepositoryProvider).requestOtp(email);

  Future<bool> verifyOtp(String email, String code) async {
    final result = await ref
        .read(authRepositoryProvider)
        .verifyOtp(email, code);
    state = SessionState(SessionStatus.authenticated, user: result.user);
    return result.isFirstLogin;
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    await ref.read(reminderSchedulerProvider).cancelAll();
    await ref.read(offlineStoreProvider).clearUserData();
    state = const SessionState(SessionStatus.unauthenticated);
  }

  Future<void> deleteAccount() async {
    await ref.read(authRepositoryProvider).deleteAccount();
    await ref.read(reminderSchedulerProvider).cancelAll();
    await ref.read(offlineStoreProvider).clearUserData();
    state = const SessionState(SessionStatus.unauthenticated);
  }

  void setUser(Map<String, dynamic> user) {
    state = SessionState(SessionStatus.authenticated, user: user);
  }
}

final sessionProvider = NotifierProvider<SessionController, SessionState>(
  SessionController.new,
);

class TripsController extends AsyncNotifier<List<Trip>> {
  @override
  Future<List<Trip>> build() async {
    try {
      final conflicts = await ref.read(syncRepositoryProvider).synchronize();
      ref
          .read(syncNoticeProvider.notifier)
          .show(
            conflicts.isEmpty
                ? null
                : '${conflicts.length} offline change${conflicts.length == 1 ? '' : 's'} need review.',
          );
      try {
        await _reconcileReminders();
      } on Object {
        if (conflicts.isEmpty) {
          ref
              .read(syncNoticeProvider.notifier)
              .show(
                'Trips synced, but device reminders could not be refreshed.',
              );
        }
      }
      ref.invalidate(lastSuccessfulSyncProvider);
    } on Object {
      ref
          .read(syncNoticeProvider.notifier)
          .show(
            'Offline changes remain queued until the server acknowledges them.',
          );
    }
    return ref.read(tripRepositoryProvider).listTrips(includeArchived: true);
  }

  Future<void> _reconcileReminders() async {
    final reminders = await ref.read(reminderRepositoryProvider).listAll();
    final scheduler = ref.read(reminderSchedulerProvider);
    await scheduler.cancelAll();
    for (final reminder in reminders) {
      await scheduler.schedule(
        reminderId: reminder.id,
        title: 'Upcoming travel plan',
        triggerAtUtc: reminder.triggerAtUtc,
        planId: reminder.planId,
      );
    }
  }

  Future<void> reload() async => state = await AsyncValue.guard(build);
}

final tripsProvider = AsyncNotifierProvider<TripsController, List<Trip>>(
  TripsController.new,
);

final plansProvider = FutureProvider.family<List<PlanItem>, String>(
  (ref, tripId) => ref.read(tripRepositoryProvider).listPlans(tripId),
);

final nextUpProvider = FutureProvider((ref) {
  ref.watch(tripsProvider);
  return ref.read(tripRepositoryProvider).nextUp();
});

final documentsProvider = FutureProvider.family((ref, String tripId) {
  return ref.read(documentRepositoryProvider).list(tripId);
});

final lastSuccessfulSyncProvider = FutureProvider(
  (ref) => ref.read(offlineStoreProvider).lastSuccessfulSync(),
);

class SyncNoticeController extends Notifier<String?> {
  @override
  String? build() => null;
  void show(String? message) => state = message;
}

final syncNoticeProvider = NotifierProvider<SyncNoticeController, String?>(
  SyncNoticeController.new,
);
