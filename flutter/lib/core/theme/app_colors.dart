import 'package:flutter/material.dart';

/// WatchAnimez brand palette — mirrors the website's CSS custom properties.
class AppColors {
  AppColors._();

  static const Color red = Color(0xFFE50914); // --net-red
  static const Color redHover = Color(0xFFF40612); // --net-red-hover
  static const Color bg = Color(0xFF0A0A0A); // --net-bg
  static const Color bgLite = Color(0xFF141414); // --net-bg-lite
  static const Color card = Color(0xFF181818); // --net-card-bg
  static const Color cardHover = Color(0xFF262626); // --net-card-hover
  static const Color text = Color(0xFFFFFFFF); // --net-text
  static const Color textMuted = Color(0xFFA3A3A3); // --net-text-muted

  static const LinearGradient redGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [red, Color(0xFF7C040A)],
  );

  /// Bottom-up scrim used over hero/poster art for legible text.
  static const LinearGradient bottomScrim = LinearGradient(
    begin: Alignment.bottomCenter,
    end: Alignment.topCenter,
    colors: [bg, Colors.transparent],
  );
}
