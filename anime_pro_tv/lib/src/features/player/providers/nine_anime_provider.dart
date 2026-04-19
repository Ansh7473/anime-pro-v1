import 'stream_provider.dart';
import '../../../services/api_service.dart';

class NineAnimeProvider extends StreamProvider {
  final ApiService apiService;

  NineAnimeProvider(this.apiService);

  @override
  String get name => '9Anime';

  @override
  Future<StreamData> fetchSources(String animeId, int episode) async {
    try {
      final response = await apiService.getNineAnimeSources(animeId, episode);
      // Backend returns: {"provider":"9anime","status":200,"data":{"sources":[...]}}
      final data = response['data'] ?? response;
      final List<dynamic> sourcesJson = data['sources'] ?? [];
      
      List<VideoSource> sources = sourcesJson.map((s) {
        final vs = VideoSource.fromJson(s, '9Anime');
        return VideoSource(
          url: vs.url,
          name: vs.name,
          quality: vs.quality,
          language: vs.language,
          category: vs.category,
          isM3U8: vs.isM3U8,
          isEmbed: vs.isEmbed,
          provider: vs.provider,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          },
        );
      }).toList();

      return StreamData(sources: sources, subtitles: []);
    } catch (e) {
      return StreamData(sources: [], subtitles: []);
    }
  }
}
