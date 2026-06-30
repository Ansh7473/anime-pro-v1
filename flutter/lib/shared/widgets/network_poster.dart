import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/theme/app_colors.dart';

/// A cached image tuned for posters/banners: fades in, shows a shimmer while
/// loading, and degrades gracefully to a branded placeholder on error.
class NetworkPoster extends StatelessWidget {
  const NetworkPoster({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.borderRadius,
    this.memCacheWidth = 480,
  });

  final String? url;
  final BoxFit fit;
  final BorderRadius? borderRadius;
  final int? memCacheWidth;

  @override
  Widget build(BuildContext context) {
    final child = (url == null || url!.isEmpty)
        ? _placeholder()
        : CachedNetworkImage(
            imageUrl: url!,
            fit: fit,
            fadeInDuration: const Duration(milliseconds: 250),
            placeholder: (_, _) => _shimmer(),
            errorWidget: (_, _, _) => _placeholder(),
            memCacheWidth: memCacheWidth,
          );
    if (borderRadius != null) {
      return ClipRRect(borderRadius: borderRadius!, child: child);
    }
    return child;
  }

  Widget _shimmer() => Shimmer.fromColors(
        baseColor: AppColors.card,
        highlightColor: AppColors.cardHover,
        child: Container(color: AppColors.card),
      );

  Widget _placeholder() => Container(
        color: AppColors.card,
        alignment: Alignment.center,
        child: const Icon(Icons.movie_outlined,
            color: AppColors.textMuted, size: 32),
      );
}
