import 'package:flutter/material.dart';

/// Device form factors the UI adapts to.
enum FormFactor { phone, tablet, tv }

/// Resolves the current [FormFactor] from the media query.
///
/// TV detection is heuristic: Android TV reports a large, landscape, low-DPI
/// surface. We treat very wide, coarse-pointer screens as TV. A real build can
/// refine this with a platform channel querying `uiModeManager`, but width +
/// devicePixelRatio is a robust first cut.
class DeviceInfo {
  DeviceInfo._();

  /// Set to true to force TV layout on any emulator or browser window.
  static const bool forceTv = false;

  static const double _tabletBreakpoint = 600;
  static const double _tvBreakpoint = 960;

  static FormFactor of(BuildContext context) {
    if (forceTv) return FormFactor.tv;

    final mq = MediaQuery.of(context);
    final shortestSide = mq.size.shortestSide;
    final width = mq.size.width;

    // TV: large landscape surface with low pixel density.
    final looksLikeTv = width >= _tvBreakpoint &&
        mq.size.width > mq.size.height &&
        mq.devicePixelRatio <= 2.0;
    if (looksLikeTv) return FormFactor.tv;

    if (shortestSide >= _tabletBreakpoint) return FormFactor.tablet;
    return FormFactor.phone;
  }

  static bool isTv(BuildContext context) => forceTv || of(context) == FormFactor.tv;
  static bool isPhone(BuildContext context) => !isTv(context) && of(context) == FormFactor.phone;

  /// Number of grid columns appropriate for the form factor / width.
  static int gridColumns(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    if (width >= 1400) return 7;
    if (width >= 1100) return 6;
    if (width >= 800) return 5;
    if (width >= 600) return 4;
    if (width >= 400) return 3;
    return 2;
  }
}
