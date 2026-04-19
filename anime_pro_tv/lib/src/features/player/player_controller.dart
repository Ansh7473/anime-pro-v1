import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'providers/stream_provider.dart';
import 'providers/animelok_provider.dart';
import 'providers/ahd_provider.dart';
import 'providers/nine_anime_provider.dart';
import 'providers/desidub_provider.dart';
import '../../services/api_service.dart';

class PlayerController extends ChangeNotifier {
  final ApiService apiService;
  final String animeId;
  final int episode;

  late final Player player;
  late final VideoController videoController;

  List<StreamProvider> providers = [];
  List<VideoSource> allSources = [];
  VideoSource? currentSource;
  bool isLoading = true;
  String? error;

  PlayerController({
    required this.apiService,
    required this.animeId,
    required this.episode,
  }) {
    player = Player();
    videoController = VideoController(player);
    
    providers = [
      AnimelokProvider(apiService),
      AHDProvider(apiService),
      NineAnimeProvider(apiService),
      DesiDubProvider(apiService),
    ];

    init();
  }

  Future<void> init() async {
    isLoading = true;
    notifyListeners();

    try {
      allSources = [];
      for (var provider in providers) {
        try {
          final data = await provider.fetchSources(animeId, episode);
          print('[PlayerController] ${provider.name}: ${data.sources.length} sources found');
          allSources.addAll(data.sources);
        } catch (e) {
          print('[PlayerController] ${provider.name} FAILED: $e');
        }
      }
      print('[PlayerController] Total sources: ${allSources.length}');

      if (allSources.isNotEmpty) {
        // Sort: m3u8 (native playback) first, embeds after
        allSources.sort((a, b) => (a.isM3U8 == b.isM3U8) ? 0 : (a.isM3U8 ? -1 : 1));
        // Don't auto-play — let the user choose from the source picker
      } else {
        error = "No sources found for this episode.";
      }
    } catch (e) {
      error = "Failed to load sources: $e";
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> setSource(VideoSource source) async {
    currentSource = source;
    notifyListeners();

    if (source.isM3U8) {
      // Use media_kit for direct streams
      await player.open(
        Media(
          source.url,
          httpHeaders: source.headers,
        ),
      );
    } else {
      // For embeds, the PlayerScreen will handle it via WebView
      await player.pause();
    }
    notifyListeners();
  }

  @override
  void dispose() {
    player.dispose();
    super.dispose();
  }
}
