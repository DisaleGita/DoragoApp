import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/data/offline/offline_database.dart';

class SyncConflict {
  const SyncConflict(this.entityId, this.currentVersion);
  final String entityId;
  final int? currentVersion;
}

class SyncRepository {
  const SyncRepository(this._api, this._database);
  final ApiClient _api;
  final OfflineDatabase _database;

  Future<List<SyncConflict>> pushPending() async {
    final rows = await (_database.select(
      _database.offlineMutations,
    )..orderBy([(row) => OrderingTerm.asc(row.createdAt)])).get();
    if (rows.isEmpty) return const [];
    final response = await _api.dio.post<Map<String, dynamic>>(
      'sync/mutations',
      data: {
        'mutations': rows
            .map(
              (row) => {
                'mutation_id': row.mutationId,
                'operation': row.operation,
                'entity_id': row.entityId,
                'base_version': row.baseVersion,
                'payload': jsonDecode(row.payload),
              },
            )
            .toList(),
      },
    );
    final results = (response.data!['results'] as List<dynamic>)
        .cast<Map<String, dynamic>>();
    final conflicts = <SyncConflict>[];
    for (final result in results) {
      final mutationId = result['mutation_id'] as String;
      if (result['status'] == 'applied') {
        await (_database.delete(
          _database.offlineMutations,
        )..where((row) => row.mutationId.equals(mutationId))).go();
      } else {
        final message = result['error_code'] as String? ?? 'sync_rejected';
        await (_database.update(_database.offlineMutations)
              ..where((row) => row.mutationId.equals(mutationId)))
            .write(OfflineMutationsCompanion(lastError: Value(message)));
        if (result['status'] == 'conflict') {
          conflicts.add(
            SyncConflict(
              result['entity_id'] as String,
              result['current_version'] as int?,
            ),
          );
        }
      }
    }
    return conflicts;
  }

  Future<void> pullChanges() async {
    final cursorRow = await (_database.select(
      _database.syncMetadata,
    )..where((row) => row.key.equals('sync_cursor'))).getSingleOrNull();
    final since =
        cursorRow?.value ??
        DateTime.fromMillisecondsSinceEpoch(0, isUtc: true).toIso8601String();
    final response = await _api.dio.get<Map<String, dynamic>>(
      'sync/changes',
      queryParameters: {'since': since},
    );
    final changes = (response.data!['changes'] as List<dynamic>)
        .cast<Map<String, dynamic>>();
    final cachedAt = DateTime.now().toUtc();
    await _database.transaction(() async {
      for (final change in changes) {
        final entityType = change['entity_type'] as String;
        final entityId = change['entity_id'] as String;
        final deletedAt = change['deleted_at'] == null
            ? null
            : DateTime.parse(change['deleted_at'] as String).toUtc();
        final payload = change['payload'] as Map<String, dynamic>?;
        if (entityType == 'trip') {
          if (payload != null) {
            await _database
                .into(_database.cachedTrips)
                .insertOnConflictUpdate(
                  CachedTripsCompanion.insert(
                    id: entityId,
                    payload: jsonEncode(payload),
                    entityVersion: change['version'] as int,
                    cachedAt: cachedAt,
                    deletedAt: Value(deletedAt),
                  ),
                );
          } else {
            await (_database.update(_database.cachedTrips)
                  ..where((row) => row.id.equals(entityId)))
                .write(CachedTripsCompanion(deletedAt: Value(deletedAt)));
          }
        } else if (entityType == 'plan') {
          if (payload != null) {
            await _database
                .into(_database.cachedPlans)
                .insertOnConflictUpdate(
                  CachedPlansCompanion.insert(
                    id: entityId,
                    tripId: payload['trip_id'] as String,
                    payload: jsonEncode(payload),
                    entityVersion: change['version'] as int,
                    cachedAt: cachedAt,
                    deletedAt: Value(deletedAt),
                  ),
                );
          } else {
            await (_database.update(_database.cachedPlans)
                  ..where((row) => row.id.equals(entityId)))
                .write(CachedPlansCompanion(deletedAt: Value(deletedAt)));
          }
        }
      }
      final nextCursor = response.data!['next_cursor'] as String;
      await _database
          .into(_database.syncMetadata)
          .insertOnConflictUpdate(
            SyncMetadataCompanion.insert(key: 'sync_cursor', value: nextCursor),
          );
      await _database
          .into(_database.syncMetadata)
          .insertOnConflictUpdate(
            SyncMetadataCompanion.insert(
              key: 'last_successful_sync',
              value: cachedAt.toIso8601String(),
            ),
          );
    });
  }

  Future<List<SyncConflict>> synchronize() async {
    final conflicts = await pushPending();
    if (conflicts.isEmpty) {
      await pullChanges();
    }
    return conflicts;
  }
}
