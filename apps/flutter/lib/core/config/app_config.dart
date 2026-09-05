import 'package:flutter/foundation.dart';

abstract final class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: '/api/v1',
  );

  static String get clientType => kIsWeb ? 'web' : 'mobile';
}
