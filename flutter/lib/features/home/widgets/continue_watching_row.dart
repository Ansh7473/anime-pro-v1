import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/device/device_info.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/services/continue_watching.dart';
import '../../../shared/widgets/network_poster.dart';

/// Home row that lets the user jump straight back into episodes they started.
/// Each card resumes the player at the recorded episode.
class ContinueWatchingRow extends StatelessWidget {
  const ContinueWatchingRow({super.key, required this.items});

  final List<WatchProgress> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    final isTv = DeviceInfo.isTv(context);
    final double itemWidth = isTv ? 144 : 132;
    final double hPad = isTv ? 24 : 16;
    final double titleSize = isTv ? 18 : 17;
    final double accentHeight = 18;
    final double titleRoom = isTv ? 40 : 38;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(hPad, 8, hPad, 10),
          child: Row(
            children: [
              Container(
                width: 4,
                height: accentHeight,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Continue Watching',
                style: TextStyle(
                  fontSize: titleSize,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: itemWidth * 1.5 + titleRoom + (isTv ? 18 : 0),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            padding: EdgeInsets.fromLTRB(
              hPad,
              isTv ? 9 : 0,
              hPad,
              isTv ? 9 : 0,
            ),
            itemCount: items.length,
            separatorBuilder: (_, _) => SizedBox(width: isTv ? 14 : 12),
            itemBuilder: (_, i) => SizedBox(
              width: itemWidth,
              child: _ResumeCard(p: items[i]),
            ),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}

class _ResumeCard extends StatefulWidget {
  const _ResumeCard({required this.p});

  final WatchProgress p;

  @override
  State<_ResumeCard> createState() => _ResumeCardState();
}

class _ResumeCardState extends State<_ResumeCard> {
  bool _focused = false;

  void _resume() => context.push(
    '/watch/${widget.p.animeId}/${widget.p.episode}',
    extra: widget.p.toAnime(),
  );

  @override
  Widget build(BuildContext context) {
    final p = widget.p;
    return FocusableActionDetector(
      onFocusChange: (v) {
        setState(() => _focused = v);
        if (v && DeviceInfo.isTv(context)) {
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
            _resume();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: _resume,
        borderRadius: BorderRadius.circular(12),
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
                    border: Border.all(
                      color: _focused ? Colors.white : Colors.transparent,
                      width: 2.5,
                    ),
                    boxShadow: _focused
                        ? [
                            BoxShadow(
                              color: Colors.white.withValues(alpha: 0.15),
                              blurRadius: 16,
                              spreadRadius: 0,
                            ),
                          ]
                        : null,
                  ),
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      NetworkPoster(
                        url: p.poster,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      // Play affordance.
                      Center(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.5),
                            shape: BoxShape.circle,
                          ),
                          padding: const EdgeInsets.all(8),
                          child: const Icon(
                            Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                      ),
                      // Episode badge.
                      Positioned(
                        left: 6,
                        bottom: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 7,
                            vertical: 3,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.75),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.white24, width: 1),
                          ),
                          child: Text(
                            'EP ${p.episode}',
                            style: const TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                p.title,
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
          ),
        ),
      ),
    );
  }
}
