import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/device/device_info.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/anime.dart';
import '../../data/models/episode.dart';
import '../../shared/widgets/content_row.dart';
import '../../shared/widgets/loading.dart';
import '../../shared/widgets/network_poster.dart';
import '../library/library_providers.dart';

class DetailsScreen extends ConsumerWidget {
  const DetailsScreen({super.key, required this.id, this.preview});

  final String id;
  final Anime? preview;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final details = ref.watch(animeDetailsProvider(id));
    final episodes = ref.watch(episodesProvider(id));
    final recs = ref.watch(recommendationsProvider(id));

    final tv = DeviceInfo.isTv(context);

    // Show the passed-in preview instantly; swap to full details when ready.
    final anime = details.valueOrNull ?? preview;

    return Scaffold(
      body: anime == null
          ? (details.hasError
                ? ErrorRetry(
                    message: 'Could not load this title.',
                    onRetry: () => ref.invalidate(animeDetailsProvider(id)),
                  )
                : const CenteredLoader())
          : (tv
                ? _buildTvLayout(context, ref, anime, episodes, recs)
                : CustomScrollView(
                    slivers: [
                      SliverAppBar(
                        expandedHeight: 300,
                        pinned: true,
                        backgroundColor: AppColors.bg,
                        flexibleSpace: FlexibleSpaceBar(
                          background: _banner(context, anime),
                        ),
                      ),
                      SliverToBoxAdapter(child: _header(context, anime)),
                      SliverToBoxAdapter(
                        child: _episodes(context, anime, episodes),
                      ),
                      SliverToBoxAdapter(
                        child: recs.maybeWhen(
                          data: (list) =>
                              ContentRow(title: 'More Like This', items: list),
                          orElse: () => const SizedBox.shrink(),
                        ),
                      ),
                      const SliverToBoxAdapter(child: SizedBox(height: 24)),
                    ],
                  )),
    );
  }

  Widget _buildTvLayout(
    BuildContext context,
    WidgetRef ref,
    Anime anime,
    AsyncValue<List<Episode>> episodes,
    AsyncValue<List<Anime>> recs,
  ) {
    // ponytail: FocusTraversalGroup with WidgetOrderTraversalPolicy ensures
    // D-pad moves: Back → Play → Watchlist/Fav → Episodes → Recs.
    // Upgrade to a custom TraversalPolicy if spatial layout changes.
    return FocusTraversalGroup(
      policy: WidgetOrderTraversalPolicy(),
      child: FocusScope(
        autofocus: true,
        child: Stack(
          children: [
            // 1. Full-screen backdrop image of the anime banner
            Positioned.fill(
              child: CachedNetworkImage(
                imageUrl: anime.banner ?? anime.poster ?? "",
                fit: BoxFit.cover,
                fadeInDuration: const Duration(milliseconds: 300),
                placeholder: (_, _) => Container(color: AppColors.bg),
                errorWidget: (_, _, _) => Container(color: AppColors.bg),
              ),
            ),
            // Scrims for visual depth and high contrast/legibility
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      Colors.black.withValues(alpha: 0.95),
                      Colors.black.withValues(alpha: 0.65),
                      Colors.black.withValues(alpha: 0.2),
                    ],
                    stops: const [0.0, 0.55, 1.0],
                  ),
                ),
              ),
            ),
            Positioned.fill(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.bottomCenter,
                    end: Alignment.topCenter,
                    colors: [
                      AppColors.bg,
                      Colors.black.withValues(alpha: 0.4),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.45, 1.0],
                  ),
                ),
              ),
            ),

            // 2. Main content – single Column so all focusable items share
            //    one traversal tree (Back, Play, Library, Episodes, Recs).
            Positioned.fill(
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(48, 24, 48, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Back button – first in order, but NOT autofocused.
                      Align(
                        alignment: Alignment.centerLeft,
                        child: _TvFocusable(
                          borderRadius: 22,
                          onTap: () => context.pop(),
                          builder: (focused) => Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: focused
                                  ? Colors.white.withValues(alpha: 0.2)
                                  : Colors.black45,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: focused
                                    ? Colors.white.withValues(alpha: 0.3)
                                    : Colors.transparent,
                                width: 1.5,
                              ),
                            ),
                            child: const Icon(
                              Icons.arrow_back_rounded,
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Split pane: metadata left, episodes right
                      Expanded(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Left Pane (42% width) - fixed metadata & synopsis
                            Expanded(
                              flex: 42,
                              child: SingleChildScrollView(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const SizedBox(height: 12),
                                    Text(
                                      anime.title,
                                      style: const TextStyle(
                                        fontSize: 36,
                                        fontWeight: FontWeight.w900,
                                        height: 1.15,
                                        letterSpacing: -0.5,
                                        color: AppColors.text,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    // Clean details metadata line
                                    Wrap(
                                      spacing: 8,
                                      runSpacing: 8,
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      children: [
                                        if (anime.score != null)
                                          _chip(
                                            true,
                                            Icons.star_rounded,
                                            anime.score!.toStringAsFixed(1),
                                            color: Colors.amber,
                                          ),
                                        if (anime.format != null)
                                          _chip(true, null, anime.format!),
                                        if (anime.episodes != null)
                                          _chip(
                                            true,
                                            null,
                                            '${anime.episodes} eps',
                                          ),
                                        if (anime.year != null)
                                          _chip(true, null, '${anime.year}'),
                                        if (anime.status != null)
                                          _chip(true, null, anime.status!),
                                      ],
                                    ),
                                    const SizedBox(height: 20),
                                    // Genres
                                    if (anime.genres.isNotEmpty) ...[
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 8,
                                        children: anime.genres
                                            .map((g) => _chip(true, null, g))
                                            .toList(),
                                      ),
                                      const SizedBox(height: 20),
                                    ],
                                    // Actions (Play E1, Watchlist, Favorite)
                                    _actions(context, anime),
                                    const SizedBox(height: 28),
                                    // Synopsis / Description
                                    if (anime.description != null &&
                                        anime.description!.isNotEmpty) ...[
                                      Text(
                                        anime.description!,
                                        style: const TextStyle(
                                          color: AppColors.textMuted,
                                          fontSize: 15,
                                          height: 1.5,
                                        ),
                                      ),
                                      const SizedBox(height: 24),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 48),
                            // Right Pane (58% width) - scrollable episodes & recommendations
                            Expanded(
                              flex: 58,
                              child: SingleChildScrollView(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _episodes(context, anime, episodes),
                                    const SizedBox(height: 32),
                                    recs.maybeWhen(
                                      data: (list) => list.isEmpty
                                          ? const SizedBox.shrink()
                                          : ContentRow(
                                              title: 'More Like This',
                                              items: list,
                                            ),
                                      orElse: () => const SizedBox.shrink(),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Cinematic hero banner: artwork + top scrim (status-bar legibility) +
  /// bottom scrim into [AppColors.bg], with the title and a red genre line
  /// overlaid bottom-left — echoing the Home hero treatment.
  Widget _banner(BuildContext context, Anime a) {
    final tv = DeviceInfo.isTv(context);
    final pad = tv ? 48.0 : 16.0;
    return Stack(
      fit: StackFit.expand,
      children: [
        NetworkPoster(url: a.banner ?? a.poster, memCacheWidth: null),
        // Top scrim — keeps the back button / status bar readable.
        const DecoratedBox(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.center,
              colors: [Colors.black54, Colors.transparent],
            ),
          ),
        ),
        // Bottom scrim — fades the art into the page background.
        const DecoratedBox(
          decoration: BoxDecoration(gradient: AppColors.bottomScrim),
        ),
        Positioned(
          left: pad,
          right: pad,
          bottom: tv ? 32 : 14,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                a.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: tv ? 42 : 26,
                  fontWeight: FontWeight.w800,
                  color: AppColors.text,
                  height: 1.15,
                  letterSpacing: 0.2,
                  shadows: const [
                    Shadow(color: Colors.black87, blurRadius: 12),
                  ],
                ),
              ),
              if (a.genres.isNotEmpty) ...[
                SizedBox(height: tv ? 10 : 6),
                Text(
                  a.genres.take(4).join('  •  '),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: tv ? 18 : 13,
                    fontWeight: FontWeight.w700,
                    color: Colors.white70,
                    letterSpacing: 0.3,
                    shadows: const [
                      Shadow(color: Colors.black87, blurRadius: 8),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _header(BuildContext context, Anime a) {
    final tv = DeviceInfo.isTv(context);
    final pad = tv ? 48.0 : 16.0;
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, tv ? 24 : 16, pad, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: tv ? 150 : 110,
                  height: tv ? 220 : 160,
                  child: NetworkPoster(url: a.poster),
                ),
              ),
              SizedBox(width: tv ? 20 : 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      a.title,
                      style: TextStyle(
                        fontSize: tv ? 30 : 20,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    SizedBox(height: tv ? 14 : 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        if (a.score != null)
                          _chip(
                            tv,
                            Icons.star_rounded,
                            a.score!.toStringAsFixed(1),
                            color: Colors.amber,
                          ),
                        if (a.format != null) _chip(tv, null, a.format!),
                        if (a.episodes != null)
                          _chip(tv, null, '${a.episodes} eps'),
                        if (a.year != null) _chip(tv, null, '${a.year}'),
                        if (a.status != null) _chip(tv, null, a.status!),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          SizedBox(height: tv ? 20 : 16),
          _actions(context, a),
          if (a.genres.isNotEmpty) ...[
            SizedBox(height: tv ? 20 : 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: a.genres.map((g) => _chip(tv, null, g)).toList(),
            ),
          ],
          if (a.description != null && a.description!.isNotEmpty) ...[
            SizedBox(height: tv ? 20 : 16),
            _ExpandableSynopsis(text: a.description!),
          ],
        ],
      ),
    );
  }

  /// Primary white Play button + real Watchlist toggle + Favorite toggle.
  ///
  /// On TV every control is rendered as a [_TvFocusable] so it draws a red
  /// focus ring, scales up and is activatable with the D-pad centre/Enter.
  Widget _actions(BuildContext context, Anime a) {
    final tv = DeviceInfo.isTv(context);

    if (!tv) {
      return Row(
        children: [
          Expanded(
            child: ElevatedButton.icon(
              onPressed: () => context.push('/watch/${a.id}/1', extra: a),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('Play E1'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.text,
                foregroundColor: AppColors.bg,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          _LibraryButtons(anime: a),
        ],
      );
    }

    // TV: large, D-pad-focusable Play button (autofocused) stacked above the library controls.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _TvFocusable(
          autofocus: true,
          borderRadius: 10,
          onTap: () => context.push('/watch/${a.id}/1', extra: a),
          builder: (focused) => Container(
            padding: const EdgeInsets.symmetric(vertical: 18),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: focused ? Colors.white : AppColors.red,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.play_arrow_rounded,
                  color: focused ? AppColors.bg : Colors.white,
                  size: 26,
                ),
                const SizedBox(width: 8),
                Text(
                  'Play E1',
                  style: TextStyle(
                    color: focused ? AppColors.bg : Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),
        _LibraryButtons(anime: a),
      ],
    );
  }

  Widget _episodes(
    BuildContext context,
    Anime a,
    AsyncValue<List<Episode>> episodes,
  ) {
    final tv = DeviceInfo.isTv(context);
    // In our TV split layout, the right column is already padded by the parent Positioned.
    // So we don't need horizontal padding on TV!
    final pad = tv ? 0.0 : 16.0;
    return Padding(
      padding: EdgeInsets.fromLTRB(pad, tv ? 12 : 20, pad, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          episodes.when(
            loading: () => const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionTitle('Episodes'),
                SizedBox(height: 12),
                Padding(
                  padding: EdgeInsets.symmetric(vertical: 24),
                  child: CenteredLoader(),
                ),
              ],
            ),
            error: (_, _) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionTitle('Episodes'),
                const SizedBox(height: 12),
                Text('Episodes unavailable.', style: _mutedStyle),
              ],
            ),
            data: (list) {
              final count = list.isNotEmpty ? list.length : (a.episodes ?? 0);
              if (count == 0) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const _SectionTitle('Episodes'),
                    const SizedBox(height: 12),
                    Text('No episodes listed.', style: _mutedStyle),
                  ],
                );
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle('Episodes ($count)'),
                  SizedBox(height: tv ? 16 : 12),
                  _EpisodeGrid(animeId: a.id, anime: a, count: count, isTv: tv),
                ],
              );
            },
          ),
        ],
      ),
    );
  }

  static const _mutedStyle = TextStyle(color: AppColors.textMuted);

  Widget _chip(bool tv, IconData? icon, String label, {Color? color}) =>
      Container(
        padding: EdgeInsets.symmetric(
          horizontal: tv ? 14 : 10,
          vertical: tv ? 9 : 6,
        ),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: AppColors.cardHover, width: 1),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: tv ? 18 : 14, color: color ?? AppColors.text),
              SizedBox(width: tv ? 6 : 4),
            ],
            Text(
              label,
              style: TextStyle(
                fontSize: tv ? 16 : 12,
                fontWeight: FontWeight.w600,
                color: AppColors.text,
              ),
            ),
          ],
        ),
      );
}

/// A red-accent-bar section title, matching [ContentRow]'s heading treatment.
class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title);

  final String title;

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    return Row(
      children: [
        Container(
          width: 4,
          height: tv ? 26 : 18,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(2),
          ),
        ),
        SizedBox(width: tv ? 12 : 8),
        Text(
          title,
          style: TextStyle(
            fontSize: tv ? 25 : 17,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
            letterSpacing: 0.2,
          ),
        ),
      ],
    );
  }
}

/// TV-only focus visuals shared by the details controls: a red focus ring,
/// a slight scale-up and a soft red glow, with D-pad centre/Enter activation.
/// Mirrors the focus treatment in [AnimeCard].
class _TvFocusable extends StatefulWidget {
  const _TvFocusable({
    required this.onTap,
    required this.builder,
    this.autofocus = false,
    this.borderRadius = 8,
  });

  final VoidCallback? onTap;
  final Widget Function(bool focused) builder;
  final bool autofocus;
  final double borderRadius;

  @override
  State<_TvFocusable> createState() => _TvFocusableState();
}

class _TvFocusableState extends State<_TvFocusable> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onTap != null;
    return FocusableActionDetector(
      enabled: enabled,
      autofocus: widget.autofocus && enabled,
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const <ShortcutActivator, Intent>{
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onTap?.call();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(widget.borderRadius),
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            clipBehavior: Clip.antiAlias,
            duration: const Duration(milliseconds: 150),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(widget.borderRadius),
              border: Border.all(
                color: _focused
                    ? Colors.white.withValues(alpha: 0.8)
                    : Colors.transparent,
                width: 2.0,
              ),
              boxShadow: _focused
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.45),
                        blurRadius: 12,
                        offset: const Offset(0, 8),
                      ),
                      BoxShadow(
                        color: Colors.white.withValues(alpha: 0.15),
                        blurRadius: 18,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            child: widget.builder(_focused),
          ),
        ),
      ),
    );
  }
}

/// Episode grid with lazy cap — renders first 100 episodes eagerly,
/// then a "Show all" button to expand. Prevents memory blowup on
/// long series (1000+ eps) where shrinkWrap GridView renders all tiles.
class _EpisodeGrid extends StatefulWidget {
  const _EpisodeGrid({
    required this.animeId,
    required this.anime,
    required this.count,
    required this.isTv,
  });

  final int animeId;
  final Anime anime;
  final int count;
  final bool isTv;

  @override
  State<_EpisodeGrid> createState() => _EpisodeGridState();
}

class _EpisodeGridState extends State<_EpisodeGrid> {
  static const _cap = 100;
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final visible = _expanded ? widget.count : widget.count.clamp(0, _cap);
    final showButton = widget.count > _cap && !_expanded;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          clipBehavior: Clip.none,
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: widget.isTv ? 96 : 70,
            mainAxisSpacing: widget.isTv ? 14 : 10,
            crossAxisSpacing: widget.isTv ? 14 : 10,
            childAspectRatio: 1.4,
          ),
          itemCount: visible,
          itemBuilder: (_, i) {
            final ep = i + 1;
            void open() => context.push(
              '/watch/${widget.animeId}/$ep',
              extra: widget.anime,
            );

            final tile = Container(
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: AppColors.cardHover, width: 1),
              ),
              child: Text(
                '$ep',
                style: TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: widget.isTv ? 20 : 15,
                  color: AppColors.text,
                ),
              ),
            );

            if (widget.isTv) {
              return _TvFocusable(
                borderRadius: 10,
                onTap: open,
                builder: (focused) => Container(
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: focused ? Colors.white : AppColors.card,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: focused ? Colors.white : AppColors.cardHover,
                      width: 2,
                    ),
                    boxShadow: focused
                        ? [
                            BoxShadow(
                              color: Colors.white.withValues(alpha: 0.2),
                              blurRadius: 12,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  child: Text(
                    '$ep',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 20,
                      color: focused ? AppColors.bg : AppColors.text,
                    ),
                  ),
                ),
              );
            }
            return InkWell(
              onTap: open,
              borderRadius: BorderRadius.circular(10),
              child: tile,
            );
          },
        ),
        if (showButton)
          Padding(
            padding: EdgeInsets.only(top: widget.isTv ? 16 : 12),
            child: Center(
              child: InkWell(
                onTap: () => setState(() => _expanded = true),
                borderRadius: BorderRadius.circular(8),
                child: Container(
                  padding: EdgeInsets.symmetric(
                    horizontal: widget.isTv ? 24 : 16,
                    vertical: widget.isTv ? 12 : 8,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.cardHover),
                  ),
                  child: Text(
                    'Show all ${widget.count} episodes',
                    style: TextStyle(
                      color: AppColors.text,
                      fontSize: widget.isTv ? 16 : 13,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// Real, backend-wired Watchlist + Favorite controls for the details header.
class _LibraryButtons extends ConsumerStatefulWidget {
  const _LibraryButtons({required this.anime});

  final Anime anime;

  @override
  ConsumerState<_LibraryButtons> createState() => _LibraryButtonsState();
}

class _LibraryButtonsState extends ConsumerState<_LibraryButtons> {
  bool _busyW = false;
  bool _busyF = false;

  void _snack(String m) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(m),
          behavior: SnackBarBehavior.floating,
          backgroundColor: AppColors.card,
        ),
      );
  }

  Future<void> _toggleWatchlist(bool current) async {
    if (!LibraryActions.isSignedIn(ref)) {
      context.push('/login');
      return;
    }
    setState(() => _busyW = true);
    try {
      final added = await LibraryActions.toggleWatchlist(
        ref,
        widget.anime,
        current,
      );
      _snack(added ? 'Added to watchlist' : 'Removed from watchlist');
    } catch (_) {
      _snack('Could not update watchlist');
    } finally {
      if (mounted) setState(() => _busyW = false);
    }
  }

  Future<void> _toggleFavorite(bool current) async {
    if (!LibraryActions.isSignedIn(ref)) {
      context.push('/login');
      return;
    }
    setState(() => _busyF = true);
    try {
      final added = await LibraryActions.toggleFavorite(
        ref,
        widget.anime,
        current,
      );
      _snack(added ? 'Added to favorites' : 'Removed from favorites');
    } catch (_) {
      _snack('Could not update favorites');
    } finally {
      if (mounted) setState(() => _busyF = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    final id = widget.anime.id.toString();
    final inWatch = ref.watch(watchlistStatusProvider(id)).valueOrNull ?? false;
    final isFav = ref.watch(favoriteStatusProvider(id)).valueOrNull ?? false;

    if (tv) return _buildTv(inWatch, isFav);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        OutlinedButton.icon(
          onPressed: _busyW ? null : () => _toggleWatchlist(inWatch),
          icon: _busyW
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : Icon(inWatch ? Icons.check_rounded : Icons.add_rounded),
          label: Text(inWatch ? 'In List' : 'Watchlist'),
          style: OutlinedButton.styleFrom(
            foregroundColor: inWatch ? Colors.white70 : AppColors.text,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            side: BorderSide(
              color: inWatch ? Colors.white38 : AppColors.cardHover,
              width: 1.5,
            ),
            textStyle: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
        ),
        const SizedBox(width: 10),
        Material(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            borderRadius: BorderRadius.circular(8),
            onTap: _busyF ? null : () => _toggleFavorite(isFav),
            child: Container(
              width: 50,
              height: 50,
              alignment: Alignment.center,
              child: _busyF
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Icon(
                      isFav
                          ? Icons.favorite_rounded
                          : Icons.favorite_border_rounded,
                      color: isFav ? Colors.white : AppColors.text,
                    ),
            ),
          ),
        ),
      ],
    );
  }

  /// TV variant: both controls are [_TvFocusable] so the D-pad can land on
  /// them with a visible red ring/glow and Enter toggles them.
  Widget _buildTv(bool inWatch, bool isFav) {
    return Row(
      children: [
        Expanded(
          child: _TvFocusable(
            borderRadius: 8,
            onTap: _busyW ? null : () => _toggleWatchlist(inWatch),
            builder: (focused) => Container(
              padding: const EdgeInsets.symmetric(vertical: 17),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: focused ? Colors.white : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: focused
                      ? Colors.white
                      : (inWatch ? Colors.white38 : AppColors.cardHover),
                  width: 1.5,
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _busyW
                      ? SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: focused ? AppColors.bg : Colors.white,
                          ),
                        )
                      : Icon(
                          inWatch ? Icons.check_rounded : Icons.add_rounded,
                          color: focused
                              ? AppColors.bg
                              : (inWatch ? Colors.white70 : AppColors.text),
                          size: 24,
                        ),
                  const SizedBox(width: 8),
                  Text(
                    inWatch ? 'In List' : 'Watchlist',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: focused
                          ? AppColors.bg
                          : (inWatch ? Colors.white70 : AppColors.text),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        _TvFocusable(
          borderRadius: 8,
          onTap: _busyF ? null : () => _toggleFavorite(isFav),
          builder: (focused) => Container(
            width: 62,
            height: 62,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: focused ? Colors.white : AppColors.card,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: focused ? Colors.white : Colors.transparent,
                width: 1.5,
              ),
            ),
            child: _busyF
                ? SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: focused ? AppColors.bg : Colors.white,
                    ),
                  )
                : Icon(
                    isFav
                        ? Icons.favorite_rounded
                        : Icons.favorite_border_rounded,
                    color: focused
                        ? (isFav ? AppColors.red : AppColors.bg)
                        : (isFav ? AppColors.red : AppColors.text),
                    size: 28,
                  ),
          ),
        ),
      ],
    );
  }
}

/// Synopsis that starts collapsed to a few lines with a 'Read more' / 'Read
/// less' toggle. Kept private to this file so the screen stays a ConsumerWidget.
class _ExpandableSynopsis extends StatefulWidget {
  const _ExpandableSynopsis({required this.text});

  final String text;

  @override
  State<_ExpandableSynopsis> createState() => _ExpandableSynopsisState();
}

class _ExpandableSynopsisState extends State<_ExpandableSynopsis> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    final toggle = InkWell(
      onTap: () => setState(() => _expanded = !_expanded),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Text(
          _expanded ? 'Read less' : 'Read more',
          style: TextStyle(
            color: Colors.white70,
            fontSize: tv ? 16 : 13,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedSize(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          alignment: Alignment.topCenter,
          child: Text(
            widget.text,
            maxLines: _expanded ? null : 4,
            overflow: _expanded ? TextOverflow.visible : TextOverflow.ellipsis,
            style: TextStyle(
              color: AppColors.textMuted,
              height: 1.5,
              fontSize: tv ? 18 : 14,
            ),
          ),
        ),
        const SizedBox(height: 6),
        // On TV the toggle is D-pad-focusable so it can be reached and opened.
        tv
            ? _TvFocusable(
                borderRadius: 6,
                onTap: () => setState(() => _expanded = !_expanded),
                builder: (_) => toggle,
              )
            : toggle,
      ],
    );
  }
}
