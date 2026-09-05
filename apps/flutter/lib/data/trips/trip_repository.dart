import 'package:dio/dio.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/data/offline/offline_store.dart';
import 'package:dorago/domain/models/plan_item.dart';
import 'package:dorago/domain/models/trip.dart';

class NextUp {
  const NextUp({required this.plan, required this.trip});

  final PlanItem plan;
  final Trip trip;
}

class TripRepository {
  const TripRepository(this._api, this._offline);
  final ApiClient _api;
  final OfflineStore _offline;

  Future<List<Trip>> listTrips({bool includeArchived = false}) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        'trips',
        queryParameters: {'include_archived': includeArchived},
      );
      final payloads = response.data!.cast<Map<String, dynamic>>();
      await _offline.replaceTrips(payloads);
      return payloads.map(Trip.fromJson).toList();
    } on DioException {
      final cached = await _offline.readTrips();
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  Future<Trip> createTrip(Map<String, dynamic> values) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      'trips',
      data: values,
    );
    return Trip.fromJson(response.data!);
  }

  Future<NextUp?> nextUp() async {
    try {
      final response = await _api.dio.get<Map<String, dynamic>?>(
        'plans/next-up',
      );
      final data = response.data;
      if (data == null) return null;
      return NextUp(
        plan: PlanItem.fromJson(data['plan'] as Map<String, dynamic>),
        trip: Trip.fromJson(data['trip'] as Map<String, dynamic>),
      );
    } on DioException catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      final trips = await _offline.readTrips();
      final plans = await _offline.readAllPlans();
      final now = DateTime.now().toUtc();
      for (final plan in plans) {
        if (!plan.startUtc.isBefore(now) && plan.status != 'cancelled') {
          final matches = trips.where(
            (trip) => trip.id == plan.tripId && !trip.isArchived,
          );
          if (matches.isNotEmpty) {
            return NextUp(plan: plan, trip: matches.first);
          }
        }
      }
      return null;
    }
  }

  Future<Trip> updateTrip(Trip trip, Map<String, dynamic> values) async {
    try {
      final response = await _api.dio.patch<Map<String, dynamic>>(
        'trips/${trip.id}',
        data: {...values, 'base_version': trip.version},
      );
      return Trip.fromJson(response.data!);
    } on DioException catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      final updated = await _offline.queueTripUpdate(
        id: trip.id,
        baseVersion: trip.version,
        payload: values,
      );
      return Trip.fromJson(updated);
    }
  }

  Future<void> deleteTrip(Trip trip) async {
    try {
      await _api.dio.delete<void>(
        'trips/${trip.id}',
        queryParameters: {'base_version': trip.version},
      );
    } on DioException catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      await _offline.queueTripDelete(id: trip.id, baseVersion: trip.version);
    }
  }

  Future<List<PlanItem>> listPlans(String tripId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>('trips/$tripId/plans');
      final payloads = response.data!.cast<Map<String, dynamic>>();
      await _offline.replacePlans(tripId, payloads);
      return payloads.map(PlanItem.fromJson).toList()
        ..sort((a, b) => a.startUtc.compareTo(b.startUtc));
    } on DioException {
      final cached = await _offline.readPlans(tripId);
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  Future<PlanItem> createPlan(
    String tripId,
    Map<String, dynamic> values,
  ) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      'trips/$tripId/plans',
      data: values,
    );
    return PlanItem.fromJson(response.data!);
  }

  Future<PlanItem> updatePlan(
    PlanItem plan,
    Map<String, dynamic> values,
  ) async {
    try {
      final response = await _api.dio.patch<Map<String, dynamic>>(
        'plans/${plan.id}',
        data: {...values, 'base_version': plan.version},
      );
      return PlanItem.fromJson(response.data!);
    } on DioException catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      final updated = await _offline.queuePlanUpdate(
        id: plan.id,
        baseVersion: plan.version,
        payload: values,
      );
      return PlanItem.fromJson(updated);
    }
  }

  Future<void> deletePlan(PlanItem plan) async {
    try {
      await _api.dio.delete<void>(
        'plans/${plan.id}',
        queryParameters: {'base_version': plan.version},
      );
    } on DioException catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      await _offline.queuePlanDelete(id: plan.id, baseVersion: plan.version);
    }
  }

  Future<PlanItem> duplicatePlan(String planId) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      'plans/$planId/duplicate',
    );
    return PlanItem.fromJson(response.data!);
  }

  bool _isConnectionFailure(DioException error) =>
      error.response == null &&
      error.type != DioExceptionType.badCertificate &&
      error.type != DioExceptionType.cancel;
}
