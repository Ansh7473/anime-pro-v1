import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/app_colors.dart';

/// Focus-aware button designed for 10-foot TV experience.
/// Shows prominent white focus ring + scale-up when D-pad focused.
class TvButton extends StatefulWidget {
  const TvButton({
    super.key,
    required this.label,
    this.icon,
    this.onPressed,
    this.autofocus = false,
    this.filled = false,
    this.width,
  });

  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool autofocus;
  final bool filled;
  final double? width;

  @override
  State<TvButton> createState() => _TvButtonState();
}

class _TvButtonState extends State<TvButton> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return FocusableActionDetector(
      autofocus: widget.autofocus,
      onFocusChange: (v) => setState(() => _focused = v),
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onPressed?.call();
            return null;
          },
        ),
      },
      shortcuts: {
        const SingleActivator(LogicalKeyboardKey.select):
            const ActivateIntent(),
        const SingleActivator(LogicalKeyboardKey.enter): const ActivateIntent(),
      },
      child: InkWell(
        onTap: widget.onPressed,
        borderRadius: BorderRadius.circular(8),
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: widget.width,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            decoration: BoxDecoration(
              color: _focused
                  ? (widget.filled ? AppColors.red : Colors.white)
                  : (widget.filled
                        ? AppColors.red.withValues(alpha: 0.8)
                        : Colors.white.withValues(alpha: 0.08)),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _focused
                    ? Colors.white.withValues(alpha: 0.95)
                    : (widget.filled ? Colors.transparent : Colors.white24),
                width: 2.2,
              ),
              boxShadow: _focused
                  ? [
                      BoxShadow(
                        color: (widget.filled ? AppColors.red : Colors.white)
                            .withValues(alpha: 0.25),
                        blurRadius: 14,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (widget.icon != null) ...[
                  Icon(
                    widget.icon,
                    color: _focused
                        ? (widget.filled ? Colors.white : Colors.black)
                        : Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 10),
                ],
                Text(
                  widget.label,
                  style: TextStyle(
                    color: _focused
                        ? (widget.filled ? Colors.white : Colors.black)
                        : Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
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
