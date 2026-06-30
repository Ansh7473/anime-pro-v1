import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_displaymode/flutter_displaymode.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'data/services/continue_watching.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Unlock high refresh rate (90/120/144Hz) on Android devices that throttle
  // apps to 60Hz by default. No-op / safely ignored on other platforms.
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    try {
      await FlutterDisplayMode.setHighRefreshRate();
    } catch (_) {
      // Device doesn't support mode switching — fall back to default.
    }
  }

  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      child: const WatchAnimezApp(),
    ),
  );
}

class WatchAnimezApp extends StatelessWidget {
  const WatchAnimezApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'WatchAnimez',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
      routerConfig: appRouter,
    );
  }
}
