import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../data/models/anime.dart';
import '../../features/auth/login_screen.dart';
import '../../features/details/details_screen.dart';
import '../../features/home/home_screen.dart';
import '../../features/library/library_screen.dart';
import '../../features/profile/profile_screen.dart';
import '../../features/search/search_screen.dart';
import '../../features/watch/watch_screen.dart';
import 'app_shell.dart';

final _rootKey = GlobalKey<NavigatorState>();

/// Application router. A [StatefulShellRoute] keeps each tab's navigation stack
/// alive while switching, and top-level routes (details/watch/login) push over
/// the shell full-screen.
final appRouter = GoRouter(
  navigatorKey: _rootKey,
  initialLocation: '/home',
  routes: [
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) =>
          AppShell(navigationShell: navigationShell),
      branches: [
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/home',
            builder: (_, _) => const HomeScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/search',
            builder: (_, _) => const SearchScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/library',
            builder: (_, _) => const LibraryScreen(),
          ),
        ]),
        StatefulShellBranch(routes: [
          GoRoute(
            path: '/profile',
            builder: (_, _) => const ProfileScreen(),
          ),
        ]),
      ],
    ),
    GoRoute(
      path: '/anime/:id',
      parentNavigatorKey: _rootKey,
      builder: (context, state) => DetailsScreen(
        id: state.pathParameters['id']!,
        preview: state.extra is Anime ? state.extra as Anime : null,
      ),
    ),
    GoRoute(
      path: '/watch/:id/:ep',
      parentNavigatorKey: _rootKey,
      builder: (context, state) => WatchScreen(
        animeId: state.pathParameters['id']!,
        episode: int.tryParse(state.pathParameters['ep'] ?? '1') ?? 1,
        anime: state.extra is Anime ? state.extra as Anime : null,
      ),
    ),
    GoRoute(
      path: '/login',
      parentNavigatorKey: _rootKey,
      builder: (_, _) => const LoginScreen(),
    ),
  ],
);
