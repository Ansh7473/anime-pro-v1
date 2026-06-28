import 'backend_config.dart';

class ImageUtils {
  static String getProxiedUrl(String? url) {
    if (url == null || url.isEmpty) return '';

    // If it's already proxied or a local asset, return as is.
    if (url.contains('/api/v1/streaming/proxy') || !url.startsWith('http')) {
      return url;
    }

    // Proxy everything else to ensure stability and bypass Referer checks.
    final encodedUrl = Uri.encodeComponent(url);
    return '${Backend.proxyBase}?url=$encodedUrl';
  }
}
