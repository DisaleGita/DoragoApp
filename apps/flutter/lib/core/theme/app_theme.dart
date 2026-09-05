import 'package:flutter/material.dart';

abstract final class AppTheme {
  static const teal = Color(0xFF2DD4BF);
  static const canvas = Color(0xFF020617);
  static const surface = Color(0xFF0F172A);

  static ThemeData get dark {
    final scheme = ColorScheme.fromSeed(
      seedColor: teal,
      brightness: Brightness.dark,
      surface: surface,
    );
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: scheme,
      scaffoldBackgroundColor: canvas,
      cardTheme: const CardThemeData(
        color: surface,
        elevation: 0,
        margin: EdgeInsets.zero,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF334155)),
        ),
      ),
      dialogTheme: const DialogThemeData(backgroundColor: surface),
      navigationBarTheme: const NavigationBarThemeData(
        backgroundColor: Color(0xFF0B1220),
        indicatorColor: Color(0x332DD4BF),
      ),
    );
  }
}
