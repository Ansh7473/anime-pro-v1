import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../core/image_utils.dart';
import '../../../core/tv_focusable.dart';
import '../../details/details_screen.dart';

class AnimeGridScreen extends StatelessWidget {
  final String title;
  final List<dynamic> items;
  final bool isLoading;
  final Widget? header;

  const AnimeGridScreen({
    super.key,
    required this.title,
    required this.items,
    this.isLoading = false,
    this.header,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 32, top: 32, bottom: 16),
          child: Text(
            title,
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: 1.2),
          ),
        ),
        if (header != null) header!,
        Expanded(
          child: isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.red))
              : items.isEmpty
                  ? const Center(child: Text('No anime found', style: TextStyle(color: Colors.white70)))
                  : GridView.builder(
                      padding: const EdgeInsets.all(32),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 6,
                        mainAxisSpacing: 32,
                        crossAxisSpacing: 32,
                        childAspectRatio: 0.65,
                      ),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        return _GridAnimeCard(item: items[index]);
                      },
                    ),
        ),
      ],
    );
  }
}

class _GridAnimeCard extends StatelessWidget {
  final dynamic item;

  const _GridAnimeCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final String title = item['title']?.toString() ?? 'Unknown';
    final poster = item['image'] ?? item['poster'] ?? '';
    final String score = (item['score'] ?? item['rating'] ?? '').toString();
    final String year = (item['year'] ?? item['seasonYear'] ?? '').toString();

    return TVFocusable(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DetailsScreen(animeId: item['id'].toString()),
          ),
        );
      },
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: poster.toString().isNotEmpty
                        ? CachedNetworkImage(
                            imageUrl: ImageUtils.getProxiedUrl(poster.toString()),
                            fit: BoxFit.cover,
                            placeholder: (context, url) => Container(color: Colors.white10),
                            errorWidget: (context, url, error) => const Icon(Icons.error),
                          )
                        : Container(color: Colors.white10, child: const Icon(Icons.movie, size: 48)),
                  ),
                  if (score.isNotEmpty && score != '0')
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.8),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: Colors.amber.withOpacity(0.5), width: 0.5),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.star, color: Colors.amber, size: 10),
                            const SizedBox(width: 2),
                            Text(
                              score,
                              style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 4),
          Text(
            year.isNotEmpty ? year : '2024',
            style: const TextStyle(fontSize: 11, color: Colors.white54),
          ),
        ],
      ),
    );
  }
}
