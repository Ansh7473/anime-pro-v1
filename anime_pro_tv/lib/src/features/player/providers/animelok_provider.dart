import 'stream_provider.dart';
import '../../../services/api_service.dart';

class AnimelokProvider extends StreamProvider {
  final ApiService apiService;

  AnimelokProvider(this.apiService);

  @override
  String get name => 'Animelok';

  @override
  Future<StreamData> fetchSources(String animeId, int episode) async {
    try {
      final response = await apiService.getAnimelokSources(animeId, episode);
      // Backend returns: {"provider":"Animelok","status":200,"data":{"sources":[...],"subtitles":[...]}}
      final data = response['data'] ?? response;
      final List<dynamic> sourcesJson = data['sources'] ?? [];
      final List<dynamic> subsJson = data['subtitles'] ?? [];

      List<VideoSource> sources = sourcesJson.map((s) {
        final vs = VideoSource.fromJson(s, 'Animelok');
        // Inject required headers for Animelok
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
            'Referer': 'https://animelok.xyz/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          },
        );
      }).toList();

      List<Subtitle> subtitles = subsJson.map((s) => Subtitle.fromJson(s)).toList();

      return StreamData(sources: sources, subtitles: subtitles);
    } catch (e) {
      return StreamData(sources: [], subtitles: []);
    }
  }
}
