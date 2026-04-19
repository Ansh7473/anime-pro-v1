import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color primaryRed = Color(0xFFE50914);
  static const Color backgroundBlack = Color(0xFF030303);
  static const Color surfaceGrey = Color(0xFF1A1A1A);
  static const Color textMain = Colors.white;
  static const Color textMuted = Color(0xFFAFAFAF);

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: backgroundBlack,
      primaryColor: primaryRed,
      colorScheme: ColorScheme.dark(
        primary: primaryRed,
        secondary: primaryRed,
        surface: surfaceGrey,
      ),
      textTheme: GoogleFonts.outfitTextTheme().apply(
        bodyColor: textMain,
        displayColor: textMain,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryRed,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      cardTheme: CardThemeData(
        color: surfaceGrey,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }
}
