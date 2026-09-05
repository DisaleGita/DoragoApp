import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStore {
  const TokenStore(this._storage);

  static const _refreshKey = 'dorago_refresh_token';
  final FlutterSecureStorage _storage;

  Future<String?> readRefreshToken() async {
    if (kIsWeb) return null;
    return _storage.read(key: _refreshKey);
  }

  Future<void> writeRefreshToken(String? value) async {
    if (kIsWeb) return;
    if (value == null) {
      await _storage.delete(key: _refreshKey);
    } else {
      await _storage.write(key: _refreshKey, value: value);
    }
  }

  Future<void> clear() => writeRefreshToken(null);
}
