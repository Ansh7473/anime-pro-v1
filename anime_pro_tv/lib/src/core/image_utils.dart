class ImageUtils {
  static const String _proxyBase = 'https://anime-pro-v1-backend-go.vercel.app/api/v1/streaming/proxy';

  static String getProxiedUrl(String? url) {
    if (url == null || url.isEmpty) return '';
    
    // If it's already proxied or a local asset, return as is
    if (url.contains(_proxyBase) || !url.startsWith('http')) {
      return url;
    }

    // Proxy everything else to ensure stability and bypass Referer checks
    final encodedUrl = Uri.encodeComponent(url);
    return '$_proxyBase?url=$encodedUrl';
  }
}
