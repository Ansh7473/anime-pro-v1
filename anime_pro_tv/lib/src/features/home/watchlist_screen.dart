import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import 'widgets/anime_grid_screen.dart';

class WatchlistScreen extends StatefulWidget {
  const WatchlistScreen({super.key});

  @override
  State<WatchlistScreen> createState() => _WatchlistScreenState();
}

class _WatchlistScreenState extends State<WatchlistScreen> {
  List<dynamic> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchWatchlist();
  }

  Future<void> _fetchWatchlist() async {
    try {
      final auth = context.read<AuthProvider>();
      if (!auth.isAuthenticated) {
        setState(() => _isLoading = false);
        return;
      }
      final api = context.read<ApiService>();
      final data = await api.getWatchlist(auth.token!);
      if (!mounted) return;
      setState(() {
        _items = data;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    
    if (!auth.isAuthenticated) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.lock_outline_rounded, size: 80, color: Colors.white24),
              const SizedBox(height: 24),
              const Text(
                'LOGIN REQUIRED',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 2),
              ),
              const SizedBox(height: 12),
              const Text(
                'Please sign in to view and manage your watchlist.',
                style: TextStyle(color: Colors.white54, fontSize: 16),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  // This should ideally navigate to login, but since it's a Sidebar-based app,
                  // we might want to tell the user to use the sidebar if there's a Profile item.
                  // For now, let's assume Sidebar index 4 is settings/profile.
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('GO TO LOGIN', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      );
    }

    return AnimeGridScreen(
      title: 'MY WATCHLIST',
      items: _items,
      isLoading: _isLoading,
    );
  }
}
