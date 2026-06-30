/// Central backend configuration.
///
/// The backend runs on two Vercel free-tier accounts. Requests round-robin
/// across them to spread load; [ApiClient] adds automatic failover via a Dio
/// interceptor. This mirrors the website's `api.ts` pooling behaviour.
class BackendConfig {
  BackendConfig._();

  /// Backend hosts (two separate Vercel deployments).
  static const List<String> hosts = [
    'https://anime-pro-backend.vercel.app',
    'https://anime-pro-backend-smoky.vercel.app',
  ];

  static const String apiPath = '/api/v1';

  static int _cursor = 0;

  /// Hosts ordered starting at the next round-robin position. The first entry
  /// is the primary for this call; the rest are failover targets.
  static List<String> ordered() {
    final start = _cursor++ % hosts.length;
    return List<String>.generate(
      hosts.length,
      (i) => hosts[(start + i) % hosts.length],
    );
  }

  /// A single round-robin host (no failover) — for one-off proxy/image URLs.
  static String get host => ordered().first;

  /// Image proxy endpoint (handles CORS / self-healing for external posters).
  static String proxyImage(String url) {
    if (url.isEmpty) return url;
    if (url.startsWith('http')) {
      return '$host$apiPath/streaming/proxy?url=${Uri.encodeComponent(url)}';
    }
    return url;
  }
}
