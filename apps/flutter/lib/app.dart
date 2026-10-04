import 'package:dorago/application/providers.dart';
import 'package:dorago/core/theme/app_theme.dart';
import 'package:dorago/presentation/auth/login_screen.dart';
import 'package:dorago/presentation/auth/onboarding_screen.dart';
import 'package:dorago/presentation/auth/otp_screen.dart';
import 'package:dorago/presentation/import/import_screen.dart';
import 'package:dorago/presentation/profile/profile_screen.dart';
import 'package:dorago/presentation/shared/app_shell.dart';
import 'package:dorago/presentation/trips/trip_detail_screen.dart';
import 'package:dorago/presentation/trips/trips_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

final routerProvider = Provider<GoRouter>((ref) {
  // The router is created once so the browser location survives session
  // restoration; session changes only re-run the redirect.
  final sessionStatus = ValueNotifier(ref.read(sessionProvider).status);
  ref.listen(sessionProvider, (_, next) => sessionStatus.value = next.status);
  ref.onDispose(sessionStatus.dispose);
  final router = GoRouter(
    initialLocation: '/trips',
    refreshListenable: sessionStatus,
    redirect: (context, state) =>
        sessionRedirect(sessionStatus.value, state.matchedLocation, state.uri),
    routes: [
      GoRoute(
        path: '/loading',
        builder: (context, state) =>
            const Scaffold(body: Center(child: CircularProgressIndicator())),
      ),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(
        path: '/verify',
        builder: (context, state) => OtpScreen(
          email: state.uri.queryParameters['email'] ?? '',
          resendAfterSeconds:
              int.tryParse(state.uri.queryParameters['resend_after'] ?? '') ??
              30,
        ),
      ),
      GoRoute(
        path: '/onboarding',
        builder: (context, state) => const OnboardingScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) =>
            AppShell(location: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: '/trips',
            builder: (context, state) => const TripsScreen(),
          ),
          GoRoute(
            path: '/trips/:tripId',
            builder: (context, state) =>
                TripDetailScreen(tripId: state.pathParameters['tripId']!),
          ),
          GoRoute(
            path: '/import',
            builder: (context, state) => ImportScreen(
              initialTripId: state.uri.queryParameters['trip_id'],
            ),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
  ref.onDispose(router.dispose);
  return router;
});

/// Sends visitors to the screen their session allows while remembering the
/// location they asked for, so a browser refresh or deep link reopens it.
String? sessionRedirect(
  SessionStatus status,
  String matchedLocation,
  Uri requested,
) {
  final authRoute = matchedLocation == '/login' || matchedLocation == '/verify';
  final onLoading = matchedLocation == '/loading';
  return switch (status) {
    SessionStatus.loading =>
      onLoading
          ? null
          : Uri(
              path: '/loading',
              queryParameters: {'from': requested.toString()},
            ).toString(),
    SessionStatus.unauthenticated => authRoute ? null : '/login',
    SessionStatus.authenticated when onLoading => _safeReturnLocation(
      requested.queryParameters['from'],
    ),
    SessionStatus.authenticated => authRoute ? '/trips' : null,
  };
}

String _safeReturnLocation(String? from) {
  final location = from == null ? null : Uri.tryParse(from);
  // Only same-app paths are accepted; anything else falls back to the list.
  if (location == null ||
      location.hasScheme ||
      location.hasAuthority ||
      !location.path.startsWith('/') ||
      location.path.startsWith('//') ||
      const {'/loading', '/login', '/verify'}.contains(location.path)) {
    return '/trips';
  }
  return location.toString();
}

class DoragoApp extends ConsumerWidget {
  const DoragoApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => MaterialApp.router(
    title: 'Dorago',
    debugShowCheckedModeBanner: false,
    theme: AppTheme.dark,
    routerConfig: ref.watch(routerProvider),
  );
}
