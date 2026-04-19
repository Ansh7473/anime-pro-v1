import 'package:dio/dio.dart';

class ApiService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://anime-pro-v1-backend-go.vercel.app/api/v1',
    connectTimeout: const Duration(seconds: 30),
    receiveTimeout: const Duration(seconds: 30),
  ));

  Future<dynamic> getHome() async {
    final response = await _dio.get('/anilist/home');
    return response.data['data'] ?? response.data;
  }

  Future<dynamic> getAnimeDetails(String id) async {
    final response = await _dio.get('/anilist/anime/$id');
    return response.data['data'] ?? response.data;
  }

  Future<dynamic> getEpisodes(String animeId) async {
    final response = await _dio.get('/streaming/episode-metadata?animeId=$animeId');
    final data = response.data['data'] ?? response.data;
    if (data is Map && data.containsKey('episodes')) {
      return data['episodes'];
    }
    return data;
  }

  Future<dynamic> getSources(String animeId, int ep) async {
    final response = await _dio.get('/streaming/sources?animeId=$animeId&ep=$ep');
    return response.data;
  }

  Future<dynamic> getNineAnimeSources(String animeId, int ep) async {
    final response = await _dio.get('/streaming/sources/nineanime?animeId=$animeId&ep=$ep');
    return response.data;
  }

  Future<dynamic> getAnimelokSources(String animeId, int ep) async {
    final response = await _dio.get('/streaming/sources/animelok?animeId=$animeId&ep=$ep');
    return response.data;
  }

  Future<dynamic> getDesiDubSources(String animeId, int ep) async {
    final response = await _dio.get('/streaming/sources/desidub?animeId=$animeId&ep=$ep');
    return response.data;
  }

  Future<dynamic> getAHDSources(String animeId, int ep) async {
    final response = await _dio.get('/streaming/sources/ahd?animeId=$animeId&ep=$ep');
    return response.data;
  }

  Future<dynamic> getToonstreamSources(String animeId, int ep) async {
    final response = await _dio.get('/streaming/sources/toonstream?animeId=$animeId&ep=$ep');
    return response.data;
  }

  Future<dynamic> search(String query, {int page = 1, String? format, String? genre}) async {
    final Map<String, dynamic> params = {'q': query, 'page': page};
    if (format != null) params['format'] = format;
    if (genre != null) params['genre'] = genre;
    
    final response = await _dio.get('/anilist/search', queryParameters: params);
    final data = response.data['data'] ?? response.data;
    if (data is Map && data.containsKey('results')) {
      return data['results'];
    }
    return data;
  }

  Future<dynamic> getMovies({int page = 1}) async {
    // Calling search with format=MOVIE to get the movies list
    return search('', page: page, format: 'MOVIE');
  }

  Future<dynamic> getFavorites(String token, {int? profileId}) async {
    final response = await _dio.get('/user/favorites', 
      queryParameters: profileId != null ? {'profileId': profileId} : null,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return response.data;
  }

  Future<bool> getFavoriteStatus(String token, String animeId, {int? profileId}) async {
    try {
      final response = await _dio.get('/user/favorites/$animeId/status', 
        queryParameters: profileId != null ? {'profileId': profileId} : null,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data['isFavorite'] ?? false;
    } catch (_) {
      return false;
    }
  }

  Future<void> toggleFavorite(String token, Map<String, dynamic> data, bool isFavorite) async {
    if (isFavorite) {
      await _dio.delete('/user/favorites/${data['animeId']}',
        queryParameters: data['profileId'] != null ? {'profileId': data['profileId']} : null,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    } else {
      await _dio.post('/user/favorites', 
        data: data,
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
    }
  }

  Future<dynamic> getWatchlist(String token) async {
    final response = await _dio.get('/user/watchlist', 
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return response.data;
  }

  Future<dynamic> getWatchlistStatus(String token, String animeId) async {
    try {
      final response = await _dio.get('/user/watchlist/$animeId/status', 
        options: Options(headers: {'Authorization': 'Bearer $token'}),
      );
      return response.data;
    } catch (_) {
      return {'inWatchlist': false};
    }
  }

  Future<void> addToWatchlist(String token, Map<String, dynamic> data) async {
    await _dio.post('/user/watchlist', 
      data: data,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }

  Future<void> removeFromWatchlist(String token, String animeId) async {
    await _dio.delete('/user/watchlist/$animeId', 
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }

  Future<dynamic> getWatchHistory(String token, {int? profileId}) async {
    final response = await _dio.get('/user/history', 
      queryParameters: profileId != null ? {'profileId': profileId} : null,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
    return response.data;
  }

  Future<void> updateWatchHistory(String token, Map<String, dynamic> data) async {
    await _dio.post('/user/history', 
      data: data,
      options: Options(headers: {'Authorization': 'Bearer $token'}),
    );
  }

  // Auth methods
  Future<dynamic> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return response.data;
  }

  Future<dynamic> register(String email, String password, String name) async {
    final response = await _dio.post('/auth/register', data: {
      'email': email,
      'password': password,
      'name': name,
    });
    return response.data;
  }
}
