import '../../core/network/api_client.dart';
import '../models/anime.dart';
import '../models/episode.dart';
import '../models/stream_source.dart';
import '../models/user.dart';

/// Names of the streaming providers the backend aggregates. Mirrors the
/// website's `api.ts` provider methods. Order = priority (first = fetched first).
const List<String> kStreamProviders = [
  'hianime', // HiAnime  (Provider 1)
  'anineko', // AniNeko  (Provider 2)
  'vidsrc', // VidSrc   (Provider 3)
  'nineanime', // 9anime   (Provider 4)
  'animelok', // Animelok (Provider 5)
  'desidub', // DesiDub  (Provider 6)
  'ahd', // AHD      (Provider 7)
  'toonstream', // Toonstream (Provider 8)
  'watchanimeworld', // WatchAnimeWorld (Provider 9)
  'aniwaves', // Aniwaves (Provider 10)
  'animen', // Animen   (Provider 11)
  'animixstream', // AnimixStream (Provider 12)
  'animepahe', // AnimePahe (Provider 13)
];

/// Grouped home-screen content.
class HomeData {
  const HomeData({required this.sections, this.spotlight = const []});

  /// Ordered map of section title -> anime list.
  final Map<String, List<Anime>> sections;

  /// Featured items for the hero banner.
  final List<Anime> spotlight;
}

/// High-level API surface. Each method unwraps the backend's `{ data: ... }`
/// envelope and maps to domain models.
class ApiService {
  ApiService(this._client);

  final ApiClient _client;

  static dynamic _unwrap(dynamic data) {
    if (data is Map && data.containsKey('data')) return data['data'];
    return data;
  }

  // ---------------------------------------------------------------------------
  // Discovery (AniList)
  // ---------------------------------------------------------------------------

  Future<HomeData> getHome() async {
    final res = await _client.get('/anilist/home');
    final data = _unwrap(res.data);
    final sections = <String, List<Anime>>{};
    final spotlight = <Anime>[];

    if (data is Map) {
      // Friendly labels for common backend keys; unknown keys fall back to a
      // title-cased version of the key.
      const labels = {
        'trending': 'Trending Now',
        'popular': 'Popular',
        'topRated': 'Top Rated',
        'top_rated': 'Top Rated',
        'seasonal': 'This Season',
        'upcoming': 'Upcoming',
        'recentEpisodes': 'Recently Released',
        'recent': 'Recently Released',
        'movies': 'Movies',
      };
      data.forEach((key, value) {
        final list = Anime.listFrom(value);
        if (list.isEmpty) return;
        if (key == 'spotlight' || key == 'banner' || key == 'featured') {
          spotlight.addAll(list);
        } else {
          final label = labels[key] ?? _titleCase(key.toString());
          sections[label] = list;
        }
      });
    }

    if (spotlight.isEmpty && sections.isNotEmpty) {
      spotlight.addAll(sections.values.first.take(8));
    }
    return HomeData(sections: sections, spotlight: spotlight);
  }

  Future<Anime?> getAnime(Object id) async {
    final res = await _client.get('/anilist/anime/$id');
    final data = _unwrap(res.data);
    if (data is Map) return Anime.fromJson(data.cast<String, dynamic>());
    return null;
  }

  Future<List<Anime>> search(
    String query, {
    int page = 1,
    int limit = 20,
    String sort = 'POPULARITY_DESC',
    String? format,
    String? genre,
    String? status,
  }) async {
    final res = await _client.get(
      '/anilist/search',
      query: {
        'q': query,
        'page': page,
        'limit': limit,
        'sort': sort,
        'format': ?format,
        'genre': ?genre,
        'status': ?status,
      },
    );
    return Anime.listFrom(_unwrap(res.data));
  }

  Future<List<Anime>> byGenre(String genre, {int page = 1}) =>
      search('', page: page, genre: genre);

  Future<List<Anime>> topAnime({
    String format = 'TV',
    int page = 1,
    String sort = 'POPULARITY_DESC',
  }) => search('', page: page, format: format, sort: sort);

  Future<List<Anime>> recommendations(Object id) async {
    final res = await _client.get('/anilist/recommendations/$id');
    return Anime.listFrom(_unwrap(res.data));
  }

  // ---------------------------------------------------------------------------
  // Episodes & streaming
  // ---------------------------------------------------------------------------

  Future<List<Episode>> getEpisodes(
    Object animeId, {
    int page = 1,
    int perPage = 50,
  }) async {
    final res = await _client.get(
      '/streaming/episode-metadata',
      query: {'animeId': animeId, 'page': page, 'perPage': perPage},
    );
    return Episode.listFrom(_unwrap(res.data));
  }

  /// Aggregate sources across all providers (fast path).
  Future<List<StreamSource>> getAggregateSources(Object animeId, int ep) async {
    final res = await _client.get(
      '/streaming/sources',
      query: {'animeId': animeId, 'ep': ep},
    );
    return StreamSource.listFrom(_unwrap(res.data));
  }

  /// Sources from a single named provider (used for parallel background loads).
  Future<List<StreamSource>> getProviderSources(
    String provider,
    Object animeId,
    int ep,
  ) async {
    final res = await _client.get(
      '/streaming/sources/$provider',
      query: {'animeId': animeId, 'ep': ep},
    );
    return StreamSource.listFrom(_unwrap(res.data), provider: provider);
  }

  // ---------------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------------

  Future<AuthResult> login(String email, String password) async {
    final res = await _client.post(
      '/auth/login',
      data: {'email': email, 'password': password},
    );
    return _authResult(res.data, res.statusCode);
  }

  Future<AuthResult> register(
    String email,
    String password,
    String name,
  ) async {
    final res = await _client.post(
      '/auth/register',
      data: {'email': email, 'password': password, 'name': name},
    );
    return _authResult(res.data, res.statusCode);
  }

  AuthResult _authResult(dynamic data, int? status) {
    final body = data is Map ? data : const {};
    final token = (body['token'] ?? body['accessToken'])?.toString();
    final userJson = body['user'] ?? body['data'];
    if ((status != null && status >= 400) || token == null) {
      throw ApiException(
        (body['error'] ?? body['message'] ?? 'Authentication failed')
            .toString(),
      );
    }
    return AuthResult(
      user: User.fromJson((userJson as Map).cast<String, dynamic>()),
      token: token,
    );
  }

  Future<User?> getCurrentUser(String token) async {
    final res = await _client.get('/user/me', token: token);
    final data = _unwrap(res.data);
    if (data is Map) return User.fromJson(data.cast<String, dynamic>());
    return null;
  }

  // ---------------------------------------------------------------------------
  // Library: watchlist / favorites / history
  // ---------------------------------------------------------------------------

  Future<List<Anime>> getWatchlist(String token) async {
    final res = await _client.get('/user/watchlist', token: token);
    return Anime.listFrom(_unwrap(res.data));
  }

  Future<void> addToWatchlist(String token, Map<String, dynamic> data) =>
      _client.post('/user/watchlist', data: data, token: token);

  Future<void> removeFromWatchlist(
    String token,
    Object animeId, {
    Object? profileId,
  }) => _client.delete(
    '/user/watchlist/$animeId',
    query: profileId != null ? {'profileId': profileId} : null,
    token: token,
  );

  /// Whether [animeId] is in the user's watchlist (backend returns
  /// `{inWatchlist, status}`).
  Future<bool> getWatchlistStatus(
    String token,
    Object animeId, {
    Object? profileId,
  }) async {
    final res = await _client.get(
      '/user/watchlist/$animeId',
      query: profileId != null ? {'profileId': profileId} : null,
      token: token,
    );
    final data = _unwrap(res.data);
    if (data is Map) {
      if (data['inWatchlist'] is bool) return data['inWatchlist'] as bool;
      final status = data['status'];
      return status != null && status.toString().isNotEmpty;
    }
    return false;
  }

  Future<List<Anime>> getFavorites(String token, {int? profileId}) async {
    final res = await _client.get(
      '/user/favorites',
      query: profileId != null ? {'profileId': profileId} : null,
      token: token,
    );
    return Anime.listFrom(_unwrap(res.data));
  }

  Future<void> addToFavorites(String token, Map<String, dynamic> data) =>
      _client.post('/user/favorites', data: data, token: token);

  Future<void> removeFromFavorites(
    String token,
    Object animeId, {
    Object? profileId,
  }) => _client.delete(
    '/user/favorites/$animeId',
    query: profileId != null ? {'profileId': profileId} : null,
    token: token,
  );

  /// Whether [animeId] is favorited (backend returns `{isFavorite}`).
  Future<bool> getFavoriteStatus(
    String token,
    Object animeId, {
    Object? profileId,
  }) async {
    final res = await _client.get(
      '/user/favorites/$animeId',
      query: profileId != null ? {'profileId': profileId} : null,
      token: token,
    );
    final data = _unwrap(res.data);
    if (data is Map) return data['isFavorite'] == true;
    return false;
  }

  Future<List<dynamic>> getHistory(String token, {int? profileId}) async {
    final res = await _client.get(
      '/user/history',
      query: profileId != null ? {'profileId': profileId} : null,
      token: token,
    );
    final data = _unwrap(res.data);
    return data is List ? data : const [];
  }

  Future<void> updateHistory(String token, Map<String, dynamic> data) =>
      _client.post('/user/history', data: data, token: token);

  static String _titleCase(String s) {
    final spaced = s
        .replaceAllMapped(RegExp(r'([a-z])([A-Z])'), (m) => '${m[1]} ${m[2]}')
        .replaceAll(RegExp(r'[_-]'), ' ');
    return spaced
        .split(' ')
        .where((w) => w.isNotEmpty)
        .map((w) => w[0].toUpperCase() + w.substring(1))
        .join(' ');
  }
}

/// Thrown for actionable API errors (e.g. bad credentials).
class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}
