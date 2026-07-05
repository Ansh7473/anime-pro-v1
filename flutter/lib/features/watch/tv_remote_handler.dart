import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/device/device_info.dart';

/// Wraps a child widget to intercept Android TV remote **media** key events.
///
/// IMPORTANT: Only intercepts dedicated media keys (play/pause/rewind/forward).
/// Does NOT intercept arrow keys or enter/select — those are used by Flutter's
/// D-pad focus system for UI navigation.
///
/// On non-TV devices the child is returned as-is.
class TvRemoteHandler extends StatefulWidget {
  const TvRemoteHandler({
    super.key,
    required this.child,
    this.onPlayPause,
    this.onSeekForward,
    this.onSeekBack,
    this.onBack,
  });

  final Widget child;
  final VoidCallback? onPlayPause;
  final VoidCallback? onSeekForward;
  final VoidCallback? onSeekBack;
  final VoidCallback? onBack;

  @override
  State<TvRemoteHandler> createState() => _TvRemoteHandlerState();
}

class _TvRemoteHandlerState extends State<TvRemoteHandler> {
  KeyEventResult _handleKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final key = event.logicalKey;

    // Only intercept DEDICATED media remote keys.
    // Never intercept arrowLeft/arrowRight/enter/select — those are for D-pad nav.

    // Play / Pause (dedicated media buttons only)
    if (key == LogicalKeyboardKey.mediaPlay ||
        key == LogicalKeyboardKey.mediaPlayPause ||
        key == LogicalKeyboardKey.mediaPause) {
      widget.onPlayPause?.call();
      return KeyEventResult.handled;
    }

    // Seek back (dedicated rewind button only)
    if (key == LogicalKeyboardKey.mediaRewind) {
      widget.onSeekBack?.call();
      return KeyEventResult.handled;
    }

    // Seek forward (dedicated fast-forward button only)
    if (key == LogicalKeyboardKey.mediaFastForward) {
      widget.onSeekForward?.call();
      return KeyEventResult.handled;
    }

    // Back button on remote
    if (key == LogicalKeyboardKey.goBack) {
      widget.onBack?.call();
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    if (!DeviceInfo.isTv(context)) return widget.child;

    return Focus(
      canRequestFocus: false,
      onKeyEvent: _handleKey,
      child: widget.child,
    );
  }
}
