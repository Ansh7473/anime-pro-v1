import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/models/anime.dart';
import '../../data/models/episode.dart';
import '../../data/services/api_service.dart';
import '../network/api_client.dart';

/// Singleton Dio-backed client (with failover).
final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());

/// High-level typed API.
final apiServiceProvider =
    Provider<ApiService>((ref) => ApiService(ref.watch(apiClientProvider)));

/// Home screen content (sections + spotlight). Auto-disposed when unused.
final homeProvider = FutureProvider.autoDispose<HomeData>((ref) {
  ref.keepAlive(); // cache across quick nav in/out of Home
  return ref.watch(apiServiceProvider).getHome();
});

/// Full details for a single anime.
final animeDetailsProvider =
    FutureProvider.autoDispose.family<Anime?, String>((ref, id) {
  return ref.watch(apiServiceProvider).getAnime(id);
});

/// Episode list for an anime.
final episodesProvider =
    FutureProvider.autoDispose.family<List<Episode>, String>((ref, id) {
  return ref.watch(apiServiceProvider).getEpisodes(id);
});

/// Recommendations for an anime.
final recommendationsProvider =
    FutureProvider.autoDispose.family<List<Anime>, String>((ref, id) {
  return ref.watch(apiServiceProvider).recommendations(id);
});

/// Tracks the currently focused anime on the Home screen for dynamic backdrops.
final focusedAnimeProvider = StateProvider<Anime?>((ref) => null);

/// Tracks the active anime in the rotating Hero Banner.
final activeHeroAnimeProvider = StateProvider<Anime?>((ref) => null);

