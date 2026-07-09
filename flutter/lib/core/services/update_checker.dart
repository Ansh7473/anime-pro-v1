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
/// Resolves the installed app version from `package_info_plus` and compares
/// against the latest "android" platform release. The user can dismiss a
/// notification for a specific version — it won't show again until a newer
/// one appears.
class UpdateChecker {
  static const _kDismissedKey = 'dismissed_release_version';

  /// Fetch and compare. Returns [UpdateInfo.none] if up-to-date or dismissed.
  static Future<UpdateInfo> check(ApiService api) async {
    try {
      final releases = await api.getLatestReleases();
      final android = releases.where((r) => r.platform == 'android').toList();
      if (android.isEmpty) return UpdateInfo.none;

      final latest = android.first;
      if (latest.version.isEmpty || latest.downloadUrl.isEmpty) {
        return UpdateInfo.none;
      }

      // Get the real installed app version.
      final info = await PackageInfo.fromPlatform();
      final installedVersion = '${info.version}+${info.buildNumber}';

      if (!latest.isNewerThan(installedVersion)) return UpdateInfo.none;

      // Check if user already dismissed this version.
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

  /// Marks [version] as dismissed so the notification won't show again.
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
