import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:glassmorphism/glassmorphism.dart';
import '../../../core/image_utils.dart';
import '../../../core/tv_focusable.dart';
import '../../details/details_screen.dart';

class HeroBanner extends StatefulWidget {
  final List<dynamic> animeList;
  final VoidCallback? onFocus;

  const HeroBanner({super.key, required this.animeList, this.onFocus});

  @override
  State<HeroBanner> createState() => _HeroBannerState();
}

class _HeroBannerState extends State<HeroBanner> {
  late PageController _pageController;
  int _currentPage = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (_currentPage < widget.animeList.length - 1) {
        _currentPage++;
      } else {
        _currentPage = 0;
      }
      if (_pageController.hasClients) {
        _pageController.animateToPage(
          _currentPage,
          duration: const Duration(milliseconds: 800),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (widget.animeList.isEmpty) return const SizedBox.shrink();

    return Focus(
      onFocusChange: (hasFocus) {
        if (hasFocus && widget.onFocus != null) {
          widget.onFocus!();
        }
      },
      child: AspectRatio(
        aspectRatio: 16 / 4,
      child: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            onPageChanged: (index) {
              setState(() => _currentPage = index);
              _startTimer(); // Reset timer on manual scroll
            },
            itemCount: widget.animeList.length,
            itemBuilder: (context, index) {
              return _buildHeroItem(widget.animeList[index]);
            },
          ),
          // Page Indicators
          Positioned(
            bottom: 24,
            right: 48,
            child: Row(
              children: List.generate(
                widget.animeList.length.clamp(0, 10), // Limit to 10 dots
                (index) => Container(
                  width: 8,
                  height: 8,
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _currentPage == index ? Colors.red : Colors.white24,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
    );
  }

  Widget _buildHeroItem(dynamic item) {
    final String title = item['title']?.toString() ?? 'Unknown';
    final cover = item['bannerImage'] ?? item['image'] ?? item['poster'] ?? '';
    final description = (item['description'] ?? '').toString().replaceAll(RegExp(r'<[^>]*>|&[^;]+;'), '');

    return Stack(
      children: [
        // Background Image
        Positioned.fill(
          child: cover.toString().isNotEmpty 
            ? CachedNetworkImage(
                imageUrl: ImageUtils.getProxiedUrl(cover.toString()),
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(color: Colors.black),
                errorWidget: (context, url, error) => Container(color: Colors.black),
              )
            : Container(color: Colors.black),
        ),
        // Gradient Overlays
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.bottomCenter,
              end: Alignment.topCenter,
              colors: [Colors.black, Colors.transparent],
            ),
          ),
        ),
        Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [Colors.black, Colors.transparent],
            ),
          ),
        ),
        // Content
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 48.0, vertical: 16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 20),
              const Row(
                children: [
                  Icon(Icons.star, color: Colors.amber, size: 14),
                  SizedBox(width: 4),
                  Text('FEATURED ANIME', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2, fontSize: 10)),
                ],
              ),
              const SizedBox(height: 4),
              Flexible(
                child: SizedBox(
                  width: 650,
                  child: Text(
                    title,
                    maxLines: 1, // Reduced to 1 line for short banners
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 34, fontWeight: FontWeight.w900, height: 1.1),
                  ),
                ),
              ),
              const SizedBox(height: 2),
              Flexible(
                child: SizedBox(
                  width: 600,
                  child: Text(
                    description,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  TVFocusable(
                    onTap: () {
                       Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => DetailsScreen(animeId: item['id'].toString()),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.play_arrow, color: Colors.black, size: 20),
                          SizedBox(width: 8),
                          Text('Watch Now', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  TVFocusable(
                    onTap: () {},
                    child: GlassmorphicContainer(
                      width: 150,
                      height: 42,
                      borderRadius: 8,
                      blur: 10,
                      alignment: Alignment.center,
                      border: 1,
                      linearGradient: LinearGradient(colors: [Colors.white.withAlpha(25), Colors.white.withAlpha(25)]),
                      borderGradient: LinearGradient(colors: [Colors.white.withAlpha(25), Colors.white.withAlpha(25)]),
                      child: const Text('My Watchlist', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
