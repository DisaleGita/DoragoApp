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
  final session = ref.watch(sessionProvider);
  return GoRouter(
    initialLocation: '/trips',
    redirect: (context, state) {
      final authRoute =
          state.matchedLocation == '/login' ||
          state.matchedLocation == '/verify';
      return switch (session.status) {
        SessionStatus.loading =>
          state.matchedLocation == '/loading' ? null : '/loading',
        SessionStatus.unauthenticated => authRoute ? null : '/login',
        SessionStatus.authenticated =>
          authRoute || state.matchedLocation == '/loading' ? '/trips' : null,
      };
    },
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
});

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
