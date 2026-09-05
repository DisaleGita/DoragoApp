import 'package:drift/native.dart';
import 'package:dorago/data/offline/offline_database.dart';
import 'package:dorago/data/offline/offline_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late OfflineDatabase database;
  late OfflineStore store;

  setUp(() {
    database = OfflineDatabase.forTesting(NativeDatabase.memory());
    store = OfflineStore(database);
  });

  tearDown(() => database.close());

  test('offline updates remain queued with a stable mutation ID', () async {
    await store.replaceTrips([_tripJson]);

    final updated = await store.queueTripUpdate(
      id: _tripJson['id']! as String,
      baseVersion: 3,
      payload: const {'title': 'Updated while offline'},
    );

    final mutations = await database.select(database.offlineMutations).get();
    expect(updated['title'], 'Updated while offline');
    expect(mutations, hasLength(1));
    expect(mutations.single.operation, 'trip.update');
    expect(mutations.single.baseVersion, 3);
    expect(mutations.single.mutationId, isNotEmpty);

    final reread = await store.readTrips();
    expect(reread.single.title, 'Updated while offline');
    expect(
      (await database.select(database.offlineMutations).get())
          .single
          .mutationId,
      mutations.single.mutationId,
    );
  });

  test('offline deletion creates a tombstone and keeps its mutation', () async {
    await store.replaceTrips([_tripJson]);

    await store.queueTripDelete(id: _tripJson['id']! as String, baseVersion: 3);

    expect(await store.readTrips(), isEmpty);
    final cached = await database.select(database.cachedTrips).getSingle();
    expect(cached.deletedAt, isNotNull);
    final mutation = await database
        .select(database.offlineMutations)
        .getSingle();
    expect(mutation.operation, 'trip.delete');
    expect(mutation.lastError, isNull);
  });

  test('selected document metadata survives an offline reopen', () async {
    await store.replaceDocuments(_tripJson['id']! as String, [_documentJson]);

    final documents = await store.readDocuments(_tripJson['id']! as String);

    expect(documents, hasLength(1));
    expect(documents.single.fileName, 'boarding-pass.pdf');
    expect(documents.single.category, 'boarding_pass');
  });
}

const _tripJson = <String, dynamic>{
  'id': '00000000-0000-4000-8000-000000000001',
  'title': 'Chicago Weekend',
  'primary_destination': 'Chicago',
  'start_date': '2026-09-05',
  'end_date': '2026-09-07',
  'timezone': 'America/Chicago',
  'status': 'upcoming',
  'version': 3,
  'plan_count': 0,
  'total_cost_grouped': <String, dynamic>{},
  'is_archived': false,
};

const _documentJson = <String, dynamic>{
  'id': '00000000-0000-4000-8000-000000000003',
  'trip_id': '00000000-0000-4000-8000-000000000001',
  'plan_id': '00000000-0000-4000-8000-000000000002',
  'file_name': 'boarding-pass.pdf',
  'mime_type': 'application/pdf',
  'file_size_bytes': 2048,
  'document_category': 'boarding_pass',
  'created_at': '2026-09-05T12:00:00Z',
};
