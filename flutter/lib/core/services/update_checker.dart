import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../data/services/api_service.dart';
import '../providers/providers.dart';

/// Holds the result of an update check.
class UpdateInfo {
  const UpdateInfo({
    required this.hasUpdate,
    required this.version,
    required this.downloadUrl,
  });

  final bool hasUpdate;
  final String version;
  final String downloadUrl;

  static const none = UpdateInfo(
    hasUpdate: false,
    version: '',
    downloadUrl: '',
  );
}

/// Checks if a newer Android release exists on GitHub (via backend).
///
/// The installed app version (from PackageInfo — versionName + versionCode) is
/// compared against the latest Android release tag. Tags must match the APK
/// version baked at build time (CI passes the same string to both).
///
/// Only **strictly newer** releases trigger a notification. Equal or older
/// remote versions never notify.
class UpdateChecker {
  static const _kDismissedKey = 'dismissed_release_version';

  /// Parse a version / release-tag string into comparable integers.
  ///
  /// Examples:
  /// - `android-v2026.7.9+163` → `[2026, 7, 9, 163]`
  /// - `2026.7.9+163` → `[2026, 7, 9, 163]`
  /// - `android-v2026.07.09-abc1234` → `[2026, 7, 9]` (non-numeric segments dropped)
  /// - `v1.0.0+42` → `[1, 0, 0, 42]`
  static List<int> parseVersion(String v) {
    var s = v.trim();
    // Strip platform prefix: android- / desktop- / tv-
    s = s.replaceFirst(
      RegExp(r'^(android|desktop|tv)-', caseSensitive: false),
      '',
    );
    // Strip leading 'v' (e.g. v2026.7.9+163 or v1.0.0)
    s = s.replaceFirst(RegExp(r'^v', caseSensitive: false), '');
    // URL-encoded plus from some download URLs
    s = s.replaceAll('%2B', '+').replaceAll('%2b', '+');

    return s
        .split(RegExp(r'[.+-]'))
        .where((p) => p.isNotEmpty)
        .map((p) => int.tryParse(p))
        .whereType<int>()
        .toList();
  }

  /// True if [releaseVersion] is strictly newer than [installedVersion].
  ///
  /// Equal versions (including same date + same build) → false.
  /// Empty / unparseable either side → false (never spuriously notify).
  static bool isNewer(String releaseVersion, String installedVersion) {
    final a = parseVersion(releaseVersion);
    final b = parseVersion(installedVersion);
    if (a.isEmpty || b.isEmpty) return false;

    final len = a.length < b.length ? a.length : b.length;
    for (var i = 0; i < len; i++) {
      if (a[i] > b[i]) return true;
      if (a[i] < b[i]) return false;
    }
    // Same prefix: only newer if release has extra numeric segments that
    // installed lacks (e.g. 1.0.0+2 vs 1.0.0). Extra trailing zeros don't
    // count as newer in practice because CI always emits name+build.
    if (a.length == b.length) return false;
    if (a.length > b.length) {
      return a.skip(b.length).any((n) => n > 0);
    }
    return false;
  }

  /// Same version identity (after normalization), used for dismiss matching.
  static bool isSameVersion(String a, String b) {
    final pa = parseVersion(a);
    final pb = parseVersion(b);
    if (pa.isEmpty || pb.isEmpty) {
      return a.trim().toLowerCase() == b.trim().toLowerCase();
    }
    if (pa.length != pb.length) return false;
    for (var i = 0; i < pa.length; i++) {
      if (pa[i] != pb[i]) return false;
    }
    return true;
  }

  static Future<UpdateInfo> check(ApiService api) async {
    try {
      final releases = await api.getLatestReleases();
      final android = releases.where((r) => r.platform == 'android').toList();
      if (android.isEmpty) return UpdateInfo.none;

      final latest = android.first;
      if (latest.version.isEmpty || latest.downloadUrl.isEmpty) {
        return UpdateInfo.none;
      }

      // Real installed version: Flutter maps pubspec name → versionName,
      // pubspec +build → versionCode / buildNumber.
      final info = await PackageInfo.fromPlatform();
      final installed = '${info.version}+${info.buildNumber}';

      // Only notify when remote is strictly newer than installed.
      if (!isNewer(latest.version, installed)) return UpdateInfo.none;

      // Already dismissed this release (compare normalized identity)?
      final prefs = await SharedPreferences.getInstance();
      final dismissed = prefs.getString(_kDismissedKey);
      if (dismissed != null &&
          dismissed.isNotEmpty &&
          isSameVersion(dismissed, latest.version)) {
        return UpdateInfo.none;
      }

      return UpdateInfo(
        hasUpdate: true,
        version: latest.version,
        downloadUrl: latest.downloadUrl,
      );
    } catch (_) {
      return UpdateInfo.none;
    }
  }

  static Future<void> dismiss(String version) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kDismissedKey, version);
  }
}

/// Async provider — runs once on app start, caches result.
final updateCheckProvider = FutureProvider.autoDispose<UpdateInfo>((ref) async {
  ref.keepAlive();
  final api = ref.watch(apiServiceProvider);
  return UpdateChecker.check(api);
});
