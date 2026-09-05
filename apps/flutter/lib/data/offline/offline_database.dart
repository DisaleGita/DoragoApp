import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';

part 'offline_database.g.dart';

class CachedTrips extends Table {
  TextColumn get id => text()();
  TextColumn get payload => text()();
  IntColumn get entityVersion => integer()();
  DateTimeColumn get cachedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column<Object>> get primaryKey => {id};
}

class CachedPlans extends Table {
  TextColumn get id => text()();
  TextColumn get tripId => text()();
  TextColumn get payload => text()();
  IntColumn get entityVersion => integer()();
  DateTimeColumn get cachedAt => dateTime()();
  DateTimeColumn get deletedAt => dateTime().nullable()();
  @override
  Set<Column<Object>> get primaryKey => {id};
}

class CachedDocuments extends Table {
  TextColumn get id => text()();
  TextColumn get tripId => text()();
  TextColumn get payload => text()();
  DateTimeColumn get cachedAt => dateTime()();
  @override
  Set<Column<Object>> get primaryKey => {id};
}

class OfflineMutations extends Table {
  TextColumn get mutationId => text()();
  TextColumn get entityType => text()();
  TextColumn get entityId => text()();
  TextColumn get operation => text()();
  TextColumn get payload => text()();
  IntColumn get baseVersion => integer()();
  DateTimeColumn get createdAt => dateTime()();
  TextColumn get lastError => text().nullable()();
  @override
  Set<Column<Object>> get primaryKey => {mutationId};
}

class SyncMetadata extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  @override
  Set<Column<Object>> get primaryKey => {key};
}

@DriftDatabase(
  tables: [
    CachedTrips,
    CachedPlans,
    CachedDocuments,
    OfflineMutations,
    SyncMetadata,
  ],
)
class OfflineDatabase extends _$OfflineDatabase {
  OfflineDatabase() : super(driftDatabase(name: 'dorago'));
  OfflineDatabase.forTesting(super.executor);

  @override
  int get schemaVersion => 2;

  @override
  MigrationStrategy get migration => MigrationStrategy(
    onCreate: (migrator) => migrator.createAll(),
    onUpgrade: (migrator, from, to) async {
      if (from < 2) await migrator.createTable(cachedDocuments);
    },
  );
}
