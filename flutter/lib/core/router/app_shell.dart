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

/// Hosts persistent navigation chrome + active branch. On phones it
/// renders a bottom navigation bar; on tablets a NavigationRail;
/// on TV a horizontal top bar (D-pad DOWN goes straight into content).
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  final FocusScopeNode _navBarScope = FocusScopeNode(debugLabel: 'tvNavBar');
  final FocusScopeNode _contentScope = FocusScopeNode(debugLabel: 'tvContent');

  StatefulNavigationShell get navigationShell => widget.navigationShell;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && DeviceInfo.isTv(context)) {
        _contentScope.requestDefaultFocus();
      }
    });
    FocusManager.instance.addListener(_handleFocusChange);
  }

  void _handleFocusChange() {
    if (!mounted) return;
    if (!DeviceInfo.isTv(context)) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final primary = FocusManager.instance.primaryFocus;
      // Re-grab focus into content if lost
      if (primary == null || primary == FocusManager.instance.rootScope) {
        _contentScope.requestDefaultFocus();
      }
    });
  }

  @override
  void didUpdateWidget(AppShell oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.navigationShell.currentIndex !=
        oldWidget.navigationShell.currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && DeviceInfo.isTv(context)) {
          _contentScope.requestDefaultFocus();
        }
      });
    }
  }

  @override
  void dispose() {
    FocusManager.instance.removeListener(_handleFocusChange);
    _navBarScope.dispose();
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
        _contentScope.requestDefaultFocus();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final form = DeviceInfo.of(context);
    if (form == FormFactor.tv) return _buildTv(context);
    if (form == FormFactor.tablet) return _buildTablet(context);
    return _buildPhone(context);
  }

  // ─── TV: top bar + content below ───────────────────────────────────────────

  Widget _buildTv(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Content fills the whole screen (under the transparent nav bar)
          Positioned.fill(
            child: FocusTraversalGroup(
              child: FocusScope(
                node: _contentScope,
                child: _TvContentWrapper(
                  onUpAtTop: () => _navBarScope.requestDefaultFocus(),
                  child: navigationShell,
                ),
              ),
            ),
          ),
          // Nav bar overlays top
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: FocusTraversalGroup(
              policy: OrderedTraversalPolicy(),
              child: FocusScope(
                node: _navBarScope,
                child: Actions(
                  actions: {
                    DirectionalFocusIntent:
                        CallbackAction<DirectionalFocusIntent>(
                          onInvoke: (intent) {
                            // Drop focus back to content on DOWN
                            if (intent.direction == TraversalDirection.down) {
                              _contentScope.requestDefaultFocus();
                              return null;
                            }
                            // Navigate LEFT/RIGHT within nav bar
                            final primary = FocusManager.instance.primaryFocus;
                            if (primary != null) {
                              FocusTraversalGroup.of(
                                primary.context!,
                              ).inDirection(primary, intent.direction);
                            }
                            return null;
                          },
                        ),
                  },
                  child: Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black87,
                          Colors.black54,
                          Colors.transparent,
                        ],
                        stops: [0.0, 0.7, 1.0],
                      ),
                    ),
                    child: SafeArea(
                      bottom: false,
                      child: _TvTopBar(
                        selectedIndex: navigationShell.currentIndex,
                        onSelect: _go,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Tablet: NavigationRail ────────────────────────────────────────────────

  Widget _buildTablet(BuildContext context) {
    final selected = navigationShell.currentIndex;
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            minWidth: 72,
            backgroundColor: AppColors.bgLite,
            selectedIndex: selected,
            onDestinationSelected: _go,
            labelType: NavigationRailLabelType.all,
            indicatorColor: Colors.white24,
            useIndicator: true,
            groupAlignment: -0.85,
            selectedIconTheme: const IconThemeData(
              color: AppColors.text,
              size: 24,
            ),
            unselectedIconTheme: const IconThemeData(
              color: AppColors.textMuted,
              size: 24,
            ),
            selectedLabelTextStyle: const TextStyle(
              color: AppColors.text,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
            unselectedLabelTextStyle: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
            ),
            destinations: _destinations
                .map(
                  (d) => NavigationRailDestination(
                    icon: Icon(d.icon),
                    label: Text(d.label),
                  ),
                )
                .toList(),
          ),
          const VerticalDivider(width: 1, thickness: 1, color: AppColors.card),
          Expanded(child: navigationShell),
        ],
      ),
    );
  }

  // ─── Phone: bottom nav bar ─────────────────────────────────────────────────

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
            .map(
              (d) =>
                  BottomNavigationBarItem(icon: Icon(d.icon), label: d.label),
            )
            .toList(),
      ),
    );
  }
}

// ─── TV Content Wrapper ─────────────────────────────────────────────────────

/// Intercepts D-pad UP at the top edge of content and moves focus to nav bar.
class _TvContentWrapper extends StatelessWidget {
  const _TvContentWrapper({required this.onUpAtTop, required this.child});

  final VoidCallback onUpAtTop;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Focus(
      canRequestFocus: false,
      onKeyEvent: (node, event) {
        if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
          return KeyEventResult.ignored;
        }
        // Only intercept UP when at the top of content — pass to nav bar.
        if (event.logicalKey != LogicalKeyboardKey.arrowUp) {
          return KeyEventResult.ignored;
        }
        final current = FocusManager.instance.primaryFocus;
        if (current == null) return KeyEventResult.ignored;
        final moved = FocusTraversalGroup.of(
          current.context!,
        ).inDirection(current, TraversalDirection.up);
        if (!moved) {
          onUpAtTop();
          return KeyEventResult.handled;
        }
        return KeyEventResult.handled;
      },
      child: child,
    );
  }
}

// ─── TV Top Bar ──────────────────────────────────────────────────────────────

/// Horizontal top navigation bar for TV. D-pad LEFT/RIGHT switches tabs,
/// DOWN goes straight into page content — no sidebar focus confusion.
class _TvTopBar extends StatelessWidget {
  const _TvTopBar({required this.selectedIndex, required this.onSelect});

  final int selectedIndex;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
      child: Row(
        children: [
          const _Wordmark(),
          const SizedBox(width: 40),
          for (var i = 0; i < _destinations.length; i++) ...[
            _TvTopBarItem(
              icon: _destinations[i].icon,
              label: _destinations[i].label,
              selected: i == selectedIndex,
              onTap: () => onSelect(i),
            ),
            if (i < _destinations.length - 1) const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

/// 'WatchAnimez' brand wordmark — 'Watch' in white, 'Animez' in red.
class _Wordmark extends StatelessWidget {
  const _Wordmark();

  @override
  Widget build(BuildContext context) {
    return RichText(
      text: const TextSpan(
        style: TextStyle(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          letterSpacing: -0.3,
          height: 1.0,
        ),
        children: [
          TextSpan(
            text: 'Watch',
            style: TextStyle(color: AppColors.text),
          ),
          TextSpan(
            text: 'Animez',
            style: TextStyle(color: AppColors.red),
          ),
        ],
      ),
    );
  }
}

class _TvTopBarItem extends StatefulWidget {
  const _TvTopBarItem({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_TvTopBarItem> createState() => _TvTopBarItemState();
}

class _TvTopBarItemState extends State<_TvTopBarItem> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final active = widget.selected;
    final fg = active
        ? Colors.white
        : (_focused ? AppColors.text : AppColors.textMuted);
    return FocusableActionDetector(
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
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
        borderRadius: BorderRadius.circular(8),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: active
                ? Colors.white.withValues(alpha: 0.12)
                : (_focused
                      ? Colors.white.withValues(alpha: 0.06)
                      : Colors.transparent),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _focused
                  ? Colors.white.withValues(alpha: 0.9)
                  : Colors.transparent,
              width: 2,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon, color: fg, size: 20),
              const SizedBox(width: 8),
              Text(
                widget.label,
                style: TextStyle(
                  color: fg,
                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Focus utilities ─────────────────────────────────────────────────────────

extension FocusScopeNodeX on FocusScopeNode {
  void requestDefaultFocus() {
    bool isChildValid = false;
    if (focusedChild != null && focusedChild!.context != null) {
      bool isOffstage = false;
      focusedChild!.context!.visitAncestorElements((element) {
        if (element.widget is Offstage &&
            (element.widget as Offstage).offstage) {
          isOffstage = true;
          return false;
        }
        return true;
      });
      isChildValid = !isOffstage;
    }

    if (isChildValid) {
      focusedChild!.requestFocus();
    } else {
      // Find the first focusable, non-skipped descendant.
      for (final child in children) {
        if (child.canRequestFocus && !child.skipTraversal) {
          child.requestFocus();
          return;
        }
      }
      // No direct child is focusable — try descending into scopes.
      for (final child in children) {
        if (child is FocusScopeNode && child.children.isNotEmpty) {
          child.requestDefaultFocus();
          return;
        }
      }
      // Last resort: focus the scope itself.
      requestFocus();
    }
  }
}
