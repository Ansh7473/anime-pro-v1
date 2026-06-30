import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../device/device_info.dart';
import '../theme/app_colors.dart';

/// Top-level navigation destinations.
const _destinations = [
  (icon: Icons.home_rounded, label: 'Home'),
  (icon: Icons.search_rounded, label: 'Search'),
  (icon: Icons.bookmark_rounded, label: 'Library'),
  (icon: Icons.person_rounded, label: 'Profile'),
];

/// Hosts the persistent navigation chrome and the active branch. On phones it
/// renders a bottom navigation bar; on tablets/TV it renders a left
/// [NavigationRail] (better for 10-foot/remote use and landscape).
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  // Separate focus scopes for the TV rail and the page content so a remote can
  // hop between them: LEFT from the content's left edge focuses the rail, and
  // RIGHT from the rail returns to the content. Up/Down stay within each.
  final FocusScopeNode _railScope = FocusScopeNode(debugLabel: 'tvRail');
  final FocusScopeNode _contentScope = FocusScopeNode(debugLabel: 'tvContent');

  StatefulNavigationShell get navigationShell => widget.navigationShell;

  @override
  void initState() {
    super.initState();
    // Seed initial focus into the content scope so the remote has an anchor
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && DeviceInfo.isTv(context)) {
        _contentScope.requestDefaultFocus();
      }
    });

    // Safeguard: listen to focus changes. If focus gets lost completely on TV,
    // automatically recover focus on the content scope.
    FocusManager.instance.addListener(_handleFocusChange);
  }

  void _handleFocusChange() {
    if (!mounted || !DeviceInfo.isTv(context)) return;
    final primary = FocusManager.instance.primaryFocus;
    if (primary == null ||
        primary == FocusManager.instance.rootScope ||
        primary == _contentScope ||
        (_contentScope.hasFocus && _contentScope.focusedChild == null)) {
      _recoverFocus();
    }
  }

  bool _recovering = false;
  void _recoverFocus() {
    if (_recovering) return;
    _recovering = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _recovering = false;
      if (mounted) {
        final primary = FocusManager.instance.primaryFocus;
        if (primary == null ||
            primary == FocusManager.instance.rootScope ||
            primary == _contentScope ||
            (_contentScope.hasFocus && _contentScope.focusedChild == null)) {
          _contentScope.requestDefaultFocus();
        }
      }
    });
  }

  @override
  void didUpdateWidget(AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.navigationShell.currentIndex != oldWidget.navigationShell.currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && DeviceInfo.isTv(context)) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) {
              _contentScope.requestDefaultFocus();
            }
          });
        }
      });
    }
  }

  @override
  void dispose() {
    FocusManager.instance.removeListener(_handleFocusChange);
    _railScope.dispose();
    _contentScope.dispose();
    super.dispose();
  }

  void _go(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && DeviceInfo.isTv(context)) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _contentScope.requestDefaultFocus();
          }
        });
      }
    });
  }

  KeyEventResult _handleRailContentKeys(FocusNode _, KeyEvent event) {
    if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
      return KeyEventResult.ignored;
    }
    final key = event.logicalKey;
    if (key == LogicalKeyboardKey.arrowLeft) {
      if (_railScope.hasFocus) return KeyEventResult.ignored;

      final primary = FocusManager.instance.primaryFocus;
      if (primary != null) {
        // If focusing an editable text field, only allow jumping to sidebar
        // if the cursor is at the very beginning (index 0).
        final editableState = primary.context?.findAncestorStateOfType<EditableTextState>();
        if (editableState != null) {
          final selection = editableState.textEditingValue.selection;
          if (selection.baseOffset > 0) {
            return KeyEventResult.ignored;
          }
        }

        // Try to move left within the content scope.
        final scope = primary.nearestScope;
        if (scope != null) {
          final moved = scope.focusInDirection(TraversalDirection.left);
          if (!moved) {
            // No focusable widget to the left, focus the sidebar rail!
            _railScope.requestFocus();
            return KeyEventResult.handled;
          }
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    }
    if (key == LogicalKeyboardKey.arrowRight && _railScope.hasFocus) {
      _contentScope.requestDefaultFocus();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    final wide = DeviceInfo.of(context) != FormFactor.phone;
    if (wide) return _buildWide(context);
    return _buildPhone(context);
  }

  /// Tablet/TV layout: a left [NavigationRail]. On TV it is extended and wider
  /// with a brand wordmark and larger icons/labels for a 10-foot experience;
  /// on tablet it stays a compact, labelled rail.
  Widget _buildWide(BuildContext context) {
    final isTv = DeviceInfo.isTv(context);
    final selected = navigationShell.currentIndex;

    // TV: a custom rail with a clear D-pad focus ring + selected highlight,
    // because the stock NavigationRail gives almost no focus feedback on a
    // 10-foot screen (it looked "dead" with a remote).
    if (isTv) {
      return Scaffold(
        body: Focus(
          canRequestFocus: false,
          skipTraversal: true,
          onKeyEvent: _handleRailContentKeys,
          child: Row(
            children: [
              FocusScope(
                node: _railScope,
                child: _TvRail(selectedIndex: selected, onSelect: _go),
              ),
              const VerticalDivider(
                  width: 1, thickness: 1, color: AppColors.card),
              Expanded(
                child: FocusScope(node: _contentScope, child: navigationShell),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: isTv,
            minWidth: isTv ? 96 : 72,
            minExtendedWidth: 220,
            backgroundColor: AppColors.bgLite,
            selectedIndex: selected,
            onDestinationSelected: _go,
            // Extended rails always show labels beside icons; the compact
            // tablet rail shows labels beneath each icon.
            labelType:
                isTv ? NavigationRailLabelType.none : NavigationRailLabelType.all,
            indicatorColor: Colors.white24,
            useIndicator: true,
            groupAlignment: -0.85,
            selectedIconTheme: IconThemeData(
              color: AppColors.text,
              size: isTv ? 30 : 24,
            ),
            unselectedIconTheme: IconThemeData(
              color: AppColors.textMuted,
              size: isTv ? 30 : 24,
            ),
            selectedLabelTextStyle: TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w700,
              fontSize: isTv ? 16 : 12,
            ),
            unselectedLabelTextStyle: TextStyle(
              color: AppColors.textMuted,
              fontWeight: FontWeight.w500,
              fontSize: isTv ? 16 : 12,
            ),
            leading: isTv ? const _Wordmark() : null,
            destinations: _destinations
                .map((d) => NavigationRailDestination(
                      icon: Icon(d.icon),
                      label: Text(d.label),
                    ))
                .toList(),
          ),
          const VerticalDivider(width: 1, thickness: 1, color: AppColors.card),
          Expanded(child: navigationShell),
        ],
      ),
    );
  }

  /// Phone layout: the existing bottom navigation bar, themed to match.
  Widget _buildPhone(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        backgroundColor: AppColors.bgLite,
        selectedItemColor: Colors.white,
        unselectedItemColor: AppColors.textMuted,
        currentIndex: navigationShell.currentIndex,
        onTap: _go,
        items: _destinations
            .map((d) => BottomNavigationBarItem(
                  icon: Icon(d.icon),
                  label: d.label,
                ))
            .toList(),
      ),
    );
  }
}

/// 'WatchAnimez' brand wordmark shown atop the extended TV rail —
/// 'Watch' in white, 'Animez' in brand red.
class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 28),
      child: Align(
        alignment: Alignment.centerLeft,
        child: RichText(
          text: const TextSpan(
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
              height: 1.0,
            ),
            children: [
              TextSpan(text: 'Watch', style: TextStyle(color: AppColors.text)),
              TextSpan(text: 'Animez', style: TextStyle(color: AppColors.red)),
            ],
          ),
        ),
      ),
    );
  }
}



/// A 10-foot navigation rail for TV. Each destination is a focusable item with
/// an obvious red focus ring (so the remote position is always clear) and a
/// solid red pill when selected. Drives [StatefulNavigationShell.goBranch].
class _TvRail extends StatelessWidget {
  const _TvRail({required this.selectedIndex, required this.onSelect});

  final int selectedIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 200,
      color: AppColors.bgLite,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const _Wordmark(),
          const SizedBox(height: 4),
          for (var i = 0; i < _destinations.length; i++)
            _TvRailItem(
              icon: _destinations[i].icon,
              label: _destinations[i].label,
              selected: i == selectedIndex,
              autofocus: i == selectedIndex,
              onTap: () => onSelect(i),
            ),
          const Spacer(),
        ],
      ),
    );
  }
}

class _TvRailItem extends StatefulWidget {
  const _TvRailItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
    this.autofocus = false,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool autofocus;

  @override
  State<_TvRailItem> createState() => _TvRailItemState();
}

class _TvRailItemState extends State<_TvRailItem> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final active = widget.selected;
    final fg = active
        ? Colors.white
        : (_focused ? AppColors.text : AppColors.textMuted);
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
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: active
                ? Colors.white.withValues(alpha: 0.12)
                : (_focused ? Colors.white.withValues(alpha: 0.06) : Colors.transparent),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _focused
                  ? Colors.white.withValues(alpha: 0.95)
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: Row(
            children: [
              Icon(widget.icon, color: fg, size: 24),
              const SizedBox(width: 14),
              Text(
                widget.label,
                style: TextStyle(
                  color: fg,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w600,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

extension FocusScopeNodeX on FocusScopeNode {
  void requestDefaultFocus() {
    bool isChildValid = false;
    if (focusedChild != null && focusedChild!.context != null) {
      bool isOffstage = false;
      focusedChild!.context!.visitAncestorElements((element) {
        if (element.widget is Offstage) {
          final offstage = element.widget as Offstage;
          if (offstage.offstage) {
            isOffstage = true;
            return false;
          }
        }
        return true;
      });
      if (!isOffstage) {
        isChildValid = true;
      }
    }

    if (isChildValid) {
      focusedChild!.requestFocus();
    } else {
      final ctx = context;
      if (ctx != null) {
        final policy = FocusTraversalGroup.of(ctx);
        final first = policy.findFirstFocus(this);
        if (first != null) {
          first.requestFocus();
          return;
        }
      }
      requestFocus();
    }
  }
}
