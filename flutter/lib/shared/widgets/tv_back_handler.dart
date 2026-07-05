import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/device/device_info.dart';

/// App-level keyboard shortcut handler for Android TV.
///
/// Intercepts the hardware BACK button (sent as `goBack` key event on Android
/// TV remotes) and pops the navigator. Placed high in the widget tree so it
/// catches back regardless of which child has focus.
///
/// On non-TV devices this is a no-op pass-through.
class TvBackHandler extends StatelessWidget {
  const TvBackHandler({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!DeviceInfo.isTv(context)) return child;

    return PopScope(
      canPop: true,
      child: Shortcuts(
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.goBack): _PopIntent(),
          SingleActivator(LogicalKeyboardKey.browserBack): _PopIntent(),
        },
        child: Actions(
          actions: {
            _PopIntent: CallbackAction<_PopIntent>(
              onInvoke: (_) {
                final nav = Navigator.maybeOf(context);
                if (nav != null && nav.canPop()) {
                  nav.pop();
                }
                return null;
              },
            ),
          },
          child: child,
        ),
      ),
    );
  }
}

class _PopIntent extends Intent {
  const _PopIntent();
}
