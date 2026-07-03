/// Central backend configuration for the TV app.
///
/// The backend runs on two Vercel free-tier accounts. Calls round-robin across
/// them to spread usage; [ApiService] adds automatic failover via Dio
/// interceptors. One-off proxy/image URLs use a rotating host.
class Backend {
  Backend._();

  /// Backend hosts (two separate Vercel accounts).
  static const List<String> hosts = [
    'https://api.watchanimez.me',
    'https://api.watchanimez.me',
  ];

  static int _cursor = 0;

  /// Hosts ordered starting at the next round-robin position.
  /// The first entry is the primary for this call; the rest are failover targets.
  static List<String> ordered() {
    final start = _cursor++ % hosts.length;
    return List<String>.generate(
      hosts.length,
      (i) => hosts[(start + i) % hosts.length],
    );
  }

  /// A single round-robin host (no failover) — for one-off proxy URLs.
  static String get host => ordered().first;

  /// API base (`/api/v1`) on a round-robin host.
  static String get apiBase => '$host/api/v1';

  /// Streaming proxy base on a round-robin host.
  static String get proxyBase => '$host/api/v1/streaming/proxy';
}
