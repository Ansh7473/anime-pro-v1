import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import 'widgets/anime_grid_screen.dart';

class FavoritesScreen extends StatefulWidget {
  const FavoritesScreen({super.key});

  @override
  State<FavoritesScreen> createState() => _FavoritesScreenState();
}

class _FavoritesScreenState extends State<FavoritesScreen> {
  List<dynamic> _favorites = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchFavorites();
  }

  Future<void> _fetchFavorites() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) {
      setState(() => _isLoading = false);
      return;
    }

    try {
      final api = context.read<ApiService>();
      final data = await api.getFavorites(auth.token!);
      if (!mounted) return;
      setState(() {
        _favorites = data;
        _isLoading = false;
      });
    } catch (e) {
      print('Favorites fetch error: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.read<AuthProvider>();
    
    if (!auth.isAuthenticated) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.lock_outline, size: 80, color: Colors.white24),
            SizedBox(height: 16),
            Text('Login to view your Favorites', style: TextStyle(color: Colors.white70, fontSize: 18)),
          ],
        ),
      );
    }

    return AnimeGridScreen(
      title: 'YOUR FAVORITES',
      isLoading: _isLoading,
      items: _favorites,
    );
  }
}
