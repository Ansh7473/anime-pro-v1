import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/api_service.dart';
import 'widgets/anime_grid_screen.dart';

class MoviesScreen extends StatefulWidget {
  const MoviesScreen({super.key});

  @override
  State<MoviesScreen> createState() => _MoviesScreenState();
}

class _MoviesScreenState extends State<MoviesScreen> {
  List<dynamic> _movies = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchMovies();
  }

  Future<void> _fetchMovies() async {
    try {
      final api = context.read<ApiService>();
      final data = await api.getMovies();
      if (!mounted) return;
      setState(() {
        _movies = data;
        _isLoading = false;
      });
    } catch (e) {
      print('Movies fetch error: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnimeGridScreen(
      title: 'ANIME MOVIES',
      isLoading: _isLoading,
      items: _movies,
    );
  }
}
