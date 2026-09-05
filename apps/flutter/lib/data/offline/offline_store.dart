import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:dorago/data/offline/offline_database.dart';
import 'package:dorago/domain/models/plan_item.dart' as domain;
import 'package:dorago/domain/models/travel_document.dart' as domain;
import 'package:dorago/domain/models/trip.dart' as domain;
import 'package:uuid/uuid.dart';

class OfflineStore {
  OfflineStore(this.database);
  final OfflineDatabase database;

  Future<void> replaceTrips(List<Map<String, dynamic>> payloads) async {
    final now = DateTime.now().toUtc();
    await database.transaction(() async {
      await database.delete(database.cachedTrips).go();
      await database.batch((batch) {
        batch.insertAll(
          database.cachedTrips,
          payloads
              .map(
                (json) => CachedTripsCompanion.insert(
                  id: json['id'] as String,
                  payload: jsonEncode(json),
                  entityVersion: json['version'] as int,
                  cachedAt: now,
                ),
              )
              .toList(),
        );
      });
    });
  }

  Future<List<domain.Trip>> readTrips() async =>
      (await database.select(database.cachedTrips).get())
          .where((row) => row.deletedAt == null)
          .map(
            (row) => domain.Trip.fromJson(
              jsonDecode(row.payload) as Map<String, dynamic>,
            ),
          )
          .toList();

  Future<void> replacePlans(
    String tripId,
    List<Map<String, dynamic>> payloads,
  ) async {
    final now = DateTime.now().toUtc();
    await database.transaction(() async {
      await (database.delete(
        database.cachedPlans,
      )..where((row) => row.tripId.equals(tripId))).go();
      await database.batch((batch) {
        batch.insertAll(
          database.cachedPlans,
          payloads
              .map(
                (json) => CachedPlansCompanion.insert(
                  id: json['id'] as String,
                  tripId: tripId,
                  payload: jsonEncode(json),
                  entityVersion: json['version'] as int,
                  cachedAt: now,
                ),
              )
              .toList(),
        );
      });
    });
  }

  Future<List<domain.PlanItem>> readPlans(String tripId) async {
    final query = database.select(database.cachedPlans)
      ..where((row) => row.tripId.equals(tripId) & row.deletedAt.isNull());
    return (await query.get())
        .map(
          (row) => domain.PlanItem.fromJson(
            jsonDecode(row.payload) as Map<String, dynamic>,
          ),
        )
        .toList()
      ..sort((a, b) => a.startUtc.compareTo(b.startUtc));
  }

  Future<List<domain.PlanItem>> readAllPlans() async {
    final query = database.select(database.cachedPlans)
      ..where((row) => row.deletedAt.isNull());
    return (await query.get())
        .map(
          (row) => domain.PlanItem.fromJson(
            jsonDecode(row.payload) as Map<String, dynamic>,
          ),
        )
        .toList()
      ..sort((a, b) => a.startUtc.compareTo(b.startUtc));
  }

  Future<void> replaceDocuments(
    String tripId,
    List<Map<String, dynamic>> payloads,
  ) async {
    final now = DateTime.now().toUtc();
    await database.transaction(() async {
      await (database.delete(
        database.cachedDocuments,
      )..where((row) => row.tripId.equals(tripId))).go();
      await database.batch((batch) {
        batch.insertAll(
          database.cachedDocuments,
          payloads
              .map(
                (json) => CachedDocumentsCompanion.insert(
                  id: json['id'] as String,
                  tripId: tripId,
                  payload: jsonEncode(json),
                  cachedAt: now,
                ),
              )
              .toList(),
        );
      });
    });
  }

  Future<List<domain.TravelDocument>> readDocuments(String tripId) async {
    final query = database.select(database.cachedDocuments)
      ..where((row) => row.tripId.equals(tripId));
    return (await query.get())
        .map(
          (row) => domain.TravelDocument.fromJson(
            jsonDecode(row.payload) as Map<String, dynamic>,
          ),
        )
        .toList();
  }

  Future<DateTime?> lastSuccessfulSync() async {
    final row =
        await (database.select(database.syncMetadata)..where(
              (candidate) => candidate.key.equals('last_successful_sync'),
            ))
            .getSingleOrNull();
    return row == null ? null : DateTime.tryParse(row.value)?.toLocal();
  }

  Future<void> enqueue({
    required String operation,
    required String entityType,
    required String entityId,
    required int baseVersion,
    required Map<String, dynamic> payload,
  }) => database
      .into(database.offlineMutations)
      .insert(
        OfflineMutationsCompanion.insert(
          mutationId: const Uuid().v4(),
          entityType: entityType,
          entityId: entityId,
          operation: operation,
          payload: jsonEncode(payload),
          baseVersion: baseVersion,
          createdAt: DateTime.now().toUtc(),
        ),
      );

  Future<Map<String, dynamic>> queueTripUpdate({
    required String id,
    required int baseVersion,
    required Map<String, dynamic> payload,
  }) async {
    return database.transaction(() async {
      final row = await (database.select(
        database.cachedTrips,
      )..where((candidate) => candidate.id.equals(id))).getSingle();
      final updated = jsonDecode(row.payload) as Map<String, dynamic>
        ..addAll(payload);
      await (database.update(database.cachedTrips)
            ..where((candidate) => candidate.id.equals(id)))
          .write(CachedTripsCompanion(payload: Value(jsonEncode(updated))));
      await enqueue(
        operation: 'trip.update',
        entityType: 'trip',
        entityId: id,
        baseVersion: baseVersion,
        payload: payload,
      );
      return updated;
    });
  }

  Future<void> queueTripDelete({
    required String id,
    required int baseVersion,
  }) async {
    await database.transaction(() async {
      await (database.update(
        database.cachedTrips,
      )..where((candidate) => candidate.id.equals(id))).write(
        CachedTripsCompanion(deletedAt: Value(DateTime.now().toUtc())),
      );
      await enqueue(
        operation: 'trip.delete',
        entityType: 'trip',
        entityId: id,
        baseVersion: baseVersion,
        payload: const {},
      );
    });
  }

  Future<Map<String, dynamic>> queuePlanUpdate({
    required String id,
    required int baseVersion,
    required Map<String, dynamic> payload,
  }) async {
    return database.transaction(() async {
      final row = await (database.select(
        database.cachedPlans,
      )..where((candidate) => candidate.id.equals(id))).getSingle();
      final updated = jsonDecode(row.payload) as Map<String, dynamic>
        ..addAll(payload);
      await (database.update(database.cachedPlans)
            ..where((candidate) => candidate.id.equals(id)))
          .write(CachedPlansCompanion(payload: Value(jsonEncode(updated))));
      await enqueue(
        operation: 'plan.update',
        entityType: 'plan',
        entityId: id,
        baseVersion: baseVersion,
        payload: payload,
      );
      return updated;
    });
  }

  Future<void> queuePlanDelete({
    required String id,
    required int baseVersion,
  }) async {
    await database.transaction(() async {
      await (database.update(
        database.cachedPlans,
      )..where((candidate) => candidate.id.equals(id))).write(
        CachedPlansCompanion(deletedAt: Value(DateTime.now().toUtc())),
      );
      await enqueue(
        operation: 'plan.delete',
        entityType: 'plan',
        entityId: id,
        baseVersion: baseVersion,
        payload: const {},
      );
    });
  }

  Future<void> clearUserData() async {
    await database.transaction(() async {
      await database.delete(database.cachedTrips).go();
      await database.delete(database.cachedPlans).go();
      await database.delete(database.cachedDocuments).go();
      await database.delete(database.offlineMutations).go();
      await database.delete(database.syncMetadata).go();
    });
  }
}
