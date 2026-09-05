import 'package:dio/browser.dart';
import 'package:dio/dio.dart';

void configurePlatformAdapter(Dio dio) {
  dio.httpClientAdapter = BrowserHttpClientAdapter()..withCredentials = true;
}
