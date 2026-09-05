import 'dart:convert';
import 'dart:typed_data';

import 'package:dorago/data/api/api_client.dart';

class ProfileRepository {
  const ProfileRepository(this._api);
  final ApiClient _api;

  Future<Map<String, dynamic>> update(Map<String, dynamic> values) async {
    final response = await _api.dio.patch<Map<String, dynamic>>(
      'users/me',
      data: values,
    );
    return response.data!;
  }

  Future<Uint8List> export() async {
    final response = await _api.dio.get<Map<String, dynamic>>(
      'users/me/export',
    );
    return Uint8List.fromList(
      utf8.encode(const JsonEncoder.withIndent('  ').convert(response.data)),
    );
  }
}
