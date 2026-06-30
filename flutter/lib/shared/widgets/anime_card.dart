import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/device/device_info.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/anime.dart';
import 'network_poster.dart';

/// A poster card used throughout the app. It is fully D-pad friendly: when it
/// receives focus (TV/remote) it scales up and draws a red focus ring, matching
/// the website's TV focus treatment. On touch it simply navigates on tap.
class AnimeCard extends ConsumerStatefulWidget {
  const AnimeCard({
    super.key,
    required this.anime,
    this.showTitle = true,
    this.focusNode,
    this.onKey,
  });

  final Anime anime;
  final bool showTitle;
  final FocusNode? focusNode;
  final FocusOnKeyEventCallback? onKey;

  @override
  ConsumerState<AnimeCard> createState() => _AnimeCardState();
}

class _AnimeCardState extends ConsumerState<AnimeCard> {
  bool _focused = false;
  FocusNode? _localFocusNode;

  FocusNode get _effectiveFocusNode => widget.focusNode ?? (_localFocusNode ??= FocusNode(debugLabel: 'animeCard_${widget.anime.title}'));

  void _open() => context.push('/anime/${widget.anime.id}', extra: widget.anime);

  @override
  void initState() {
    super.initState();
    _effectiveFocusNode.onKeyEvent = (node, event) {
      if (widget.onKey != null) {
        return widget.onKey!(node, event);
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void didUpdateWidget(AnimeCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _effectiveFocusNode.onKeyEvent = (node, event) {
      if (widget.onKey != null) {
        return widget.onKey!(node, event);
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void dispose() {
    _localFocusNode?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.anime;
    return FocusableActionDetector(
      focusNode: _effectiveFocusNode,
      onFocusChange: (v) {
        setState(() => _focused = v);
        if (v && DeviceInfo.isTv(context)) {
          // Update the global focused anime provider so the Home screen dynamic backdrop changes
          ref.read(focusedAnimeProvider.notifier).state = widget.anime;
          
          Scrollable.ensureVisible(
            context,
            alignment: 0.5,
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
          );
        }
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            _open();
            return null;
          },
        ),
      },
      child: GestureDetector(
        onTap: _open,
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
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
                            )
                          ]
                        : null,
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      NetworkPoster(
                        url: a.poster,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      if (a.score != null)
                        Positioned(
                          top: 6,
                          left: 6,
                          child: _scoreBadge(a.score!),
                        ),
                      // Draw the white focus border on top so it isn't clipped or covered by the poster.
                      IgnorePointer(
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: _focused ? Colors.white.withValues(alpha: 0.9) : Colors.transparent,
                              width: 2.2,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              if (widget.showTitle) ...[
                const SizedBox(height: 6),
                Text(
                  a.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: DeviceInfo.isTv(context) ? 13 : 12.5,
                    height: 1.2,
                    fontWeight: FontWeight.w500,
                    color: _focused ? AppColors.text : AppColors.textMuted,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _scoreBadge(double score) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.75),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star_rounded, color: Colors.amber, size: 13),
            const SizedBox(width: 2),
            Text(
              score.toStringAsFixed(1),
              style: const TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.text,
              ),
            ),
          ],
        ),
      );
}
