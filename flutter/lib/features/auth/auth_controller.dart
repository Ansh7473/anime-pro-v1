import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/providers/providers.dart';
import '../../data/models/user.dart';

/// Immutable auth state.
class AuthState {
  const AuthState({this.user, this.token, this.profile, this.loading = false});

  final User? user;
  final String? token;
  final Profile? profile;
  final bool loading;

  bool get isAuthenticated => token != null && user != null;

  AuthState copyWith({
    User? user,
    String? token,
    Profile? profile,
    bool? loading,
  }) =>
      AuthState(
        user: user ?? this.user,
        token: token ?? this.token,
        profile: profile ?? this.profile,
        loading: loading ?? this.loading,
      );

  static const empty = AuthState();
}

const _kAuthKey = 'wa_auth';

/// Holds the session, persists it, and exposes login/register/logout.
class AuthController extends Notifier<AuthState> {
  @override
  AuthState build() {
    _restore();
    return AuthState.empty;
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_kAuthKey);
    if (raw == null) return;
    try {
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final token = json['token'] as String?;
      final user = json['user'] is Map
          ? User.fromJson((json['user'] as Map).cast<String, dynamic>())
          : null;
      if (token != null && user != null) {
        state = state.copyWith(
          token: token,
          user: user,
          profile: user.profiles.isNotEmpty ? user.profiles.first : null,
        );
      }
    } catch (_) {
      await prefs.remove(_kAuthKey);
    }
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (!state.isAuthenticated) {
      await prefs.remove(_kAuthKey);
      return;
    }
    await prefs.setString(
      _kAuthKey,
      jsonEncode({
        'token': state.token,
        'user': {
          'id': state.user!.id,
          'email': state.user!.email,
          'name': state.user!.name,
          'profiles': state.user!.profiles.map((p) => p.toJson()).toList(),
        },
      }),
    );
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(loading: true);
    try {
      final res =
          await ref.read(apiServiceProvider).login(email, password);
      state = AuthState(
        user: res.user,
        token: res.token,
        profile: res.user.profiles.isNotEmpty ? res.user.profiles.first : null,
      );
      await _persist();
    } finally {
      if (state.loading) state = state.copyWith(loading: false);
    }
  }

  Future<void> register(String email, String password, String name) async {
    state = state.copyWith(loading: true);
    try {
      final res =
          await ref.read(apiServiceProvider).register(email, password, name);
      state = AuthState(
        user: res.user,
        token: res.token,
        profile: res.user.profiles.isNotEmpty ? res.user.profiles.first : null,
      );
      await _persist();
    } finally {
      if (state.loading) state = state.copyWith(loading: false);
    }
  }

  void switchProfile(Profile profile) {
    state = state.copyWith(profile: profile);
    _persist();
  }

  Future<void> logout() async {
    state = AuthState.empty;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kAuthKey);
  }
}

final authProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);
