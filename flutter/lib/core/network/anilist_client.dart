import 'dart:convert';

import 'package:dio/dio.dart';

/// Direct AniList GraphQL client.
///
/// Native Flutter has no CORS restriction, so we hit AniList's CDN from the
/// device (per-user IP quota, fast). Responses are memoized for [cacheTtl].
class AniListClient {
  AniListClient({Dio? dio})
      : _dio = dio ??
            Dio(
              BaseOptions(
                baseUrl: 'https://graphql.anilist.co',
                connectTimeout: const Duration(seconds: 12),
                receiveTimeout: const Duration(seconds: 15),
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
              ),
            );

  final Dio _dio;
  final Map<String, ({dynamic data, DateTime ts})> _cache = {};
  static const Duration cacheTtl = Duration(minutes: 30);

  Future<Map<String, dynamic>?> query(
    String query, {
    Map<String, dynamic> variables = const {},
  }) async {
    final key = jsonEncode({'q': query.replaceAll(RegExp(r'\s+'), ' ').trim(), 'v': variables});
    final hit = _cache[key];
    if (hit != null && DateTime.now().difference(hit.ts) < cacheTtl) {
      return hit.data is Map ? (hit.data as Map).cast<String, dynamic>() : null;
    }

    final res = await _dio.post(
      '',
      data: {'query': query, 'variables': variables},
    );
    final body = res.data;
    if (body is! Map) return null;
    // AniList returns errors + null data when a Media lookup 404s.
    final data = body['data'];
    if (data is Map) {
      _cache[key] = (data: data, ts: DateTime.now());
      return data.cast<String, dynamic>();
    }
    return null;
  }

  /// Resolve anime by MAL id first, then AniList id (separate queries so one
  /// 404 cannot null the other — same bug we fixed on the web).
  Future<Map<String, dynamic>?> mediaByAnyId(
    int id, {
    required String fields,
  }) async {
    Future<Map<String, dynamic>?> run(String filter) async {
      try {
        final data = await query(
          'query(\$id: Int) { Media($filter, type: ANIME) { $fields } }',
          variables: {'id': id},
        );
        final media = data?['Media'];
        if (media is Map) return media.cast<String, dynamic>();
      } catch (_) {}
      return null;
    }

    return await run('idMal: \$id') ?? await run('id: \$id');
  }
}
