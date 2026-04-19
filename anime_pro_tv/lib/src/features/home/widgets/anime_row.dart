import 'package:flutter/material.dart';
import '../../../core/tv_focusable.dart';
import '../../details/details_screen.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:glassmorphism/glassmorphism.dart';
import '../../../core/image_utils.dart';

class AnimeRow extends StatelessWidget {
  final String title;
  final List<dynamic> items;

  const AnimeRow({super.key, required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          child: Text(
            title,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ),
        SizedBox(
          height: 240, // Increased to fit card + shadow + padding
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              return _AnimeCard(item: item);
            },
          ),
        ),
      ],
    );
  }
}

class _AnimeCard extends StatelessWidget {
  final dynamic item;

  const _AnimeCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final String title = item['title']?.toString() ?? item['animeTitle']?.toString() ?? 'Unknown';
    final poster = item['image'] ?? item['poster'] ?? item['animePoster'] ?? '';
    final String format = (item['type'] ?? item['format'] ?? '').toString();
    final String score = (item['score'] ?? item['rating'] ?? '').toString();
    final String year = (item['year'] ?? item['seasonYear'] ?? '').toString();
    final String episodes = (item['episodes'] ?? item['episodeCount'] ?? '').toString();
    
    String? genre;
    if (item['genres'] != null && (item['genres'] as List).isNotEmpty) {
      genre = (item['genres'] as List)[0].toString();
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: TVFocusable(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DetailsScreen(animeId: (item['id'] ?? item['animeId']).toString()),
            ),
          );
        },
        child: Container(
          width: 150, // Reduced from 190
          height: 220, // Reduced from 280
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 10,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: GlassmorphicContainer(
            width: 150,
            height: 220,
            borderRadius: 12,
            blur: 15,
            alignment: Alignment.center,
            border: 1.2,
            linearGradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFFffffff).withOpacity(0.1),
                  const Color(0xFFFFFFFF).withOpacity(0.05),
                ]),
            borderGradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFFffffff).withOpacity(0.3),
                  const Color((0xFFFFFFFF)).withOpacity(0.08),
                ]),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                          child: poster.toString().isNotEmpty 
                            ? CachedNetworkImage(
                                imageUrl: ImageUtils.getProxiedUrl(poster.toString()),
                                fit: BoxFit.cover,
                                placeholder: (context, url) => Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white.withOpacity(0.05),
                                  ),
                                  child: const Center(child: Icon(Icons.movie_filter_rounded, color: Colors.white12, size: 30)),
                                ),
                                errorWidget: (context, url, error) => Container(
                                  color: Colors.black45,
                                  child: const Icon(Icons.broken_image_outlined, color: Colors.white24),
                                ),
                              )
                            : Container(color: Colors.white10, child: const Icon(Icons.movie_filter_rounded)),
                        ),
                      ),
                      
                      // Genre Label
                      if (genre != null)
                        Positioned(
                          top: 8,
                          left: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.red.shade900.withOpacity(0.9),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              genre.toUpperCase(),
                              style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                            ),
                          ),
                        ),

                      // Score Badge
                      if (score.isNotEmpty && score != '0')
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: Colors.black87,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: Colors.amber.withOpacity(0.5), width: 1),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.star_rounded, color: Colors.amber, size: 10),
                                const SizedBox(width: 2),
                                Text(
                                  score,
                                  style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                // Text Content
                Container(
                  padding: const EdgeInsets.all(10.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13, 
                          fontWeight: FontWeight.w900, 
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            (format.isNotEmpty ? format : "TV").toUpperCase(),
                            style: const TextStyle(fontSize: 8, color: Colors.white60, fontWeight: FontWeight.w800),
                          ),
                          if (episodes.isNotEmpty && episodes != 'null' && episodes != '0')
                            Text(
                              '$episodes EPS',
                              style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w800, color: Colors.white38),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
