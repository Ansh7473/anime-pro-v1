import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/device/device_info.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/anime.dart';
import '../../shared/widgets/anime_card.dart';
import '../../shared/widgets/loading.dart';
import '../auth/auth_controller.dart';
import 'library_providers.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authed = ref.watch(authProvider).isAuthenticated;
    final isTv = DeviceInfo.isTv(context);

    if (!authed) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.bookmark_outline,
                size: isTv ? 64 : 48,
                color: AppColors.textMuted,
              ),
              const SizedBox(height: 12),
              Text(
                'Sign in to see your library',
                style: TextStyle(
                  color: AppColors.textMuted,
                  fontSize: isTv ? 18 : 14,
                ),
              ),
              const SizedBox(height: 20),
              if (isTv)
                SizedBox(
                  width: 200,
                  child: _TvFocusableButton(
                    autofocus: true,
                    onPressed: () => context.push('/login'),
                    label: 'Sign In',
                  ),
                )
              else
                FilledButton(
                  onPressed: () => context.push('/login'),
                  child: const Text('Sign In'),
                ),
            ],
          ),
        ),
      );
    }

    return DefaultTabController(
      length: 2,
      child: Builder(
        builder: (context) {
          final isTv = DeviceInfo.isTv(context);
          return Scaffold(
            appBar: AppBar(
              titleSpacing: isTv ? 48 : null,
              toolbarHeight: isTv ? 72 : null,
              title: Text(
                'My Library',
                style: isTv
                    ? const TextStyle(fontSize: 24, fontWeight: FontWeight.w700)
                    : null,
              ),
              bottom: _LibraryTabBar(isTv: isTv),
            ),
            body: TabBarView(
              children: [
                _Grid(provider: watchlistProvider),
                _Grid(provider: favoritesProvider),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// App bar tab strip. On phone/tablet this is the stock [TabBar]; on TV it
/// renders large, D-pad-focusable pill tabs with red focus rings.
class _LibraryTabBar extends StatelessWidget implements PreferredSizeWidget {
  const _LibraryTabBar({required this.isTv});

  final bool isTv;

  @override
  Size get preferredSize => Size.fromHeight(isTv ? 66 : 46);

  @override
  Widget build(BuildContext context) {
    if (!isTv) {
      return const TabBar(
        indicatorColor: Colors.white,
        labelColor: AppColors.text,
        unselectedLabelColor: AppColors.textMuted,
        tabs: [
          Tab(text: 'Watchlist'),
          Tab(text: 'Favorites'),
        ],
      );
    }
    return _TvTabBar(controller: DefaultTabController.of(context));
  }
}

class _TvTabBar extends StatefulWidget {
  const _TvTabBar({required this.controller});

  final TabController controller;

  @override
  State<_TvTabBar> createState() => _TvTabBarState();
}

class _TvTabBarState extends State<_TvTabBar> {
  int _lastIndex = -1;

  @override
  void initState() {
    super.initState();
    _lastIndex = widget.controller.index;
    widget.controller.addListener(_onChange);
  }

  void _onChange() {
    if (!mounted) return;
    if (widget.controller.index == _lastIndex) return;
    _lastIndex = widget.controller.index;
    setState(() {});
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onChange);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final index = widget.controller.index;
    return Padding(
      padding: const EdgeInsets.fromLTRB(48, 4, 48, 10),
      child: Row(
        children: [
          _TvTab(
            label: 'Watchlist',
            selected: index == 0,
            autofocus: true,
            onTap: () => widget.controller.animateTo(0),
          ),
          const SizedBox(width: 16),
          _TvTab(
            label: 'Favorites',
            selected: index == 1,
            onTap: () => widget.controller.animateTo(1),
          ),
        ],
      ),
    );
  }
}

class _TvTab extends StatefulWidget {
  const _TvTab({
    required this.label,
    required this.selected,
    required this.onTap,
    this.autofocus = false,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool autofocus;

  @override
  State<_TvTab> createState() => _TvTabState();
}

class _TvTabState extends State<_TvTab> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final selected = widget.selected;
    return FocusableActionDetector(
      autofocus: widget.autofocus,
      onFocusChange: (v) => setState(() => _focused = v),
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onTap();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            decoration: BoxDecoration(
              color: selected
                  ? Colors.white.withValues(alpha: 0.15)
                  : AppColors.card,
              borderRadius: BorderRadius.circular(26),
              border: Border.all(
                color: _focused
                    ? Colors.white
                    : (selected
                          ? Colors.white.withValues(alpha: 0.4)
                          : AppColors.cardHover),
                width: _focused ? 2.5 : 1.5,
              ),
              boxShadow: (selected || _focused)
                  ? [
                      BoxShadow(
                        color: Colors.white.withValues(
                          alpha: _focused ? 0.15 : 0.08,
                        ),
                        blurRadius: _focused ? 18 : 12,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            child: Text(
              widget.label,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w700,
                color: selected ? AppColors.text : AppColors.textMuted,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Grid extends ConsumerWidget {
  const _Grid({required this.provider});
  final AutoDisposeFutureProvider<List<Anime>> provider;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(provider);
    final isTv = DeviceInfo.isTv(context);
    final columns = DeviceInfo.gridColumns(context);
    final pad = isTv ? 48.0 : 16.0;
    return async.when(
      loading: () => const CenteredLoader(),
      error: (_, _) => ErrorRetry(onRetry: () => ref.invalidate(provider)),
      data: (list) {
        if (list.isEmpty) {
          return Center(
            child: Text(
              'Nothing here yet.',
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: isTv ? 18 : 14,
              ),
            ),
          );
        }
        return GridView.builder(
          padding: EdgeInsets.all(pad),
          clipBehavior: Clip.none,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            childAspectRatio: 0.56,
            mainAxisSpacing: isTv ? 24 : 14,
            crossAxisSpacing: isTv ? 20 : 12,
          ),
          itemCount: list.length,
          itemBuilder: (_, i) => AnimeCard(anime: list[i]),
        );
      },
    );
  }
}

class _TvFocusableButton extends StatefulWidget {
  const _TvFocusableButton({
    required this.onPressed,
    required this.label,
    this.autofocus = false,
  });

  final VoidCallback onPressed;
  final String label;
  final bool autofocus;

  @override
  State<_TvFocusableButton> createState() => _TvFocusableButtonState();
}

class _TvFocusableButtonState extends State<_TvFocusableButton> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return FocusableActionDetector(
      autofocus: widget.autofocus,
      onFocusChange: (v) => setState(() => _focused = v),
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onPressed();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onPressed,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
            decoration: BoxDecoration(
              color: _focused
                  ? Colors.white
                  : Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _focused ? const Color(0xFF181818) : Colors.white24,
                width: 2.0,
              ),
              boxShadow: _focused
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
              widget.label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _focused ? Colors.black : Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
