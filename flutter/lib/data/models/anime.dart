/// Core media model. Parsing is intentionally tolerant: the backend returns
/// AniList-shaped objects in some endpoints and already-flattened objects in
/// others, so [Anime.fromJson] accepts both.
class Anime {
  const Anime({
    required this.id,
    this.malId,
    required this.title,
    this.poster,
    this.banner,
    this.description,
    this.format,
    this.status,
    this.episodes,
    this.score,
    this.year,
    this.season,
    this.genres = const [],
    this.studios = const [],
    this.popularity,
    this.nextAiringEpisode,
    this.nextAiringAt,
  });

  final int id;
  final int? malId;
  final String title;
  final String? poster;
  final String? banner;
  final String? description;
  final String? format;
  final String? status;
  final int? episodes;
  final double? score; // normalised 0–10
  final int? year;
  final String? season;
  final List<String> genres;
  final List<String> studios;
  final int? popularity;
  final int? nextAiringEpisode;
  final DateTime? nextAiringAt;

  bool get isReleasing => status?.toUpperCase() == 'RELEASING';

  static String _resolveTitle(dynamic raw) {
    if (raw is String && raw.isNotEmpty) return raw;
    if (raw is Map) {
      return (raw['english'] ??
              raw['userPreferred'] ??
              raw['romaji'] ??
              raw['native'] ??
              'Unknown')
          .toString();
    }
    return 'Unknown';
  }
  static double? _normalizeScore(dynamic v) {
    if (v == null) return null;
    final d = (v is num) ? v.toDouble() : double.tryParse(v.toString());
    if (d == null) return null;
    return d > 10 ? d / 10 : d; // AniList uses 0–100, we want 0–10
  }

  static String? _cover(Map<String, dynamic> j) {
    final ci = j['coverImage'];
    if (ci is Map) {
      return (ci['extraLarge'] ?? ci['large'] ?? ci['medium'])?.toString();
    }
    return (j['poster'] ?? j['image'] ?? j['animePoster'])?.toString();
  }

  /// Genres may be plain strings (AniList) or objects like
  /// `{mal_id, name, type, url}` (Jikan). Extract the human-readable name.
  static List<String> _genreList(dynamic v) {
    if (v is List) {
      return v
          .map((e) {
            if (e is Map) return (e['name'] ?? e['genre'] ?? '').toString();
            return e.toString();
          })
          .where((s) => s.isNotEmpty)
          .toList();
    }
    return const [];
  }

  static List<String> _studios(dynamic v) {
    if (v is Map && v['nodes'] is List) {
      return (v['nodes'] as List)
          .map((n) => (n is Map ? n['name'] : n).toString())
          .toList();
    }
    if (v is List) return v.map((e) => e.toString()).toList();
    return const [];
  }

  factory Anime.fromJson(Map<String, dynamic> j) {
    int? toInt(dynamic v) =>
        v == null ? null : (v is int ? v : int.tryParse(v.toString()));

    final next = j['nextAiringEpisode'];
    DateTime? airingAt;
    int? nextEp;
    if (next is Map) {
      nextEp = toInt(next['episode']);
      final ts = toInt(next['airingAt']);
      if (ts != null) {
        airingAt = DateTime.fromMillisecondsSinceEpoch(ts * 1000);
      }
    }

    return Anime(
      id: toInt(j['id']) ??
          toInt(j['idMal']) ??
          toInt(j['mal_id']) ??
          toInt(j['animeId']) ??
          0,
      malId: toInt(j['idMal']) ?? toInt(j['mal_id']),
      title: _resolveTitle(j['title'] ?? j['name'] ?? j['animeTitle']),
      poster: _cover(j),
      banner: (j['bannerImage'] ?? j['banner'])?.toString(),
      description: (j['description'] ?? j['synopsis'])
          ?.toString()
          .replaceAll(RegExp(r'<[^>]*>'), ''),
      format: j['format']?.toString(),
      status: j['status']?.toString(),
      episodes: toInt(j['episodes']),
      score: _normalizeScore(j['averageScore'] ?? j['score'] ?? j['rating']),
      year: toInt(j['seasonYear'] ?? j['year']),
      season: j['season']?.toString(),
      genres: _genreList(j['genres']),
      studios: _studios(j['studios']),
      popularity: toInt(j['popularity']),
      nextAiringEpisode: nextEp,
      nextAiringAt: airingAt,
    );
  }

  /// Parses a list that may be raw or wrapped in `{ data: [...] }` /
  /// `{ results: [...] }`.
  static List<Anime> listFrom(dynamic data) {
    dynamic list = data;
    if (data is Map) {
      list = data['results'] ?? data['data'] ?? data['media'] ?? data;
    }
    if (list is List) {
      return list
          .whereType<Map>()
          .map((e) => Anime.fromJson(e.cast<String, dynamic>()))
          .where((a) => a.id != 0)
          .toList();
    }
    return const [];
  }
}
