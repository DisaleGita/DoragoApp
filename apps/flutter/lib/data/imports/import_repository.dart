import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:dorago/data/api/api_client.dart';

class ImportRepository {
  const ImportRepository(this._api);
  final ApiClient _api;

  Future<Map<String, dynamic>> parseText(String text, {String? tripId}) async {
    final formValues = <String, dynamic>{'text': text};
    if (tripId != null) {
      formValues['target_trip_id'] = tripId;
    }
    final response = await _api.dio.post<Map<String, dynamic>>(
      'imports',
      data: FormData.fromMap(formValues),
    );
    return response.data!;
  }

  Future<Map<String, dynamic>> parseFile({
    required String fileName,
    required Uint8List bytes,
    String? tripId,
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
    };
    if (tripId != null) {
      formValues['target_trip_id'] = tripId;
    }
    final response = await _api.dio.post<Map<String, dynamic>>(
      'imports',
      data: FormData.fromMap(formValues),
    );
    return response.data!;
  }

  Future<String> accept({
    required String importId,
    required List<Map<String, dynamic>> proposals,
    String? tripId,
    Map<String, dynamic>? newTrip,
  }) async {
    if ((tripId == null) == (newTrip == null)) {
      throw ArgumentError('Provide exactly one import target.');
    }
    final response = await _api.dio.post<Map<String, dynamic>>(
      'imports/$importId/accept',
      data: {
        'target_trip_id': ?tripId,
        'new_trip': ?newTrip,
        'proposals': proposals,
      },
    );
    return response.data!['trip_id'] as String;
  }
}
