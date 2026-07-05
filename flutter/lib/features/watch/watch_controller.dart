import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/providers.dart';
import '../../data/models/stream_source.dart';
import '../../data/services/api_service.dart';

typedef WatchKey = ({String animeId, int episode});

final watchSourcesProvider = StreamProvider.autoDispose
    .family<List<StreamSource>, WatchKey>((ref, key) {
      final api = ref.watch(apiServiceProvider);
      final controller = StreamController<List<StreamSource>>();
      final seen = <String>{};
      final currentSources = <StreamSource>[];

      Future<void> fetchAll() async {
        final futures = kStreamProviders.map((p) async {
          try {
            final res = await api.getProviderSources(
              p,
              key.animeId,
              key.episode,
            );
            if (res.isNotEmpty) {
              bool updated = false;
              for (final s in res) {
                if (seen.add(s.url)) {
                  currentSources.add(s);
                  updated = true;
                }
              }
              if (updated && !controller.isClosed) {
                // Sort by native file first, then embeds
                currentSources.sort((a, b) {
                  if (!a.isEmbed && b.isEmbed) return -1;
                  if (a.isEmbed && !b.isEmbed) return 1;
                  return 0;
                });
                controller.add(List.of(currentSources));
              }
            }
          } catch (_) {}
        });

        await Future.wait(futures);

        if (currentSources.isEmpty) {
          try {
            final agg = await api.getAggregateSources(key.animeId, key.episode);
            for (final s in agg) {
              if (seen.add(s.url)) currentSources.add(s);
            }
            if (!controller.isClosed) {
              controller.add(List.of(currentSources));
            }
          } catch (_) {}
        }
        if (!controller.isClosed) controller.close();
      }

      fetchAll();

      ref.onDispose(controller.close);
      return controller.stream;
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
    final m = sources.where(
      (s) => s.language.contains('english') || s.language == 'dub',
    );
    if (m.isNotEmpty) return m.first;
  }
  return sources.first;
}
