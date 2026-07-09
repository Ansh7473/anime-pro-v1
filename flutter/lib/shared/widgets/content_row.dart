import 'package:flutter/material.dart';

import '../../core/device/device_info.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/anime.dart';
import 'anime_card.dart';

/// A titled, horizontally scrolling row of [AnimeCard]s — the primary content
/// unit on Home and Details.
class ContentRow extends StatelessWidget {
  const ContentRow({
    super.key,
    required this.title,
    required this.items,
    this.itemWidth = 132,
  });

  final String title;
  final List<Anime> items;
  final double itemWidth;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    final isTv = DeviceInfo.isTv(context);
    // TV logical canvas is ~960x540dp, so keep cards only slightly larger than
    // phone (a roomy-tablet feel), not huge. Consistent 24px side margin.
    final double width = isTv ? 160 : itemWidth;
    final double hPad = isTv ? 24 : 16;
    final double titleSize = isTv ? 22 : 17;
    final double accentHeight = isTv ? 22 : 18;
    // Extra room below the poster for the 2-line title.
    final double titleRoom = isTv ? 48 : 38;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: EdgeInsets.fromLTRB(hPad, 8, hPad, 10),
          child: Row(
            children: [
              Container(
                width: 4,
                height: accentHeight,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: titleSize,
                  fontWeight: FontWeight.w700,
                  color: AppColors.text,
                  letterSpacing: 0.2,
                ),
              ),
            ],
          ),
        ),
        SizedBox(
          height: width * 1.5 + titleRoom + (isTv ? 18 : 0),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            padding: EdgeInsets.fromLTRB(
              hPad,
              isTv ? 9 : 0,
              hPad,
              isTv ? 9 : 0,
            ),
            itemCount: items.length,
            separatorBuilder: (_, _) => SizedBox(width: isTv ? 14 : 12),
            itemBuilder: (_, i) => SizedBox(
              width: width,
              child: AnimeCard(anime: items[i]),
            ),
          ),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}
