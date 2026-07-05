import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';

/// Transparent overlay shown on TV when user presses select/enter during
/// playback. Shows play state, current time, seek bar, and episode title.
/// Auto-hides after [autoHideDuration].
class TvVideoOverlay extends StatefulWidget {
  const TvVideoOverlay({
    super.key,
    required this.title,
    required this.isPlaying,
    required this.position,
    required this.duration,
    required this.onPlayPause,
    required this.onSeekForward,
    required this.onSeekBack,
    this.autoHideDuration = const Duration(seconds: 5),
  });

  final String title;
  final bool isPlaying;
  final Duration position;
  final Duration duration;
  final VoidCallback onPlayPause;
  final VoidCallback onSeekForward;
  final VoidCallback onSeekBack;
  final Duration autoHideDuration;

  @override
  State<TvVideoOverlay> createState() => TvVideoOverlayState();
}

class TvVideoOverlayState extends State<TvVideoOverlay>
    with SingleTickerProviderStateMixin {
  late final AnimationController _fadeCtrl;
  bool _visible = false;

  @override
  void initState() {
    super.initState();
    _fadeCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _fadeCtrl.dispose();
    super.dispose();
  }

  void show() {
    setState(() => _visible = true);
    _fadeCtrl.forward();
    _scheduleHide();
  }

  void hide() {
    _fadeCtrl.reverse().then((_) {
      if (mounted) setState(() => _visible = false);
    });
  }

  void toggle() {
    _visible ? hide() : show();
  }

  void _scheduleHide() {
    Future.delayed(widget.autoHideDuration, () {
      if (mounted && _visible && widget.isPlaying) hide();
    });
  }

  String _fmt(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return h > 0 ? '$h:$m:$s' : '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    if (!_visible) return const SizedBox.shrink();

    final progress = widget.duration.inMilliseconds > 0
        ? widget.position.inMilliseconds / widget.duration.inMilliseconds
        : 0.0;

    return FadeTransition(
      opacity: _fadeCtrl,
      child: Container(
        color: Colors.black54,
        padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Title
            Text(
              widget.title,
              style: const TextStyle(
                color: AppColors.text,
                fontSize: 20,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 16),
            // Progress bar
            ClipRRect(
              borderRadius: BorderRadius.circular(3),
              child: LinearProgressIndicator(
                value: progress.clamp(0.0, 1.0),
                backgroundColor: Colors.white24,
                valueColor: const AlwaysStoppedAnimation(AppColors.red),
                minHeight: 5,
              ),
            ),
            const SizedBox(height: 8),
            // Time labels
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _fmt(widget.position),
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 14,
                  ),
                ),
                Text(
                  _fmt(widget.duration),
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            // Controls hint
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _controlHint(Icons.fast_rewind_rounded, '−10s'),
                const SizedBox(width: 32),
                Icon(
                  widget.isPlaying
                      ? Icons.pause_circle_filled_rounded
                      : Icons.play_circle_fill_rounded,
                  color: Colors.white,
                  size: 48,
                ),
                const SizedBox(width: 32),
                _controlHint(Icons.fast_forward_rounded, '+10s'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _controlHint(IconData icon, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Colors.white70, size: 28),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(color: Colors.white54, fontSize: 11),
        ),
      ],
    );
  }
}
