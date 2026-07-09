import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/device/device_info.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/user.dart';
import '../auth/auth_controller.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  // Local, cosmetic overrides for the playback switches. Null means "fall back
  // to the active profile's stored value". Reset whenever the active profile
  // changes so the switches always reflect the selected profile by default.
  bool? _autoNext;
  bool? _autoSkip;
  String? _trackedProfileId;

  void _syncToProfile(Profile? profile) {
    if (profile?.id != _trackedProfileId) {
      _trackedProfileId = profile?.id;
      _autoNext = null;
      _autoSkip = null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    _syncToProfile(auth.profile);
    final isTv = DeviceInfo.isTv(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: isTv
          ? null
          : AppBar(
              backgroundColor: AppColors.bg,
              elevation: 0,
              title: const Text('Profile'),
            ),
      body: auth.isAuthenticated
          ? _SignedInView(
              auth: auth,
              autoNext: _autoNext ?? auth.profile?.autoNext ?? true,
              autoSkip: _autoSkip ?? auth.profile?.autoSkip ?? false,
              onAutoNextChanged: (v) => setState(() => _autoNext = v),
              onAutoSkipChanged: (v) => setState(() => _autoSkip = v),
              onSwitchProfile: (p) =>
                  ref.read(authProvider.notifier).switchProfile(p),
              onSignOut: () => ref.read(authProvider.notifier).logout(),
            )
          : const _SignedOutView(),
    );
  }
}

class _SignedOutView extends StatelessWidget {
  const _SignedOutView();

  @override
  Widget build(BuildContext context) {
    final isTv = DeviceInfo.isTv(context);
    return Center(
      child: Padding(
        padding: EdgeInsets.all(isTv ? 48 : 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: isTv ? 112 : 96,
              height: isTv ? 112 : 96,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: AppColors.card,
              ),
              child: Icon(
                Icons.person_outline,
                size: isTv ? 56 : 48,
                color: AppColors.textMuted,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Sign in to sync your watchlist & history',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.text,
                fontSize: isTv ? 20 : 16,
                fontWeight: FontWeight.w600,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Your profiles, progress and preferences, everywhere.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: AppColors.textMuted,
                fontSize: isTv ? 16 : 13,
              ),
            ),
            const SizedBox(height: 28),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                autofocus: isTv,
                onPressed: () => context.push('/login'),
                style: FilledButton.styleFrom(
                  backgroundColor: Colors.white,
                  foregroundColor: Colors.black,
                  padding: EdgeInsets.symmetric(vertical: isTv ? 18 : 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                child: Text(
                  'Sign in',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: isTv ? 18 : 15,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SignedInView extends StatelessWidget {
  const _SignedInView({
    required this.auth,
    required this.autoNext,
    required this.autoSkip,
    required this.onAutoNextChanged,
    required this.onAutoSkipChanged,
    required this.onSwitchProfile,
    required this.onSignOut,
  });

  final AuthState auth;
  final bool autoNext;
  final bool autoSkip;
  final ValueChanged<bool> onAutoNextChanged;
  final ValueChanged<bool> onAutoSkipChanged;
  final ValueChanged<Profile> onSwitchProfile;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) {
    final isTv = DeviceInfo.isTv(context);
    final user = auth.user;
    if (user == null) {
      return const _SignedOutView();
    }
    final displayName = (user.name?.trim().isNotEmpty ?? false)
        ? user.name!.trim()
        : user.email;
    final hasProfiles = user.profiles.isNotEmpty;

    return ListView(
      padding: EdgeInsets.fromLTRB(
        isTv ? 48 : 20,
        isTv ? 20 : 12,
        isTv ? 48 : 20,
        32,
      ),
      children: [
        if (isTv) ...[
          const SizedBox(height: 60), // Clear TV top nav rail
          const Text(
            'Profile',
            style: TextStyle(
              fontSize: 32,
              fontWeight: FontWeight.w800,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 24),
        ],
        _HeaderCard(
          name: displayName,
          email: user.email,
          avatar: auth.profile?.avatar,
          isTv: isTv,
        ),
        if (hasProfiles) ...[
          SizedBox(height: isTv ? 36 : 28),
          _SectionLabel('Who\'s watching', isTv: isTv),
          SizedBox(height: isTv ? 18 : 14),
          SizedBox(
            height: isTv ? 128 : 96,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: user.profiles.length,
              separatorBuilder: (_, _) => SizedBox(width: isTv ? 20 : 16),
              itemBuilder: (context, i) {
                final p = user.profiles[i];
                return _ProfileAvatar(
                  profile: p,
                  selected: p.id == auth.profile?.id,
                  onTap: () => onSwitchProfile(p),
                  isTv: isTv,
                  autofocus: isTv && i == 0,
                );
              },
            ),
          ),
        ],
        SizedBox(height: isTv ? 36 : 28),
        _SectionLabel('Playback', isTv: isTv),
        SizedBox(height: isTv ? 16 : 12),
        _SettingsGroup(
          children: [
            _SwitchTile(
              icon: Icons.skip_next_rounded,
              title: 'Auto-play next',
              subtitle: 'Continue to the next episode automatically',
              value: autoNext,
              onChanged: onAutoNextChanged,
              isTv: isTv,
              autofocus: isTv && !hasProfiles,
            ),
            const _TileDivider(),
            _SwitchTile(
              icon: Icons.fast_forward_rounded,
              title: 'Auto-skip intros',
              subtitle: 'Skip openings and recaps when detected',
              value: autoSkip,
              onChanged: onAutoSkipChanged,
              isTv: isTv,
            ),
          ],
        ),
        SizedBox(height: isTv ? 32 : 24),
        _SectionLabel('More', isTv: isTv),
        SizedBox(height: isTv ? 16 : 12),
        _SettingsGroup(
          children: [
            _NavTile(
              icon: Icons.manage_accounts_rounded,
              title: 'Account',
              subtitle: user.email,
              onTap: () {},
              isTv: isTv,
            ),
            const _TileDivider(),
            _NavTile(
              icon: Icons.info_outline_rounded,
              title: 'About WatchAnimez',
              subtitle: 'Version 1.0.0',
              isTv: isTv,
            ),
          ],
        ),
        SizedBox(height: isTv ? 40 : 32),
        _SignOutButton(onSignOut: onSignOut, isTv: isTv),
      ],
    );
  }
}

class _HeaderCard extends StatelessWidget {
  const _HeaderCard({
    required this.name,
    required this.email,
    this.avatar,
    this.isTv = false,
  });

  final String name;
  final String email;
  final String? avatar;
  final bool isTv;

  @override
  Widget build(BuildContext context) {
    final hasImage = avatar != null && avatar!.startsWith('http');
    final initial = _initialOf(name.isNotEmpty ? name : email);
    final avatarSize = isTv ? 78.0 : 64.0;

    return Container(
      padding: EdgeInsets.all(isTv ? 22 : 18),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Container(
            width: avatarSize,
            height: avatarSize,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: hasImage
                  ? null
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFF2E2E2E), Color(0xFF1F1F1F)],
                    ),
              image: hasImage
                  ? DecorationImage(
                      image: NetworkImage(avatar!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            alignment: Alignment.center,
            child: hasImage
                ? null
                : Text(
                    initial,
                    style: TextStyle(
                      color: AppColors.text,
                      fontSize: isTv ? 32 : 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
          ),
          SizedBox(width: isTv ? 20 : 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.text,
                    fontSize: isTv ? 22 : 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.textMuted,
                    fontSize: isTv ? 15 : 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileAvatar extends StatefulWidget {
  const _ProfileAvatar({
    required this.profile,
    required this.selected,
    required this.onTap,
    this.isTv = false,
    this.autofocus = false,
  });

  final Profile profile;
  final bool selected;
  final VoidCallback onTap;
  final bool isTv;
  final bool autofocus;

  @override
  State<_ProfileAvatar> createState() => _ProfileAvatarState();
}

class _ProfileAvatarState extends State<_ProfileAvatar> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final profile = widget.profile;
    final selected = widget.selected;
    final isTv = widget.isTv;
    final hasImage =
        profile.avatar != null && profile.avatar!.startsWith('http');
    final size = isTv ? 72.0 : 56.0;
    final ringColor = _focused
        ? Colors.white
        : (selected ? Colors.white.withValues(alpha: 0.7) : Colors.transparent);

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
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(16),
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: SizedBox(
            width: isTv ? 88 : 64,
            child: Column(
              children: [
                Container(
                  width: size,
                  height: size,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.cardHover,
                    gradient: hasImage
                        ? null
                        : const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [Color(0xFF2E2E2E), Color(0xFF1F1F1F)],
                          ),
                    image: hasImage
                        ? DecorationImage(
                            image: NetworkImage(profile.avatar!),
                            fit: BoxFit.cover,
                          )
                        : null,
                    border: Border.all(color: ringColor, width: 2.5),
                    boxShadow: _focused
                        ? [
                            BoxShadow(
                              color: Colors.white.withValues(alpha: 0.15),
                              blurRadius: 16,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: hasImage
                      ? null
                      : Text(
                          _initialOf(profile.name),
                          style: TextStyle(
                            color: AppColors.text,
                            fontSize: isTv ? 28 : 22,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                ),
                SizedBox(height: isTv ? 10 : 8),
                Text(
                  profile.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: (selected || _focused)
                        ? AppColors.text
                        : AppColors.textMuted,
                    fontSize: isTv ? 14 : 12,
                    fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
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

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text, {this.isTv = false});

  final String text;
  final bool isTv;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: TextStyle(
        color: AppColors.textMuted,
        fontSize: isTv ? 14 : 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 1.1,
      ),
    );
  }
}

class _SettingsGroup extends StatelessWidget {
  const _SettingsGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(children: children),
    );
  }
}

class _TileDivider extends StatelessWidget {
  const _TileDivider();

  @override
  Widget build(BuildContext context) {
    return const Divider(
      height: 1,
      thickness: 1,
      indent: 56,
      color: AppColors.bgLite,
    );
  }
}

class _SwitchTile extends StatefulWidget {
  const _SwitchTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
    this.isTv = false,
    this.autofocus = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;
  final bool isTv;
  final bool autofocus;

  @override
  State<_SwitchTile> createState() => _SwitchTileState();
}

class _SwitchTileState extends State<_SwitchTile> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final isTv = widget.isTv;
    final tile = SwitchListTile.adaptive(
      value: widget.value,
      onChanged: widget.onChanged,
      activeThumbColor: AppColors.text,
      activeTrackColor: Colors.white54,
      inactiveThumbColor: AppColors.textMuted,
      inactiveTrackColor: AppColors.cardHover,
      contentPadding: EdgeInsets.symmetric(
        horizontal: isTv ? 20 : 16,
        vertical: isTv ? 8 : 4,
      ),
      secondary: Icon(widget.icon, color: Colors.white, size: isTv ? 28 : 24),
      title: Text(
        widget.title,
        style: TextStyle(
          color: AppColors.text,
          fontWeight: FontWeight.w600,
          fontSize: isTv ? 18 : 15,
        ),
      ),
      subtitle: Text(
        widget.subtitle,
        style: TextStyle(color: AppColors.textMuted, fontSize: isTv ? 14 : 12),
      ),
    );

    if (!isTv) return tile;

    return FocusableActionDetector(
      autofocus: widget.autofocus,
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onChanged(!widget.value);
            return null;
          },
        ),
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: _focused ? AppColors.cardHover : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _focused ? Colors.white : Colors.transparent,
            width: 2.5,
          ),
          boxShadow: _focused
              ? [
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.15),
                    blurRadius: 14,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: tile,
      ),
    );
  }
}

class _NavTile extends StatefulWidget {
  const _NavTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
    this.isTv = false,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;
  final bool isTv;

  @override
  State<_NavTile> createState() => _NavTileState();
}

class _NavTileState extends State<_NavTile> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final isTv = widget.isTv;
    final tile = ListTile(
      onTap: widget.onTap,
      contentPadding: EdgeInsets.symmetric(
        horizontal: isTv ? 20 : 16,
        vertical: isTv ? 8 : 4,
      ),
      leading: Icon(widget.icon, color: Colors.white, size: isTv ? 28 : 24),
      title: Text(
        widget.title,
        style: TextStyle(
          color: AppColors.text,
          fontWeight: FontWeight.w600,
          fontSize: isTv ? 18 : 15,
        ),
      ),
      subtitle: Text(
        widget.subtitle,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(color: AppColors.textMuted, fontSize: isTv ? 14 : 12),
      ),
      trailing: widget.onTap == null
          ? null
          : Icon(
              Icons.chevron_right_rounded,
              color: AppColors.textMuted,
              size: isTv ? 28 : 24,
            ),
    );

    if (!isTv) return tile;

    return FocusableActionDetector(
      autofocus: false,
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onTap?.call();
            return null;
          },
        ),
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color: _focused ? AppColors.cardHover : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _focused ? Colors.white : Colors.transparent,
            width: 2.5,
          ),
          boxShadow: _focused
              ? [
                  BoxShadow(
                    color: Colors.white.withValues(alpha: 0.15),
                    blurRadius: 14,
                    spreadRadius: 1,
                  ),
                ]
              : null,
        ),
        child: tile,
      ),
    );
  }
}

/// Sign-out control. Stock outlined button on touch devices; a large
/// D-pad-focusable red-ringed row on TV.
class _SignOutButton extends StatefulWidget {
  const _SignOutButton({required this.onSignOut, this.isTv = false});

  final VoidCallback onSignOut;
  final bool isTv;

  @override
  State<_SignOutButton> createState() => _SignOutButtonState();
}

class _SignOutButtonState extends State<_SignOutButton> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    if (!widget.isTv) {
      return OutlinedButton.icon(
        onPressed: widget.onSignOut,
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.white,
          side: const BorderSide(color: Colors.white54),
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
        icon: const Icon(Icons.logout_rounded, size: 20),
        label: const Text(
          'Sign out',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
      );
    }

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
            widget.onSignOut();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onSignOut,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedScale(
          scale: _focused ? 1.03 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(vertical: 18),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _focused
                  ? Colors.white.withValues(alpha: 0.12)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: _focused ? Colors.white : Colors.white24,
                width: 2.5,
              ),
              boxShadow: _focused
                  ? [
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
                Icon(
                  Icons.logout_rounded,
                  size: 22,
                  color: _focused ? Colors.white : Colors.white70,
                ),
                const SizedBox(width: 10),
                Text(
                  'Sign out',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                    color: _focused ? Colors.white : Colors.white70,
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

String _initialOf(String value) {
  final trimmed = value.trim();
  if (trimmed.isEmpty) return '?';
  return trimmed.characters.first.toUpperCase();
}
