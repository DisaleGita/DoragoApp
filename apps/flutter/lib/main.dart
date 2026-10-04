import 'package:dorago/app.dart';
import 'package:dorago/application/providers.dart';
import 'package:dorago/core/timezones.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final deviceTimezone = await detectDeviceTimezone();
  runApp(
    ProviderScope(
      overrides: [deviceTimezoneProvider.overrideWithValue(deviceTimezone)],
      child: const DoragoApp(),
    ),
  );
}
