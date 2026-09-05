import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/data/offline/offline_store.dart';
import 'package:dorago/domain/models/travel_document.dart';

class DocumentRepository {
  const DocumentRepository(this._api, this._offline);
  final ApiClient _api;
  final OfflineStore _offline;

  Future<List<TravelDocument>> list(String tripId) async {
    try {
      final response = await _api.dio.get<List<dynamic>>(
        'trips/$tripId/documents',
      );
      final payloads = response.data!.cast<Map<String, dynamic>>();
      await _offline.replaceDocuments(tripId, payloads);
      return payloads.map(TravelDocument.fromJson).toList();
    } on DioException catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      final cached = await _offline.readDocuments(tripId);
      if (cached.isNotEmpty) return cached;
      rethrow;
    }
  }

  Future<TravelDocument> upload({
    required String tripId,
    required String fileName,
    required Uint8List bytes,
    String category = 'other',
    String? planId,
  }) async {
    final extension = fileName.split('.').last.toLowerCase();
    final mime = switch (extension) {
      'pdf' => 'application/pdf',
      'png' => 'image/png',
      'jpg' || 'jpeg' => 'image/jpeg',
      'webp' => 'image/webp',
      _ => 'application/octet-stream',
    };
    final formValues = <String, dynamic>{
      'upload': MultipartFile.fromBytes(
        bytes,
        filename: fileName,
        contentType: DioMediaType.parse(mime),
      ),
      'category': category,
    };
    if (planId != null) {
      formValues['plan_id'] = planId;
    }
    final response = await _api.dio.post<Map<String, dynamic>>(
      'trips/$tripId/documents',
      data: FormData.fromMap(formValues),
    );
    return TravelDocument.fromJson(response.data!);
  }

  Future<Uint8List> download(String documentId) async {
    final response = await _api.dio.get<List<int>>(
      'documents/$documentId/download',
      options: Options(responseType: ResponseType.bytes),
    );
    return Uint8List.fromList(response.data!);
  }

  Future<void> delete(String documentId) =>
      _api.dio.delete<void>('documents/$documentId');

  bool _isConnectionFailure(DioException error) =>
      error.response == null &&
      error.type != DioExceptionType.badCertificate &&
      error.type != DioExceptionType.cancel;
}
