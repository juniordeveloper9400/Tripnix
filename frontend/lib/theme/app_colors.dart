import 'package:flutter/material.dart';

/// Central colour palette for Tripnix — a black / red / yellow theme.
class AppColors {
  AppColors._();

  static const Color black = Color(0xFF1A1A1A);
  static const Color red = Color(0xFFE53935);
  static const Color darkRed = Color(0xFFB71C1C);
  static const Color yellow = Color(0xFFFFC61A);

  /// Neutral app background.
  static const Color background = Color(0xFFFFFFFF);

  /// Soft tint used behind info pills.
  static const Color pillBg = Color(0xFFFDECEA);

  /// Header gradient (black → red).
  static const List<Color> headerGradient = [black, red];
}
