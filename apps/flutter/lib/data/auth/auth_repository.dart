import 'package:dio/dio.dart';
import 'package:dorago/core/config/app_config.dart';
import 'package:dorago/data/api/api_client.dart';
import 'package:dorago/data/auth/token_store.dart';

class AuthResult {
  const AuthResult({required this.user, required this.isFirstLogin});
  final Map<String, dynamic> user;
  final bool isFirstLogin;
}

class AuthRepository {
  const AuthRepository(this._api, this._tokens);
  final ApiClient _api;
  final TokenStore _tokens;

  Future<int> requestOtp(String email) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      'auth/otp/request',
      data: {'email': email.trim().toLowerCase()},
    );
    return response.data!['resend_after_seconds'] as int;
  }

  Future<AuthResult> verifyOtp(String email, String code) async {
    final response = await _api.dio.post<Map<String, dynamic>>(
      'auth/otp/verify',
      data: {
        'email': email.trim().toLowerCase(),
        'code': code,
        'client_type': AppConfig.clientType,
      },
    );
    final data = response.data!;
    _api.setAccessToken(data['access_token'] as String);
    await _tokens.writeRefreshToken(data['refresh_token'] as String?);
    return AuthResult(
      user: data['user'] as Map<String, dynamic>,
      isFirstLogin: data['is_first_login'] as bool,
    );
  }

  Future<Map<String, dynamic>?> restore() async {
    try {
      return await _api.refresh();
    } on DioException {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await _api.dio.post<void>('auth/logout');
    } finally {
      _api.setAccessToken(null);
      await _tokens.clear();
    }
  }

  Future<void> deleteAccount() async {
    await _api.dio.delete<void>('users/me');
    _api.setAccessToken(null);
    await _tokens.clear();
  }
}
