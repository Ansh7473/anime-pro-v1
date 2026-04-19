import 'package:flutter/material.dart';
import '../../core/tv_focusable.dart';
import 'widgets/anime_grid_screen.dart';
import '../../services/api_service.dart';
import 'package:provider/provider.dart';

class CategoryScreen extends StatefulWidget {
  const CategoryScreen({super.key});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen> {
  final List<String> _genres = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 
    'Romance', 'Sci-Fi', 'Slice of Life', 'Supernatural', 'Thriller'
  ];
  
  String? _selectedGenre;
  List<dynamic> _items = [];
  bool _isLoading = false;

  Future<void> _fetchGenre(String genre) async {
    setState(() {
      _selectedGenre = genre;
      _isLoading = true;
    });
    try {
      final api = context.read<ApiService>();
      final data = await api.search('', page: 1, genre: genre);
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
    if (_selectedGenre == null) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        body: Padding(
          padding: const EdgeInsets.all(48.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('CATEGORIES', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: 2)),
              const SizedBox(height: 40),
              Expanded(
                child: GridView.builder(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    childAspectRatio: 3,
                    crossAxisSpacing: 20,
                    mainAxisSpacing: 20,
                  ),
                  itemCount: _genres.length,
                  itemBuilder: (context, index) {
                    final genre = _genres[index];
                    return TVFocusable(
                      onTap: () => _fetchGenre(genre),
                      child: Container(
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white12),
                        ),
                        alignment: Alignment.center,
                        child: Text(genre, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      );
    }

    return AnimeGridScreen(
      title: _selectedGenre!.toUpperCase(),
      items: _items,
      isLoading: _isLoading,
      header: IconButton(
        icon: const Icon(Icons.arrow_back),
        onPressed: () => setState(() => _selectedGenre = null),
      ),
    );
  }
}
