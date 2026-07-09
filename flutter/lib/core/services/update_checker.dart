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
/// The app version (from pubspec, bumped in CI via build number) is compared
/// against the latest release tag. After installing an update, the versions
/// match → no notification.
class UpdateChecker {
  static const _kDismissedKey = 'dismissed_release_version';

  /// Parse a version string into comparable integers.
  /// e.g. "android-v1.0.0+42" → [1, 0, 0, 42]
  /// e.g. "1.0.0+42" → [1, 0, 0, 42]
  static List<int> _parseVersion(String v) {
    var s = v
        .replaceAll(RegExp(r'^android-v', caseSensitive: false), '')
        .replaceAll(RegExp(r'^v', caseSensitive: false), '');
    return s
        .split(RegExp(r'[.+-]'))
        .where((p) => p.isNotEmpty)
        .where((p) => int.tryParse(p) != null)
        .map(int.parse)
        .toList();
  }

  /// True if [releaseVersion] is strictly newer than [installedVersion].
  static bool _isNewer(String releaseVersion, String installedVersion) {
    final a = _parseVersion(releaseVersion);
    final b = _parseVersion(installedVersion);
    for (var i = 0; i < a.length && i < b.length; i++) {
      if (a[i] > b[i]) return true;
      if (a[i] < b[i]) return false;
    }
    return a.length > b.length;
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

      // Get the real installed app version (e.g. "1.0.0+42").
      final info = await PackageInfo.fromPlatform();
      final installed = '${info.version}+${info.buildNumber}';

      // Release not newer than installed? Up-to-date.
      if (!_isNewer(latest.version, installed)) return UpdateInfo.none;

      // Already dismissed this exact version?
      final prefs = await SharedPreferences.getInstance();
      final dismissed = prefs.getString(_kDismissedKey);
      if (dismissed == latest.version) return UpdateInfo.none;

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
