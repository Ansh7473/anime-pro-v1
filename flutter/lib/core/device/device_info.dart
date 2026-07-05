import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Device form factors the UI adapts to.
enum FormFactor { phone, tablet, tv }

/// Resolves the current [FormFactor] from the media query.
///
/// Uses a platform channel (`com.watchanimez/platform`) on Android to reliably
/// detect TV mode via `UiModeManager`. Falls back to a size/DPI heuristic on
/// platforms that don't implement the channel (web, iOS, desktop).
class DeviceInfo {
  DeviceInfo._();

  static const _channel = MethodChannel('com.watchanimez/platform');

  /// Set to true to force TV layout on any emulator or browser window.
  static const bool forceTv = false;

  /// Cached platform-channel result. `null` means init() wasn't called or
  /// the channel isn't available (non-Android).
  static bool? _platformIsTv;

  /// Call once at app startup (e.g. in `main()`) to query the native platform.
  /// Safe to call on platforms that don't implement the channel — it just
  /// falls back to the heuristic.
  static Future<void> init() async {
    try {
      final isTv = await _channel.invokeMethod<bool>('isTV');
      _platformIsTv = isTv ?? false;
    } on MissingPluginException {
      // Platform doesn't implement the channel (web, iOS, desktop).
      _platformIsTv = null;
    } on PlatformException {
      _platformIsTv = null;
    }
  }

  static const double _tabletBreakpoint = 600;
  static const double _tvBreakpoint = 960;

  static FormFactor of(BuildContext context) {
    if (forceTv) return FormFactor.tv;

    // Most reliable: native platform check.
    if (_platformIsTv == true) return FormFactor.tv;

    final mq = MediaQuery.of(context);
    final shortestSide = mq.size.shortestSide;
    final width = mq.size.width;

    // Heuristic fallback: large landscape surface with low pixel density.
    final looksLikeTv =
        width >= _tvBreakpoint &&
        mq.size.width > mq.size.height &&
        mq.devicePixelRatio <= 2.0;
    if (looksLikeTv) return FormFactor.tv;

    if (shortestSide >= _tabletBreakpoint) return FormFactor.tablet;
    return FormFactor.phone;
  }

  static bool isTv(BuildContext context) =>
      forceTv || of(context) == FormFactor.tv;
  static bool isPhone(BuildContext context) =>
      !isTv(context) && of(context) == FormFactor.phone;

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
