/// A subtitle track attached to a stream source.
class SubtitleTrack {
  const SubtitleTrack({required this.url, required this.lang});

  final String url;
  final String lang;

  factory SubtitleTrack.fromJson(Map<String, dynamic> j) => SubtitleTrack(
        url: (j['url'] ?? j['file'] ?? '').toString(),
        lang: (j['lang'] ?? j['label'] ?? j['language'] ?? 'Sub').toString(),
      );
}

/// Whether a stream is an HLS/MP4 file we can play natively, or an embeddable
/// page that must be rendered in a WebView.
enum SourceKind { file, embed }

/// A playable stream resolved from one provider for one episode.
class StreamSource {
  const StreamSource({
    required this.url,
    required this.provider,
    this.kind = SourceKind.file,
    this.quality = 'auto',
    this.language = 'sub',
    this.name,
    this.category,
    this.referer,
    this.headers = const {},
    this.subtitles = const [],
    this.isM3u8 = true,
  });

  final String url;
  final String provider;
  final SourceKind kind;
  final String quality;
  final String language; // sub | dub | multi
  final String? name; // server/source display name (e.g. "bato Soft Sub")
  final String? category; // raw category if the backend provides one
  final String? referer;
  final Map<String, String> headers;
  final List<SubtitleTrack> subtitles;
  final bool isM3u8;

  bool get isEmbed => kind == SourceKind.embed;

  factory StreamSource.fromJson(Map<String, dynamic> j, {String? provider}) {
    final url = (j['url'] ?? j['file'] ?? j['link'] ?? j['src'] ?? '')
        .toString();
    final type = (j['type'] ?? '').toString().toLowerCase();
    final lowerUrl = url.toLowerCase();
    // Match the website: a source is a native HLS file ONLY when its URL is an
    // .m3u8 (or /m3u8) manifest. Everything else is an embeddable iframe page.
    final isHls = lowerUrl.contains('.m3u8') || lowerUrl.contains('/m3u8');
    final isEmbed = !isHls ||
        type.contains('embed') ||
        type.contains('iframe') ||
        lowerUrl.contains('embed') ||
        j['isEmbed'] == true ||
        j['embed'] == true;

    final rawHeaders = j['headers'];
    final headers = <String, String>{};
    if (rawHeaders is Map) {
      rawHeaders.forEach((k, v) => headers[k.toString()] = v.toString());
    }
    final referer = (j['referer'] ?? headers['Referer'] ?? headers['referer'])
        ?.toString();

    final subs = <SubtitleTrack>[];
    final rawSubs = j['subtitles'] ?? j['tracks'] ?? j['subs'];
    if (rawSubs is List) {
      for (final s in rawSubs.whereType<Map>()) {
        final t = SubtitleTrack.fromJson(s.cast<String, dynamic>());
        if (t.url.isNotEmpty) subs.add(t);
      }
    }

    return StreamSource(
      url: url,
      provider: (j['provider'] ?? provider ?? 'source').toString(),
      kind: isEmbed ? SourceKind.embed : SourceKind.file,
      quality: (j['quality'] ?? j['resolution'] ?? 'auto').toString(),
      language: (j['lang'] ?? j['language'] ?? j['category'] ?? 'sub')
          .toString()
          .toLowerCase(),
      name: (j['name'] ?? j['server'] ?? j['title'] ?? j['label'])?.toString(),
      category: (j['category'] ?? j['cat'])?.toString(),
      referer: referer,
      headers: headers,
      subtitles: subs,
      isM3u8: isHls,
    );
  }

  /// Extracts a flat list of sources from a provider response, which may wrap
  /// them under `sources`, `data`, or be a bare list.
  static List<StreamSource> listFrom(dynamic data, {String? provider}) {
    dynamic list = data;
    if (data is Map) {
      list = data['sources'] ?? data['data'] ?? data['streams'] ?? data;
    }
    if (list is List) {
      return list
          .whereType<Map>()
          .map((e) =>
              StreamSource.fromJson(e.cast<String, dynamic>(), provider: provider))
          .where((s) => s.url.isNotEmpty)
          .toList();
    }
    return const [];
  }
}
