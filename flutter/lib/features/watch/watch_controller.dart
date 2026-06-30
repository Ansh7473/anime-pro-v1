import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/providers.dart';
import '../../data/models/stream_source.dart';
import '../../data/services/api_service.dart';

/// Identifies a specific episode to resolve sources for.
typedef WatchKey = ({String animeId, int episode});

/// Resolves playable sources for an episode.
///
/// Strategy (mirrors the website's parallel approach): hit the aggregate
/// endpoint first for the fast path; if it yields nothing, query the individual
/// providers in parallel and use whichever returns sources first. Results are
/// sorted so native (HLS/file) sources come before embeds, and higher quality
/// first, so the UI can auto-pick the best stream.
final watchSourcesProvider = FutureProvider.autoDispose
    .family<List<StreamSource>, WatchKey>((ref, key) async {
  final api = ref.watch(apiServiceProvider);

  List<StreamSource> sources =
      await api.getAggregateSources(key.animeId, key.episode);

  // Aggregate is the fast path. Only if it returns nothing do we fan out to the
  // individual providers in parallel and merge (deduped by URL).
  if (sources.isEmpty) {
    final futures = kStreamProviders.map(
      (p) => api
          .getProviderSources(p, key.animeId, key.episode)
          .catchError((_) => <StreamSource>[]),
    );
    final results = await Future.wait(futures);
    final seen = <String>{};
    for (final s in results.expand((e) => e)) {
      if (seen.add(s.url)) sources.add(s);
    }
  }

  return sources;
});

/// Picks the default source for a preferred language, mirroring the website:
/// special-case Hindi and English/Dub, otherwise just take the first source
/// (embed or HLS — both are valid).
StreamSource? pickBestSource(List<StreamSource> sources, String preferredLang) {
  if (sources.isEmpty) return null;
  final lang = preferredLang.toLowerCase();
  if (lang == 'hindi') {
    final m = sources.where((s) => s.language.contains('hindi'));
    if (m.isNotEmpty) return m.first;
  } else if (lang == 'english' || lang == 'dub') {
    final m = sources
        .where((s) => s.language.contains('english') || s.language == 'dub');
    if (m.isNotEmpty) return m.first;
  }
  return sources.first;
}
