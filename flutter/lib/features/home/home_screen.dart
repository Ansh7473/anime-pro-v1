import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/device/device_info.dart';
import '../../core/providers/providers.dart';
import '../../core/services/update_checker.dart';
import '../../core/theme/app_colors.dart';
import '../../data/services/api_service.dart';
import '../../data/services/continue_watching.dart';
import '../../shared/widgets/content_row.dart';
import '../../shared/widgets/loading.dart';
import 'widgets/continue_watching_row.dart';
import 'widgets/hero_banner.dart';

/// The Home tab: a featured hero followed by content rows. Works for both phone
/// (scroll/touch) and TV (D-pad focus traverses cards within rows).
class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final home = ref.watch(homeProvider);
    final continueWatching = ref.watch(continueWatchingProvider);
    final focusedAnime = ref.watch(focusedAnimeProvider);
    final isTv = DeviceInfo.isTv(context);
    final screenHeight = MediaQuery.of(context).size.height;

    // Check for app updates on first load.
    ref.listen<AsyncValue<UpdateInfo>>(updateCheckProvider, (_, next) {
      next.whenData((info) {
        if (!info.hasUpdate) return;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Update available: ${info.version}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              duration: const Duration(seconds: 10),
              action: SnackBarAction(
                label: 'Download',
                onPressed: () {
                  UpdateChecker.dismiss(info.version);
                  _openUrl(info.downloadUrl);
                },
              ),
            ),
          );
        });
      });
    });
    // TV is landscape, so clamp the hero so it doesn't eat the whole screen.
    final heroHeight = isTv
        ? (screenHeight * 0.5).clamp(240.0, 320.0)
        : (screenHeight * 0.52).clamp(280.0, 520.0);

    Widget body = home.when(
      loading: () => const _HomeLoading(),
      error: (e, _) => ErrorRetry(
        message: 'Could not load home.\n$e',
        onRetry: () => ref.invalidate(homeProvider),
      ),
      data: (HomeData data) {
        final activeHero = ref.watch(activeHeroAnimeProvider);
        final displayAnime =
            focusedAnime ??
            activeHero ??
            (data.spotlight.isNotEmpty ? data.spotlight.first : null);

        final entries = data.sections.entries.toList();
        final moviesIdx = entries.indexWhere(
          (e) => e.key.toLowerCase() == 'movies',
        );
        final actionIdx = entries.indexWhere(
          (e) => e.key.toLowerCase() == 'action',
        );
        if (moviesIdx != -1 && actionIdx != -1 && moviesIdx > actionIdx) {
          final movies = entries.removeAt(moviesIdx);
          entries.insert(actionIdx, movies);
        }

        final mainContent = RefreshIndicator(
          color: Colors.white,
          backgroundColor: const Color(0xFF181818),
          onRefresh: () async => ref.invalidate(homeProvider),
          child: CustomScrollView(
            slivers: [
              // On TV the left NavigationRail already shows the wordmark and a
              // Search destination, so the SliverAppBar would be redundant.
              // Hide it there and give the hero a little comfortable top
              // breathing room; keep the app bar on phone/tablet.
              if (isTv)
                const SliverToBoxAdapter(child: SizedBox(height: 24))
              else
                SliverAppBar(
                  floating: true,
                  snap: true,
                  pinned: false,
                  backgroundColor: AppColors.bg,
                  elevation: 0,
                  titleSpacing: 16,
                  title: const _Wordmark(),
                  actions: [
                    IconButton(
                      onPressed: () => context.go('/search'),
                      icon: const Icon(Icons.search, color: AppColors.text),
                      tooltip: 'Search',
                    ),
                    const SizedBox(width: 4),
                  ],
                ),
              SliverToBoxAdapter(
                child: HeroBanner(
                  items: entries
                      .firstWhere(
                        (e) => e.key.toLowerCase() == 'movies',
                        orElse: () => MapEntry('', data.spotlight),
                      )
                      .value,
                  height: heroHeight,
                ),
              ),
              if (continueWatching.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: ContinueWatchingRow(items: continueWatching),
                  ),
                ),
              SliverList.builder(
                itemCount: entries.length,
                itemBuilder: (context, i) {
                  final entry = entries[i];
                  return ContentRow(title: entry.key, items: entry.value);
                },
              ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        );

        if (isTv && displayAnime != null) {
          return _TvFocusRequestor(
            child: Stack(
              children: [
                Positioned.fill(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 400),
                    child: CachedNetworkImage(
                      imageUrl:
                          displayAnime.banner ?? displayAnime.poster ?? "",
                      key: ValueKey<String>(
                        displayAnime.id.toString() +
                            (displayAnime.banner ?? displayAnime.poster ?? ""),
                      ),
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      fadeInDuration: const Duration(milliseconds: 300),
                      placeholder: (_, _) => Container(color: AppColors.bg),
                      errorWidget: (_, _, _) => Container(color: AppColors.bg),
                    ),
                  ),
                ),
                // Cinematic background shading
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                        colors: [
                          Colors.black.withValues(alpha: 0.85),
                          Colors.black.withValues(alpha: 0.5),
                          Colors.black.withValues(alpha: 0.1),
                        ],
                        stops: const [0.0, 0.45, 1.0],
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
                          Colors.black.withValues(alpha: 0.3),
                          Colors.transparent,
                        ],
                        stops: const [0.0, 0.35, 1.0],
                      ),
                    ),
                  ),
                ),
                Positioned.fill(child: mainContent),
              ],
            ),
          );
        }

        return mainContent;
      },
    );

    return Scaffold(body: body);
  }
}

/// Opens [url] in the external browser.
Future<void> _openUrl(String url) async {
  final uri = Uri.tryParse(url);
  if (uri == null) return;
  try {
    await launchUrl(uri, mode: LaunchMode.externalApplication);
  } catch (_) {}
}

class _HomeLoading extends StatelessWidget {
  const _HomeLoading();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: const [
        SizedBox(height: 24),
        RowSkeleton(),
        SizedBox(height: 8),
        RowSkeleton(),
        SizedBox(height: 8),
        RowSkeleton(),
      ],
    );
  }
}

/// "Watch" (white) + "Animez" (red) wordmark used in the home app bar.
class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return const Text.rich(
      TextSpan(
        children: [
          TextSpan(text: 'Watch'),
          TextSpan(
            text: 'Animez',
            style: TextStyle(color: AppColors.red),
          ),
        ],
      ),
      style: TextStyle(
        fontSize: 22,
        fontWeight: FontWeight.w800,
        letterSpacing: -0.5,
        color: AppColors.text,
      ),
    );
  }
}

class _TvFocusRequestor extends StatefulWidget {
  const _TvFocusRequestor({required this.child});
  final Widget child;

  @override
  State<_TvFocusRequestor> createState() => _TvFocusRequestorState();
}

class _TvFocusRequestorState extends State<_TvFocusRequestor> {
  final FocusScopeNode _scopeNode = FocusScopeNode(
    debugLabel: 'tvFocusRequestorScope',
  );
  bool _hasFocused = false;

  @override
  void initState() {
    super.initState();
    _requestContentFocus();
  }

  void _requestContentFocus() {
    if (_hasFocused) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _hasFocused) return;
      if (!_scopeNode.hasFocus) {
        _scopeNode.requestFocus();
        _hasFocused = true;
      }
    });
  }

  @override
  void dispose() {
    _scopeNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FocusScope(node: _scopeNode, autofocus: true, child: widget.child);
  }
}
