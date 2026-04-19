import 'stream_provider.dart';
import '../../../services/api_service.dart';

class DesiDubProvider extends StreamProvider {
  final ApiService apiService;

  DesiDubProvider(this.apiService);

  @override
  String get name => 'DesiDub';

  @override
  Future<StreamData> fetchSources(String animeId, int episode) async {
    try {
      final response = await apiService.getDesiDubSources(animeId, episode);
      // Backend returns: {"provider":"DesiDubAnime","status":200,"data":{"sources":[...]}}
      final data = response['data'] ?? response;
      final List<dynamic> sourcesJson = data is List ? data : (data['sources'] ?? []);
      
      List<VideoSource> sources = sourcesJson.map((s) {
        final vs = VideoSource.fromJson(s, 'DesiDub');
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
            'Referer': 'https://www.desidubanime.me/',
          },
        );
      }).toList();

      return StreamData(sources: sources, subtitles: []);
    } catch (e) {
      return StreamData(sources: [], subtitles: []);
    }
  }
}
