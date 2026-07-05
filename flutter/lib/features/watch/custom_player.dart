import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:video_player/video_player.dart';

import '../../core/device/device_info.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/stream_source.dart';

/// A custom video player with overlay controls, subtitle/quality selectors,
/// and TV D-pad navigation. Uses `video_player` directly — no chewie.
class CustomPlayer extends StatefulWidget {
  const CustomPlayer({
    super.key,
    required this.url,
    required this.headers,
    required this.subtitles,
    required this.title,
    this.onBack,
    this.onNext,
    this.onPrev,
  });

  final String url;
  final Map<String, String> headers;
  final List<SubtitleTrack> subtitles;
  final String title;
  final VoidCallback? onBack;
  final VoidCallback? onNext;
  final VoidCallback? onPrev;

  @override
  State<CustomPlayer> createState() => _CustomPlayerState();
}

class _CustomPlayerState extends State<CustomPlayer> {
  late VideoPlayerController _controller;
  bool _initialized = false;
  bool _overlayVisible = true;
  bool _disposed = false;
  Timer? _hideTimer;

  /// Index into [widget.subtitles], or -1 for off.
  int _activeSubtitle = -1;

  final FocusNode _playerFocus = FocusNode();

  // ─────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _initController();
  }

  Future<void> _initController() async {
    _controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.url),
      httpHeaders: widget.headers,
      formatHint: VideoFormat.hls,
    );
    try {
      await _controller.initialize();
      if (_disposed) return;
      _controller.addListener(_onVideoTick);
      await _controller.play();
      setState(() => _initialized = true);
      _scheduleHide();
    } catch (_) {
      // Initialization failed — show error state via _initialized = false.
      if (!_disposed) setState(() {});
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _hideTimer?.cancel();
    _controller.removeListener(_onVideoTick);
    _controller.dispose();
    _playerFocus.dispose();
    super.dispose();
  }

  // ─────────────────────────────────────────────────────────────
  // Controller listener
  // ─────────────────────────────────────────────────────────────

  void _onVideoTick() {
    if (_disposed) return;
    setState(() {}); // rebuild time/slider
  }

  // ─────────────────────────────────────────────────────────────
  // Overlay visibility
  // ─────────────────────────────────────────────────────────────

  void _scheduleHide() {
    _hideTimer?.cancel();
    _hideTimer = Timer(const Duration(seconds: 4), () {
      if (!_disposed && _controller.value.isPlaying) {
        setState(() => _overlayVisible = false);
      }
    });
  }

  void _showOverlay() {
    setState(() => _overlayVisible = true);
    _scheduleHide();
  }

  void _toggleOverlay() {
    if (_overlayVisible) {
      _hideTimer?.cancel();
      setState(() => _overlayVisible = false);
    } else {
      _showOverlay();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Playback controls
  // ─────────────────────────────────────────────────────────────

  void _togglePlay() {
    if (!_initialized) return;
    _controller.value.isPlaying ? _controller.pause() : _controller.play();
    _showOverlay();
  }

  void _seek(Duration offset) {
    if (!_initialized) return;
    final pos = _controller.value.position + offset;
    _controller.seekTo(pos);
    _showOverlay();
  }

  // ─────────────────────────────────────────────────────────────
  // Key handling (TV D-pad)
  // ─────────────────────────────────────────────────────────────

  KeyEventResult _handleKey(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;

    if (key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.mediaPlayPause) {
      _togglePlay();
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowLeft) {
      _seek(const Duration(seconds: -10));
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowRight) {
      _seek(const Duration(seconds: 10));
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowUp) {
      _showOverlay();
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.escape ||
        key == LogicalKeyboardKey.goBack ||
        key == LogicalKeyboardKey.browserBack) {
      widget.onBack?.call();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  // ─────────────────────────────────────────────────────────────
  // Subtitle selector
  // ─────────────────────────────────────────────────────────────

  void _showSubtitlePicker() {
    final items = [
      const SubtitleTrack(url: '', lang: 'Off'),
      ...widget.subtitles,
    ];
    showModalBottomSheet<int>(
      context: context,
      backgroundColor: AppColors.card,
      builder: (_) => ListView.builder(
        shrinkWrap: true,
        itemCount: items.length,
        itemBuilder: (ctx, i) {
          final isActive =
              (i == 0 && _activeSubtitle == -1) ||
              (i > 0 && _activeSubtitle == i - 1);
          return ListTile(
            title: Text(
              items[i].lang,
              style: TextStyle(color: isActive ? AppColors.red : Colors.white),
            ),
            trailing: isActive
                ? const Icon(Icons.check, color: AppColors.red)
                : null,
            onTap: () {
              setState(() => _activeSubtitle = i == 0 ? -1 : i - 1);
              Navigator.pop(ctx, i);
            },
          );
        },
      ),
    );
    _showOverlay();
  }

  // ─────────────────────────────────────────────────────────────
  // Quality selector (HLS auto; placeholder for manual overrides)
  // ─────────────────────────────────────────────────────────────

  void _showQualityPicker() {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: AppColors.card,
      builder: (_) => Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ListTile(
            title: const Text(
              'Auto (HLS)',
              style: TextStyle(color: AppColors.red),
            ),
            trailing: const Icon(Icons.check, color: AppColors.red),
            onTap: () => Navigator.pop(context),
          ),
          // ponytail: add manual quality selection when backend provides
          // individual resolution URLs parsed from the m3u8 manifest.
        ],
      ),
    );
    _showOverlay();
  }

  // ─────────────────────────────────────────────────────────────
  // Build
  // ─────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final isTv = DeviceInfo.isTv(context);

    return Focus(
      focusNode: _playerFocus,
      autofocus: true,
      onKeyEvent: _handleKey,
      child: GestureDetector(
        onTap: _toggleOverlay,
        behavior: HitTestBehavior.opaque,
        child: Container(
          color: Colors.black,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Video
              if (_initialized)
                Center(
                  child: AspectRatio(
                    aspectRatio: _controller.value.aspectRatio,
                    child: VideoPlayer(_controller),
                  ),
                )
              else
                const Center(
                  child: CircularProgressIndicator(color: AppColors.red),
                ),

              // Center play/pause icon
              if (_overlayVisible && _initialized)
                _CenterPlayButton(
                  isPlaying: _controller.value.isPlaying,
                  onTap: _togglePlay,
                ),

              // Overlay controls
              if (_overlayVisible && _initialized)
                _OverlayControls(
                  controller: _controller,
                  title: widget.title,
                  isTv: isTv,
                  hasSubtitles: widget.subtitles.isNotEmpty,
                  onBack: widget.onBack,
                  onNext: widget.onNext,
                  onPrev: widget.onPrev,
                  onTogglePlay: _togglePlay,
                  onSeek: _seek,
                  onSubtitle: _showSubtitlePicker,
                  onQuality: _showQualityPicker,
                  onInteraction: _showOverlay,
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Center play/pause button
// ═══════════════════════════════════════════════════════════════════

class _CenterPlayButton extends StatelessWidget {
  const _CenterPlayButton({required this.isPlaying, required this.onTap});
  final bool isPlaying;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black54,
          shape: BoxShape.circle,
        ),
        padding: const EdgeInsets.all(16),
        child: Icon(
          isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
          color: Colors.white,
          size: 56,
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Overlay controls (top bar + bottom bar)
// ═══════════════════════════════════════════════════════════════════

class _OverlayControls extends StatelessWidget {
  const _OverlayControls({
    required this.controller,
    required this.title,
    required this.isTv,
    required this.hasSubtitles,
    required this.onBack,
    required this.onNext,
    required this.onPrev,
    required this.onTogglePlay,
    required this.onSeek,
    required this.onSubtitle,
    required this.onQuality,
    required this.onInteraction,
  });

  final VideoPlayerController controller;
  final String title;
  final bool isTv;
  final bool hasSubtitles;
  final VoidCallback? onBack;
  final VoidCallback? onNext;
  final VoidCallback? onPrev;
  final VoidCallback onTogglePlay;
  final void Function(Duration) onSeek;
  final VoidCallback onSubtitle;
  final VoidCallback onQuality;
  final VoidCallback onInteraction;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black87,
            Colors.transparent,
            Colors.transparent,
            Colors.black87,
          ],
          stops: [0.0, 0.25, 0.75, 1.0],
        ),
      ),
      child: Column(
        children: [
          _TopBar(
            title: title,
            isTv: isTv,
            hasSubtitles: hasSubtitles,
            onBack: onBack,
            onSubtitle: onSubtitle,
            onQuality: onQuality,
          ),
          const Spacer(),
          _BottomBar(
            controller: controller,
            isTv: isTv,
            onTogglePlay: onTogglePlay,
            onSeek: onSeek,
            onNext: onNext,
            onPrev: onPrev,
            onInteraction: onInteraction,
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Top bar
// ═══════════════════════════════════════════════════════════════════

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.title,
    required this.isTv,
    required this.hasSubtitles,
    required this.onBack,
    required this.onSubtitle,
    required this.onQuality,
  });

  final String title;
  final bool isTv;
  final bool hasSubtitles;
  final VoidCallback? onBack;
  final VoidCallback onSubtitle;
  final VoidCallback onQuality;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          children: [
            if (onBack != null && !isTv)
              IconButton(
                icon: const Icon(Icons.arrow_back, color: Colors.white),
                onPressed: onBack,
              ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (hasSubtitles)
              _FocusableIconButton(
                icon: Icons.subtitles_outlined,
                tooltip: 'Subtitles',
                onPressed: onSubtitle,
              ),
            _FocusableIconButton(
              icon: Icons.high_quality_outlined,
              tooltip: 'Quality',
              onPressed: onQuality,
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Bottom bar
// ═══════════════════════════════════════════════════════════════════

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.controller,
    required this.isTv,
    required this.onTogglePlay,
    required this.onSeek,
    required this.onNext,
    required this.onPrev,
    required this.onInteraction,
  });

  final VideoPlayerController controller;
  final bool isTv;
  final VoidCallback onTogglePlay;
  final void Function(Duration) onSeek;
  final VoidCallback? onNext;
  final VoidCallback? onPrev;
  final VoidCallback onInteraction;

  @override
  Widget build(BuildContext context) {
    final value = controller.value;
    final position = value.position;
    final duration = value.duration;
    final durationMs = duration.inMilliseconds;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Seek bar
            SliderTheme(
              data: SliderThemeData(
                activeTrackColor: AppColors.red,
                inactiveTrackColor: Colors.white24,
                thumbColor: AppColors.red,
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 7),
                overlayShape: const RoundSliderOverlayShape(overlayRadius: 14),
                trackHeight: 3,
              ),
              child: Slider(
                value: durationMs > 0
                    ? position.inMilliseconds.toDouble().clamp(
                        0,
                        durationMs.toDouble(),
                      )
                    : 0,
                max: durationMs > 0 ? durationMs.toDouble() : 1,
                onChanged: (v) {
                  controller.seekTo(Duration(milliseconds: v.toInt()));
                  onInteraction();
                },
              ),
            ),
            // Controls row
            Row(
              children: [
                // Timestamp
                Text(
                  '${_fmt(position)} / ${_fmt(duration)}',
                  style: const TextStyle(color: Colors.white, fontSize: 12),
                ),
                const Spacer(),
                if (onPrev != null)
                  _FocusableIconButton(
                    icon: Icons.skip_previous_rounded,
                    tooltip: 'Previous',
                    onPressed: onPrev!,
                  ),
                _FocusableIconButton(
                  icon: Icons.replay_10_rounded,
                  tooltip: 'Rewind 10s',
                  onPressed: () => onSeek(const Duration(seconds: -10)),
                ),
                _FocusableIconButton(
                  icon: value.isPlaying
                      ? Icons.pause_rounded
                      : Icons.play_arrow_rounded,
                  tooltip: value.isPlaying ? 'Pause' : 'Play',
                  onPressed: onTogglePlay,
                  size: 36,
                ),
                _FocusableIconButton(
                  icon: Icons.forward_10_rounded,
                  tooltip: 'Forward 10s',
                  onPressed: () => onSeek(const Duration(seconds: 10)),
                ),
                if (onNext != null)
                  _FocusableIconButton(
                    icon: Icons.skip_next_rounded,
                    tooltip: 'Next',
                    onPressed: onNext!,
                  ),
                const Spacer(),
                // Fullscreen toggle (no-op on TV, meaningful on mobile)
                if (!isTv)
                  _FocusableIconButton(
                    icon: Icons.fullscreen_rounded,
                    tooltip: 'Fullscreen',
                    onPressed: () {
                      // Toggle immersive mode
                      SystemChrome.setEnabledSystemUIMode(
                        SystemUiMode.immersiveSticky,
                      );
                    },
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Shared: focusable icon button (D-pad navigable)
// ═══════════════════════════════════════════════════════════════════

class _FocusableIconButton extends StatelessWidget {
  const _FocusableIconButton({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.size = 24,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Focus(
      child: Builder(
        builder: (ctx) {
          final focused = Focus.of(ctx).hasFocus;
          return IconButton(
            icon: Icon(icon, color: Colors.white, size: size),
            tooltip: tooltip,
            onPressed: onPressed,
            style: focused
                ? ButtonStyle(
                    backgroundColor: WidgetStatePropertyAll(Colors.white24),
                  )
                : null,
          );
        },
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

String _fmt(Duration d) {
  final h = d.inHours;
  final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
  final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
  return h > 0 ? '$h:$m:$s' : '$m:$s';
}
