import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/device/device_info.dart';
import '../../../core/providers/providers.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/anime.dart';
import '../../../shared/widgets/network_poster.dart';

/// Full-bleed featured banner shown at the top of Home. Cycles through a list of
/// items (e.g. Movies) every 4 seconds, crossfades images and metadata, and
/// pauses the rotation timer when any of the action buttons receive D-pad focus.
class HeroBanner extends ConsumerStatefulWidget {
  const HeroBanner({super.key, required this.items, required this.height});

  final List<Anime> items;
  final double height;

  @override
  ConsumerState<HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends ConsumerState<HeroBanner> {
  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startTimer();
    _updateProvider();
  }

  @override
  void didUpdateWidget(HeroBanner oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.items != oldWidget.items) {
      _currentIndex = 0;
      _updateProvider();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (widget.items.isEmpty) return;
      setState(() {
        _currentIndex = (_currentIndex + 1) % widget.items.length;
      });
      _updateProvider();
      // After rotation, re-request focus on TV if nothing is focused.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        final primary = FocusManager.instance.primaryFocus;
        if (primary == null || primary == FocusManager.instance.rootScope) {
          FocusScope.of(context).nextFocus();
        }
      });
    });
  }

  void _updateProvider() {
    if (widget.items.isEmpty) return;
    final activeItem = widget.items[_currentIndex];
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.read(activeHeroAnimeProvider.notifier).state = activeItem;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.items.isEmpty) return SizedBox(height: widget.height);

    final anime = widget.items[_currentIndex];
    final wide = DeviceInfo.of(context) != FormFactor.phone;
    final isTv = DeviceInfo.isTv(context);
    final titleSize = isTv ? 32.0 : (wide ? 38.0 : 30.0);
    final maxContentWidth = wide
        ? MediaQuery.of(context).size.width * (isTv ? 0.62 : 0.55)
        : double.infinity;

    return SizedBox(
      height: widget.height,
      width: double.infinity,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (!isTv) ...[
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 400),
              layoutBuilder: (currentChild, previousChildren) {
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    ...previousChildren,
                    // ignore: use_null_aware_elements
                    if (currentChild != null) currentChild,
                  ],
                );
              },
              child: SizedBox.expand(
                key: ValueKey<String>(
                  'hero_img_${anime.id}_${anime.banner ?? anime.poster}',
                ),
                child: NetworkPoster(
                  url: anime.banner ?? anime.poster,
                  fit: BoxFit.cover,
                  memCacheWidth: null,
                ),
              ),
            ),
            // Bottom scrim: strong fade into the page background for the text.
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                  colors: [AppColors.bg, Colors.transparent],
                  stops: [0.05, 0.7],
                ),
              ),
            ),
            // Left scrim: lighter than before so the artwork stays visible.
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    AppColors.bg.withValues(alpha: 0.75),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.6],
                ),
              ),
            ),
          ],
          Positioned(
            left: isTv ? 24 : (wide ? 48 : 20),
            right: 20,
            bottom: isTv ? 26 : (wide ? 44 : 28),
            child: Focus(
              canRequestFocus: false,
              onFocusChange: (focused) {
                if (focused) {
                  _timer?.cancel();
                } else {
                  _startTimer();
                }
              },
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: maxContentWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 300),
                      layoutBuilder: (currentChild, previousChildren) {
                        return Stack(
                          alignment: Alignment.topLeft,
                          children: [
                            ...previousChildren,
                            // ignore: use_null_aware_elements
                            if (currentChild != null) currentChild,
                          ],
                        );
                      },
                      child: Column(
                        key: ValueKey<int>(anime.id),
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (anime.genres.isNotEmpty)
                            Text(
                              anime.genres.take(3).join('   •   '),
                              style: TextStyle(
                                color: Colors.white70,
                                fontWeight: FontWeight.w700,
                                fontSize: isTv ? 13 : (wide ? 15 : 13),
                                letterSpacing: 0.6,
                              ),
                            ),
                          const SizedBox(height: 10),
                          Text(
                            anime.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: titleSize,
                              fontWeight: FontWeight.w900,
                              height: 1.05,
                              letterSpacing: -0.5,
                              color: AppColors.text,
                              shadows: const [
                                Shadow(color: Colors.black54, blurRadius: 12),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          _MetaRow(anime: anime, wide: wide),
                          if (anime.description != null) ...[
                            const SizedBox(height: 10),
                            Text(
                              anime.description!,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                color: AppColors.textMuted,
                                fontSize: isTv ? 13 : (wide ? 15 : 13.5),
                                height: 1.4,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    SizedBox(height: isTv ? 12 : (wide ? 20 : 16)),
                    Row(
                      children: [
                        _HeroActionButton(
                          wide: wide,
                          primary: true,
                          autofocus: wide,
                          icon: Icons.play_arrow_rounded,
                          label: 'Play',
                          onPressed: () => context.push(
                            '/watch/${anime.id}/1',
                            extra: anime,
                          ),
                        ),
                        const SizedBox(width: 12),
                        _HeroActionButton(
                          wide: wide,
                          primary: false,
                          icon: Icons.info_outline_rounded,
                          label: 'Details',
                          onPressed: () =>
                              context.push('/anime/${anime.id}', extra: anime),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroActionButton extends StatefulWidget {
  const _HeroActionButton({
    required this.onPressed,
    required this.icon,
    required this.label,
    required this.wide,
    required this.primary,
    this.autofocus = false,
  });

  final VoidCallback onPressed;
  final IconData icon;
  final String label;
  final bool wide;
  final bool primary;
  final bool autofocus;

  @override
  State<_HeroActionButton> createState() => _HeroActionButtonState();
}

class _HeroActionButtonState extends State<_HeroActionButton> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final wide = widget.wide;
    final fontSize = wide ? 16.0 : 15.0;

    final bg = widget.primary
        ? (_focused ? const Color(0xFF2C2C2C) : Colors.white)
        : (_focused ? Colors.white30 : Colors.white12);

    final fg = widget.primary
        ? (_focused ? Colors.white : Colors.black)
        : Colors.white;

    final borderColor = _focused ? Colors.white : Colors.transparent;

    return FocusableActionDetector(
      autofocus: widget.autofocus,
      onFocusChange: (v) {
        setState(() => _focused = v);
        if (v) {
          Scrollable.maybeOf(context)?.position.animateTo(
            0,
            duration: const Duration(milliseconds: 280),
            curve: Curves.easeOut,
          );
        }
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onPressed();
            return null;
          },
        ),
      },
      child: GestureDetector(
        onTap: widget.onPressed,
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: EdgeInsets.symmetric(
              horizontal: wide
                  ? (widget.primary ? 24 : 20)
                  : (widget.primary ? 22 : 18),
              vertical: wide ? 13 : 12,
            ),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: borderColor, width: 2.0),
              boxShadow: _focused
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.55),
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
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(widget.icon, size: 24, color: fg),
                const SizedBox(width: 8),
                Text(
                  widget.label,
                  style: TextStyle(
                    color: fg,
                    fontSize: fontSize,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MetaRow extends StatelessWidget {
  const _MetaRow({required this.anime, required this.wide});

  final Anime anime;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final fs = wide ? 13.0 : 12.5;
    final muted = TextStyle(
      color: AppColors.textMuted,
      fontSize: fs,
      fontWeight: FontWeight.w500,
    );
    final parts = <Widget>[];

    if (anime.score != null) {
      parts.add(
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.star_rounded, color: Colors.amber, size: fs + 4),
            const SizedBox(width: 3),
            Text(
              anime.score!.toStringAsFixed(1),
              style: TextStyle(
                color: AppColors.text,
                fontSize: fs,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      );
    }
    if (anime.year != null) parts.add(Text('${anime.year}', style: muted));
    if (anime.format != null && anime.format!.isNotEmpty) {
      parts.add(Text(anime.format!, style: muted));
    }
    if (anime.episodes != null) {
      parts.add(Text('${anime.episodes} eps', style: muted));
    }

    if (parts.isEmpty) return const SizedBox.shrink();

    final children = <Widget>[];
    for (var i = 0; i < parts.length; i++) {
      if (i > 0) {
        children.add(
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text('•', style: muted),
          ),
        );
      }
      children.add(parts[i]);
    }
    return Row(mainAxisSize: MainAxisSize.min, children: children);
  }
}
