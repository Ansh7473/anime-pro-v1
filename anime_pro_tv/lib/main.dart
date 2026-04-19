import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'src/core/theme.dart';
import 'src/features/home/home_screen.dart';
import 'src/features/auth/login_screen.dart';
import 'src/services/api_service.dart';
import 'src/services/auth_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        Provider(create: (_) => ApiService()),
      ],
      child: const AnimeProApp(),
    ),
  );
}

class AnimeProApp extends StatelessWidget {
  const AnimeProApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AnimePro TV',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: const HomeScreen(),
    );
  }
}
