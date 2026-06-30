import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/providers.dart';
import '../../data/models/anime.dart';
import '../auth/auth_controller.dart';

/// The signed-in user's watchlist (empty when logged out).
final watchlistProvider = FutureProvider.autoDispose<List<Anime>>((ref) {
  final token = ref.watch(authProvider).token;
  if (token == null) return Future.value(const []);
  return ref.watch(apiServiceProvider).getWatchlist(token);
});

/// The signed-in user's favorites for the active profile.
final favoritesProvider = FutureProvider.autoDispose<List<Anime>>((ref) {
  final auth = ref.watch(authProvider);
  if (auth.token == null) return Future.value(const []);
  final profileId = int.tryParse(auth.profile?.id ?? '');
  return ref
      .watch(apiServiceProvider)
      .getFavorites(auth.token!, profileId: profileId);
});

/// Whether a given anime id is in the watchlist (per active profile).
final watchlistStatusProvider =
    FutureProvider.autoDispose.family<bool, String>((ref, animeId) {
  final auth = ref.watch(authProvider);
  if (auth.token == null) return Future.value(false);
  return ref
      .watch(apiServiceProvider)
      .getWatchlistStatus(auth.token!, animeId, profileId: auth.profile?.id);
});

/// Whether a given anime id is favorited (per active profile).
final favoriteStatusProvider =
    FutureProvider.autoDispose.family<bool, String>((ref, animeId) {
  final auth = ref.watch(authProvider);
  if (auth.token == null) return Future.value(false);
  return ref
      .watch(apiServiceProvider)
      .getFavoriteStatus(auth.token!, animeId, profileId: auth.profile?.id);
});

/// Real add/remove actions against the backend, mirroring the website's
/// payloads. Each returns the new boolean state; throws if not signed in.
class LibraryActions {
  LibraryActions._();

  static bool isSignedIn(WidgetRef ref) => ref.read(authProvider).token != null;

  static Future<bool> toggleWatchlist(
      WidgetRef ref, Anime anime, bool currentlyIn) async {
    final auth = ref.read(authProvider);
    final token = auth.token;
    if (token == null) throw StateError('not signed in');
    final api = ref.read(apiServiceProvider);
    final pid = auth.profile?.id;

    if (currentlyIn) {
      await api.removeFromWatchlist(token, anime.id, profileId: pid);
    } else {
      await api.addToWatchlist(token, {
        'animeId': anime.id.toString(),
        'animeTitle': anime.title,
        'animePoster': anime.poster ?? anime.banner,
        'profileId': ?pid,
        'status': 'PLANNING',
      });
    }
    ref.invalidate(watchlistStatusProvider(anime.id.toString()));
    ref.invalidate(watchlistProvider);
    return !currentlyIn;
  }

  static Future<bool> toggleFavorite(
      WidgetRef ref, Anime anime, bool currentlyFav) async {
    final auth = ref.read(authProvider);
    final token = auth.token;
    if (token == null) throw StateError('not signed in');
    final api = ref.read(apiServiceProvider);
    final pid = auth.profile?.id;

    if (currentlyFav) {
      await api.removeFromFavorites(token, anime.id, profileId: pid);
    } else {
      await api.addToFavorites(token, {
        'animeId': anime.id.toString(),
        'animeTitle': anime.title,
        'animePoster': anime.poster ?? anime.banner,
        'profileId': ?pid,
      });
    }
    ref.invalidate(favoriteStatusProvider(anime.id.toString()));
    ref.invalidate(favoritesProvider);
    return !currentlyFav;
  }
}
