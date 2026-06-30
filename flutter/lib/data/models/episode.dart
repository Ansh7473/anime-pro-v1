/// A single episode's metadata.
class Episode {
  const Episode({
    required this.number,
    this.title,
    this.thumbnail,
    this.description,
    this.airDate,
    this.filler = false,
  });

  final int number;
  final String? title;
  final String? thumbnail;
  final String? description;
  final String? airDate;
  final bool filler;

  factory Episode.fromJson(Map<String, dynamic> j) {
    int? toInt(dynamic v) =>
        v == null ? null : (v is int ? v : int.tryParse(v.toString()));
    return Episode(
      number: toInt(j['number'] ?? j['episode'] ?? j['mal_id'] ?? j['id']) ?? 0,
      title: (j['title'] ?? j['name'])?.toString(),
      thumbnail: (j['thumbnail'] ?? j['image'] ?? j['img'])?.toString(),
      description: (j['description'] ?? j['synopsis'] ?? j['overview'])
          ?.toString(),
      airDate: (j['airDate'] ?? j['aired'])?.toString(),
      filler: j['filler'] == true,
    );
  }

  static List<Episode> listFrom(dynamic data) {
    dynamic list = data;
    if (data is Map) {
      list = data['episodes'] ?? data['data'] ?? data['results'] ?? data;
    }
    if (list is List) {
      return list
          .whereType<Map>()
          .map((e) => Episode.fromJson(e.cast<String, dynamic>()))
          .toList();
    }
    return const [];
  }
}
