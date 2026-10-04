import 'package:dorago/app.dart';
import 'package:dorago/application/providers.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('a deep link survives session restoration', () {
    final deepLink = Uri.parse('/trips/abc?tab=docs');

    final toLoading = sessionRedirect(
      SessionStatus.loading,
      '/trips/abc',
      deepLink,
    );
    expect(toLoading, isNotNull);

    final loading = Uri.parse(toLoading!);
    expect(loading.path, '/loading');
    expect(
      sessionRedirect(SessionStatus.authenticated, '/loading', loading),
      '/trips/abc?tab=docs',
    );
  });

  test('restoration never returns to an external or auth location', () {
    for (final from in ['https://evil.example', '//evil.example', '/login']) {
      final loading = Uri(path: '/loading', queryParameters: {'from': from});
      expect(
        sessionRedirect(SessionStatus.authenticated, '/loading', loading),
        '/trips',
      );
    }
  });

  test('signed-out visitors are sent to login', () {
    expect(
      sessionRedirect(
        SessionStatus.unauthenticated,
        '/trips/abc',
        Uri.parse('/trips/abc'),
      ),
      '/login',
    );
  });
}
