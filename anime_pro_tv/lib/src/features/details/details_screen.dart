import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:glassmorphism/glassmorphism.dart';
import '../../core/image_utils.dart';
import '../../services/api_service.dart';
import '../../services/auth_provider.dart';
import '../../core/tv_focusable.dart';
import '../player/player_screen.dart';

class DetailsScreen extends StatefulWidget {
  final String animeId;

  const DetailsScreen({super.key, required this.animeId});

  @override
  State<DetailsScreen> createState() => _DetailsScreenState();
}

class _DetailsScreenState extends State<DetailsScreen> {
  dynamic _animeDetails;
  List<dynamic>? _episodes;
  bool _isLoading = true;
  bool _isFavorite = false;
  bool _inWatchlist = false;
  String? _watchlistStatus;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    try {
      final api = context.read<ApiService>();
      final auth = context.read<AuthProvider>();
      
      final details = await api.getAnimeDetails(widget.animeId);
      final episodes = await api.getEpisodes(widget.animeId);
      
      bool favorite = false;
      bool watchlist = false;
      String? status;

      if (auth.isAuthenticated) {
        favorite = await api.getFavoriteStatus(auth.token!, widget.animeId);
        final wlData = await api.getWatchlistStatus(auth.token!, widget.animeId);
        watchlist = wlData['inWatchlist'] ?? false;
        status = wlData['status'];
      }

      if (!mounted) return;
      setState(() {
        _animeDetails = details;
        _episodes = episodes;
        _isFavorite = favorite;
        _inWatchlist = watchlist;
        _watchlistStatus = status;
        _isLoading = false;
      });
    } catch (e) {
      print('Error fetching details: $e');
      if (!mounted) return;
      setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleFavorite() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) return;
    
    final api = context.read<ApiService>();
    final data = {
      'animeId': widget.animeId,
      'animeTitle': _animeDetails['title'] ?? 'Unknown',
      'animePoster': _animeDetails['poster'] ?? _animeDetails['image'] ?? '',
      'profileId': 0, // Default profile
    };

    try {
      await api.toggleFavorite(auth.token!, data, _isFavorite);
      setState(() => _isFavorite = !_isFavorite);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  Future<void> _toggleWatchlist() async {
    final auth = context.read<AuthProvider>();
    if (!auth.isAuthenticated) return;

    final api = context.read<ApiService>();
    try {
      if (_inWatchlist) {
        await api.removeFromWatchlist(auth.token!, widget.animeId);
        setState(() {
          _inWatchlist = false;
          _watchlistStatus = null;
        });
      } else {
        final data = {
          'animeId': widget.animeId,
          'animeTitle': _animeDetails['title'] ?? 'Unknown',
          'animePoster': _animeDetails['poster'] ?? _animeDetails['image'] ?? '',
          'status': 'PLANNING',
        };
        await api.addToWatchlist(auth.token!, data);
        setState(() {
          _inWatchlist = true;
          _watchlistStatus = 'PLANNING';
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator(color: Colors.red)));
    }

    if (_animeDetails == null) {
      return const Scaffold(body: Center(child: Text('Failed to load anime details')));
    }

    final String title = _animeDetails['title']?.toString() ?? 'Unknown';

    final banner = _animeDetails['bannerImage'] ?? _animeDetails['image'] ?? _animeDetails['poster'] ?? '';
    final description = (_animeDetails['description'] ?? '').toString().replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), '');

    return Scaffold(
      body: Stack(
        children: [
          // Background Backdrop
          Positioned.fill(
            child: Opacity(
              opacity: 0.3,
              child: banner.toString().isNotEmpty 
                ? CachedNetworkImage(
                    imageUrl: ImageUtils.getProxiedUrl(banner.toString()),
                    fit: BoxFit.cover,
                    errorWidget: (context, url, error) => Container(color: Colors.black),
                  )
                : Container(color: Colors.black),
            ),
          ),
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Colors.black],
              ),
            ),
          ),
          // Content
          CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.all(48),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),
                      // BACK BUTTON
                      TVFocusable(
                        autofocus: true,
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(Icons.arrow_back, color: Colors.white, size: 24),
                              SizedBox(width: 12),
                              Text('BACK', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 48),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Poster
                          ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: (_animeDetails['poster'] != null || _animeDetails['image'] != null)
                              ? CachedNetworkImage(
                                  imageUrl: ImageUtils.getProxiedUrl(_animeDetails['image'] ?? _animeDetails['poster']),
                                  width: 250, // Reduced from 280
                                  height: 375, // Scaled down
                                  fit: BoxFit.cover,
                                  errorWidget: (context, url, _) => Container(color: Colors.white10, width: 250, height: 375, child: const Icon(Icons.movie, size: 48)),
                                )
                              : Container(color: Colors.white10, width: 250, height: 375, child: const Icon(Icons.movie, size: 48)),
                          ),
                          const SizedBox(width: 48), // Reduced from 64
                          // Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  title,
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(fontSize: 42, fontWeight: FontWeight.w900, height: 1.1),
                                ),
                                const SizedBox(height: 16),
                                // META BAR
                                Row(
                                  children: [
                                    if (_animeDetails['score'] != null)
                                      _buildMetadataChip(Icons.star, _animeDetails['score'].toString(), Colors.amber),
                                    const SizedBox(width: 16),
                                    _buildMetadataChip(Icons.calendar_today, _animeDetails['year']?.toString() ?? '2024', Colors.white70),
                                    const SizedBox(width: 16),
                                    _buildMetadataChip(Icons.movie, _animeDetails['type']?.toString() ?? 'TV', Colors.white70),
                                  ],
                                ),
                                const SizedBox(height: 16),
                                // GENRES
                                if (_animeDetails['genres'] != null)
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: (_animeDetails['genres'] as List).take(4).map<Widget>((g) {
                                      String label = g is String ? g : (g is Map ? (g['NAME'] ?? g['name'] ?? g.toString()) : g.toString());
                                      return _buildGenreChip(label);
                                    }).toList(),
                                  ),
                                const SizedBox(height: 24),
                                Text(
                                  description,
                                  maxLines: 4, // Reduced from 6
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(color: Colors.white70, fontSize: 16, height: 1.5, fontWeight: FontWeight.w300),
                                ),
                                const SizedBox(height: 32),
                                // ACTION BUTTONS
                                Row(
                                  children: [
                                    if (_episodes != null && _episodes!.isNotEmpty)
                                      TVFocusable(
                                        onTap: () {
                                          final ep = _episodes!.first;
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (context) => PlayerScreen(
                                                animeId: widget.animeId,
                                                episode: ep['number'] ?? 1,
                                                title: ep['title'] ?? 'Episode 1',
                                              ),
                                            ),
                                          );
                                        },
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                          decoration: BoxDecoration(
                                            color: Colors.red,
                                            borderRadius: BorderRadius.circular(10),
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: const [
                                              Icon(Icons.play_arrow, color: Colors.white, size: 24),
                                              SizedBox(width: 8),
                                              Text('WATCH NOW', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 0.8)),
                                            ],
                                          ),
                                        ),
                                      ),
                                    const SizedBox(width: 12),
                                    TVFocusable(
                                      onTap: _toggleWatchlist,
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: _inWatchlist ? Colors.white : Colors.white10,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Icon(
                                          _inWatchlist ? Icons.bookmark_added : Icons.bookmark_add_outlined,
                                          color: _inWatchlist ? Colors.black : Colors.white,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    TVFocusable(
                                      onTap: _toggleFavorite,
                                      child: Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: _isFavorite ? Colors.red.withOpacity(0.2) : Colors.white10,
                                          borderRadius: BorderRadius.circular(10),
                                          border: _isFavorite ? Border.all(color: Colors.red, width: 1.5) : null,
                                        ),
                                        child: Icon(
                                          _isFavorite ? Icons.favorite : Icons.favorite_border,
                                          color: _isFavorite ? Colors.red : Colors.white,
                                          size: 20,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 64),
                      const Text(
                        'EPISODES',
                        style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, letterSpacing: 1.2),
                      ),
                      const Divider(color: Colors.white24, height: 32, thickness: 1),
                    ],
                  ),
                ),
              ),
              _buildEpisodeGridSliver(),
              const SliverToBoxAdapter(child: SizedBox(height: 100)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetadataChip(IconData icon, String text, Color color) {
    return Row(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 6),
        Text(
          text,
          style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 14),
        ),
      ],
    );
  }

  Widget _buildGenreChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white12),
      ),
      child: Text(
        text.toUpperCase(),
        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.5),
      ),
    );
  }

  Widget _buildEpisodeGridSliver() {
    if (_episodes == null || _episodes!.isEmpty) {
      return const SliverToBoxAdapter(
        child: Center(
          child: Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Text('No episodes found', style: TextStyle(color: Colors.white54, fontSize: 18)),
          ),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 48),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 6, // Increased from 4/5 for smaller 'perfect' tiles
          mainAxisSpacing: 20,
          crossAxisSpacing: 20,
          childAspectRatio: 1.5, // Cinematic wide format
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) {
            final episodeData = _episodes![index];
            final int epNum = episodeData['number'] is int ? episodeData['number'] : (index + 1);
            final String epTitle = episodeData['title'] ?? 'Episode $epNum';
            final String? epImage = episodeData['image'];

            return TVFocusable(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => PlayerScreen(
                        animeId: widget.animeId,
                        episode: epNum,
                        title: epTitle,
                        posterUrl: _animeDetails['bannerImage'] ?? _animeDetails['image'] ?? _animeDetails['poster'],
                      ),
                  ),
                );
              },
              child: GlassmorphicContainer(
                width: double.infinity,
                height: double.infinity,
                borderRadius: 12,
                blur: 15,
                alignment: Alignment.center,
                border: 1,
                linearGradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFFffffff).withOpacity(0.08),
                      const Color(0xFFFFFFFF).withOpacity(0.03),
                    ],
                ),
                borderGradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      const Color(0xFFffffff).withOpacity(0.2),
                      const Color((0xFFFFFFFF)).withOpacity(0.1),
                    ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Stack(
                        children: [
                          Positioned.fill(
                            child: ClipRRect(
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                              child: epImage != null && epImage.isNotEmpty
                                  ? CachedNetworkImage(
                                      imageUrl: ImageUtils.getProxiedUrl(epImage),
                                      fit: BoxFit.cover,
                                      placeholder: (context, url) => Container(color: Colors.white10),
                                      errorWidget: (context, url, error) => Container(color: Colors.black45, child: const Icon(Icons.movie, color: Colors.white12, size: 24)),
                                    )
                                  : Container(color: Colors.white10, child: const Icon(Icons.movie, color: Colors.white12, size: 24)),
                            ),
                          ),
                          // Episode Number Badge
                          Positioned(
                            top: 8,
                            left: 8,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                              decoration: BoxDecoration(
                                color: Colors.red.withOpacity(0.9),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'EP $epNum',
                                style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Text(
                        epTitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
          childCount: _episodes!.length,
        ),
      ),
    );
  }
}
