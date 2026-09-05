import 'package:dio/dio.dart';
import 'package:dorago/core/config/app_config.dart';
import 'package:dorago/data/api/http_adapter_stub.dart'
    if (dart.library.js_interop) 'package:dorago/data/api/http_adapter_web.dart';
import 'package:dorago/data/auth/token_store.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.code, this.message, {this.details});
  final String code;
  final String message;
  final Object? details;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._tokenStore)
    : dio = Dio(
        BaseOptions(
          baseUrl: '${AppConfig.apiBaseUrl.replaceAll(RegExp(r'/+$'), '')}/',
          connectTimeout: const Duration(seconds: 15),
          receiveTimeout: const Duration(seconds: 30),
          headers: const {'Accept': 'application/json'},
        ),
      ) {
    configurePlatformAdapter(dio);
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (_accessToken case final token?) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: _handleError,
      ),
    );
  }

  final Dio dio;
  final TokenStore _tokenStore;
  String? _accessToken;
  Future<void>? _refreshing;

  void setAccessToken(String? token) => _accessToken = token;

  Future<void> _handleError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    final canRefresh =
        error.response?.statusCode == 401 &&
        request.extra['dorago_retried'] != true &&
        !request.path.startsWith('auth/');
    if (canRefresh) {
      try {
        await (_refreshing ??= _refresh());
        request.extra['dorago_retried'] = true;
        request.headers['Authorization'] = 'Bearer $_accessToken';
        final response = await dio.fetch<dynamic>(request);
        handler.resolve(response);
        return;
      } on Object {
        await _tokenStore.clear();
        _accessToken = null;
      } finally {
        _refreshing = null;
      }
    }
    handler.reject(_asDioError(error));
  }

  Future<Map<String, dynamic>> refresh() async {
    await _refresh();
    final response = await dio.get<Map<String, dynamic>>('users/me');
    return response.data!;
  }

  Future<void> _refresh() async {
    final refreshToken = await _tokenStore.readRefreshToken();
    final payload = <String, dynamic>{'client_type': AppConfig.clientType};
    if (refreshToken != null) {
      payload['refresh_token'] = refreshToken;
    }
    final response = await dio.post<Map<String, dynamic>>(
      'auth/refresh',
      data: payload,
      options: Options(extra: {'dorago_retried': true}),
    );
    final data = response.data!;
    _accessToken = data['access_token'] as String;
    await _tokenStore.writeRefreshToken(data['refresh_token'] as String?);
  }

  DioException _asDioError(DioException error) {
    final body = error.response?.data;
    if (body is Map<String, dynamic>) {
      final nested = body['error'];
      final source = nested is Map<String, dynamic> ? nested : body;
      error = error.copyWith(
        error: ApiFailure(
          source['code'] as String? ?? 'request_failed',
          source['message'] as String? ?? 'The request could not be completed.',
          details: source['details'],
        ),
      );
    }
    return error;
  }
}

ApiFailure readableFailure(Object error) {
  if (error is DioException && error.error is ApiFailure) {
    return error.error! as ApiFailure;
  }
  return const ApiFailure(
    'connection_error',
    'Unable to connect. Please try again.',
  );
}
