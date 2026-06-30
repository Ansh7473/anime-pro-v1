/// A viewing profile under an account (Netflix-style multi-profile).
class Profile {
  const Profile({
    required this.id,
    required this.name,
    this.avatar,
    this.autoNext = true,
    this.autoSkip = false,
    this.language = 'sub',
  });

  final String id;
  final String name;
  final String? avatar;
  final bool autoNext;
  final bool autoSkip;
  final String language;

  factory Profile.fromJson(Map<String, dynamic> j) => Profile(
        id: (j['id'] ?? '').toString(),
        name: (j['name'] ?? 'Profile').toString(),
        avatar: j['avatar']?.toString(),
        autoNext: j['autoNext'] != false,
        autoSkip: j['autoSkip'] == true,
        language: (j['language'] ?? 'sub').toString(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'avatar': avatar,
        'autoNext': autoNext,
        'autoSkip': autoSkip,
        'language': language,
      };
}

/// An authenticated account.
class User {
  const User({
    required this.id,
    required this.email,
    this.name,
    this.profiles = const [],
  });

  final String id;
  final String email;
  final String? name;
  final List<Profile> profiles;

  factory User.fromJson(Map<String, dynamic> j) {
    final rawProfiles = j['profiles'];
    final profiles = <Profile>[];
    if (rawProfiles is List) {
      for (final p in rawProfiles.whereType<Map>()) {
        profiles.add(Profile.fromJson(p.cast<String, dynamic>()));
      }
    }
    return User(
      id: (j['id'] ?? '').toString(),
      email: (j['email'] ?? '').toString(),
      name: j['name']?.toString(),
      profiles: profiles,
    );
  }
}

/// Result of a successful login/register call.
class AuthResult {
  const AuthResult({required this.user, required this.token});
  final User user;
  final String token;
}
