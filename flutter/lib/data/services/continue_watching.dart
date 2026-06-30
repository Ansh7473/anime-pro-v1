import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/anime.dart';

/// Provides the app-wide [SharedPreferences] instance. Overridden in `main()`
/// after it has been initialised so the rest of the app can read it
/// synchronously.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('SharedPreferences not initialised'),
);

/// A single "continue watching" entry: enough to render a resumable card and
/// jump straight back into the player.
class WatchProgress {
  const WatchProgress({
    required this.animeId,
    required this.title,
    this.poster,
    required this.episode,
    required this.updatedAt,
  });

  final int animeId;
  final String title;
  final String? poster;
  final int episode;
  final DateTime updatedAt;

  Anime toAnime() => Anime(id: animeId, title: title, poster: poster);

  Map<String, dynamic> toJson() => {
        'animeId': animeId,
        'title': title,
        'poster': poster,
        'episode': episode,
        'updatedAt': updatedAt.millisecondsSinceEpoch,
      };

  factory WatchProgress.fromJson(Map<String, dynamic> j) => WatchProgress(
        animeId: (j['animeId'] as num).toInt(),
        title: (j['title'] ?? '').toString(),
        poster: j['poster']?.toString(),
        episode: (j['episode'] as num?)?.toInt() ?? 1,
        updatedAt: DateTime.fromMillisecondsSinceEpoch(
            (j['updatedAt'] as num?)?.toInt() ?? 0),
      );
}

/// Persisted, most-recent-first list of episodes the user has started. Capped so
/// it stays small and fast.
class ContinueWatchingNotifier extends Notifier<List<WatchProgress>> {
  static const _key = 'continue_watching_v1';
  static const _max = 20;

  @override
  List<WatchProgress> build() {
    final prefs = ref.watch(sharedPreferencesProvider);
    final raw = prefs.getString(_key);
    if (raw == null || raw.isEmpty) return const [];
    try {
      final list = (jsonDecode(raw) as List)
          .whereType<Map>()
          .map((e) => WatchProgress.fromJson(e.cast<String, dynamic>()))
          .toList();
      list.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      return list;
    } catch (_) {
      return const [];
    }
  }

  /// Records (or moves to front) the given anime/episode and persists.
  void record(Anime anime, int episode) {
    if (anime.id == 0) return;
    final entry = WatchProgress(
      animeId: anime.id,
      title: anime.title,
      poster: anime.poster ?? anime.banner,
      episode: episode,
      updatedAt: DateTime.now(),
    );
    final next = [
      entry,
      ...state.where((p) => p.animeId != anime.id),
    ].take(_max).toList();
    state = next;
    _persist();
  }

  void remove(int animeId) {
    state = state.where((p) => p.animeId != animeId).toList();
    _persist();
  }

  void _persist() {
    final prefs = ref.read(sharedPreferencesProvider);
    prefs.setString(
        _key, jsonEncode(state.map((p) => p.toJson()).toList()));
  }
}

final continueWatchingProvider =
    NotifierProvider<ContinueWatchingNotifier, List<WatchProgress>>(
  ContinueWatchingNotifier.new,
);
