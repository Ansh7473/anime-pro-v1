import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import '../../core/tv_focusable.dart';
import 'widgets/anime_row.dart';
import 'widgets/hero_banner.dart';
import '../auth/login_screen.dart';
import '../search/search_screen.dart';
import 'movies_screen.dart';
import 'favorites_screen.dart';
import 'watchlist_screen.dart';
import 'category_screen.dart';
import 'settings_screen.dart';
import '../../services/auth_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 1; // Default to 'Home'
  Map<String, List<dynamic>> _homeData = {};
  List<dynamic> _history = [];
  bool _isLoading = true;
  String? _error;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchHomeData();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchHomeData() async {
    try {
      final api = context.read<ApiService>();
      final auth = context.read<AuthProvider>();
      
      final homeResponse = await api.getHome();
      List<dynamic> historyResponse = [];
      
      if (auth.isAuthenticated) {
        historyResponse = await api.getWatchHistory(auth.token!);
      }

      if (!mounted) return;
      setState(() {
        _homeData = Map<String, List<dynamic>>.from(homeResponse ?? {});
        _history = historyResponse;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F0F0F),
      body: Row(
        children: [
          _buildSidebar(),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 80, // Reduced from 100
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.8),
        border: const Border(right: BorderSide(color: Colors.white10, width: 1)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildSidebarItem(0, Icons.search_rounded, 'SEARCH'),
          _buildSidebarItem(1, Icons.home_rounded, 'HOME'),
          _buildSidebarItem(2, Icons.movie_outlined, 'MOVIES'),
          _buildSidebarItem(5, Icons.grid_view_rounded, 'GENRES'),
          _buildSidebarItem(6, Icons.bookmark_outline_rounded, 'WATCHLIST'),
          _buildSidebarItem(3, Icons.favorite_border_rounded, 'FAVES'),
          _buildSidebarItem(4, Icons.settings_outlined, 'SETTINGS'),
        ],
      ),
    );
  }

  Widget _buildSidebarItem(int index, IconData icon, String label) {
    final isSelected = _selectedIndex == index;
    return TVFocusable(
      onTap: () {
        if (_selectedIndex == index && index == 1) {
          // If already on Home, scroll to top
          if (_scrollController.hasClients) {
            _scrollController.animateTo(0, duration: const Duration(milliseconds: 500), curve: Curves.easeOut);
          }
        }
        setState(() => _selectedIndex = index);
      },
      child: Container(
        height: 70, // Reduced from 80
        width: 80,
        decoration: BoxDecoration(
          border: isSelected ? const Border(left: BorderSide(color: Colors.red, width: 3)) : null,
          color: isSelected ? Colors.red.withOpacity(0.1) : Colors.transparent,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: isSelected ? Colors.red : Colors.grey[400], size: 22), // Reduced from 28
            const SizedBox(height: 4),
            Text(
              label, 
              style: TextStyle(
                color: isSelected ? Colors.red : Colors.grey[400], 
                fontSize: 8, // Reduced from 10
                fontWeight: FontWeight.bold,
                letterSpacing: 0.5
              )
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    switch (_selectedIndex) {
      case 0: return const SearchScreen();
      case 1: return _buildHomeContent();
      case 2: return const MoviesScreen();
      case 3: return const FavoritesScreen();
      case 4: return const SettingsScreen();
      case 5: return const CategoryScreen();
      case 6: return const WatchlistScreen();
      default: return _buildHomeContent();
    }
  }

  Widget _buildHomeContent() {
    if (_isLoading) return const Center(child: CircularProgressIndicator(color: Colors.red));
    if (_error != null) return Center(child: Text('Error: $_error', style: const TextStyle(color: Colors.red)));

    return RefreshIndicator(
      onRefresh: _fetchHomeData,
      child: ListView(
        controller: _scrollController,
        padding: EdgeInsets.zero,
        children: [
          if (_homeData.containsKey('trending') && _homeData['trending']!.isNotEmpty)
            HeroBanner(
              animeList: _homeData['trending']!,
              onFocus: () {
                _scrollController.animateTo(0, duration: const Duration(milliseconds: 600), curve: Curves.easeOutCubic);
              },
            ),
          
          if (_history.isNotEmpty) ...[
            const SizedBox(height: 20),
            AnimeRow(title: '⏳ CONTINUE WATCHING', items: _history),
          ],
          
          const SizedBox(height: 20),
          
          if (_homeData.containsKey('trending'))
            AnimeRow(title: '🔥 TRENDING NOW', items: _homeData['trending']!),
          
          if (_homeData.containsKey('popular'))
            AnimeRow(title: '⭐ MOST POPULAR', items: _homeData['popular']!),

          if (_homeData.containsKey('topRated'))
            AnimeRow(title: '🏆 TOP RATED', items: _homeData['topRated']!),
          
          if (_homeData.containsKey('movies'))
            AnimeRow(title: '🎬 NEW MOVIES', items: _homeData['movies']!),

          if (_homeData.containsKey('action'))
            AnimeRow(title: '⚔️ ACTION PACKED', items: _homeData['action']!),

          if (_homeData.containsKey('romance'))
            AnimeRow(title: '💖 ROMANCE & SLICE OF LIFE', items: _homeData['romance']!),
          
          const SizedBox(height: 40),
        ],
      ),
    );
  }
}
