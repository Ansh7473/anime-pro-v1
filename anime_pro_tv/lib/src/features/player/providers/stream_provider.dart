import 'package:dio/dio.dart';

class VideoSource {
  final String url;
  final String name;
  final String? quality;
  final String? language;
  final String category; // sub, dub, multi, hindi
  final bool isM3U8;
  final bool isEmbed;
  final String provider;
  final Map<String, String>? headers;

  VideoSource({
    required this.url,
    required this.name,
    this.quality,
    this.language,
    required this.category,
    required this.isM3U8,
    required this.isEmbed,
    required this.provider,
    this.headers,
  });

  factory VideoSource.fromJson(Map<String, dynamic> json, String provider) {
    return VideoSource(
      url: json['url'] ?? '',
      name: json['name'] ?? json['server'] ?? 'Unknown',
      quality: json['quality']?.toString() ?? 'Auto',
      language: json['language']?.toString() ?? 'Unknown',
      category: json['category'] ?? 'sub',
      isM3U8: json['isM3U8'] ?? (json['url']?.toString().contains('.m3u8') ?? false),
      isEmbed: json['isEmbed'] ?? !(json['url']?.toString().contains('.m3u8') ?? false),
      provider: provider,
      headers: json['headers'] != null ? Map<String, String>.from(json['headers']) : null,
    );
  }
}

class Subtitle {
  final String url;
  final String language;

  Subtitle({required this.url, required this.language});

  factory Subtitle.fromJson(Map<String, dynamic> json) {
    return Subtitle(
      url: json['url'] ?? '',
      language: json['name'] ?? json['language'] ?? 'Unknown',
    );
  }
}

class StreamData {
  final List<VideoSource> sources;
  final List<Subtitle> subtitles;

  StreamData({required this.sources, required this.subtitles});
}

abstract class StreamProvider {
  final Dio dio = Dio();
  String get name;

  Future<StreamData> fetchSources(String animeId, int episode);

  // Helper to resolve shortened URLs or redirects
  Future<String> resolveUrl(String url, {Map<String, String>? headers}) async {
    try {
      final response = await dio.get(
        url,
        options: Options(
          followRedirects: false,
          validateStatus: (status) => status != null && status < 400,
          headers: headers,
        ),
      );
      
      if (response.statusCode == 301 || response.statusCode == 302) {
        final location = response.headers.value('location');
        if (location != null) {
          if (location.startsWith('/')) {
            final uri = Uri.parse(url);
            return '${uri.scheme}://${uri.host}$location';
          }
          return location;
        }
      }
      return url;
    } catch (e) {
      return url;
    }
  }
}
