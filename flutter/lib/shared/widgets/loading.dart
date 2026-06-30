import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../../core/theme/app_colors.dart';

/// A shimmering poster-shaped placeholder used in loading rows/grids.
class PosterSkeleton extends StatelessWidget {
  const PosterSkeleton({super.key, this.width = 140});
  final double width;

  @override
  Widget build(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: AppColors.card,
      highlightColor: AppColors.cardHover,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AspectRatio(
            aspectRatio: 2 / 3,
            child: Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 8),
          Container(height: 12, width: width * 0.8, color: AppColors.card),
        ],
      ),
    );
  }
}

/// A horizontally scrolling row of [PosterSkeleton]s.
class RowSkeleton extends StatelessWidget {
  const RowSkeleton({super.key, this.itemWidth = 140});
  final double itemWidth;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: itemWidth * 1.5 + 32,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: 6,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (_, _) => SizedBox(
          width: itemWidth,
          child: PosterSkeleton(width: itemWidth),
        ),
      ),
    );
  }
}

/// Centered branded spinner.
class CenteredLoader extends StatelessWidget {
  const CenteredLoader({super.key});
  @override
  Widget build(BuildContext context) => const Center(
        child: CircularProgressIndicator(color: Colors.white),
      );
}

/// A friendly error state with a retry action.
class ErrorRetry extends StatelessWidget {
  const ErrorRetry({super.key, required this.onRetry, this.message});
  final VoidCallback onRetry;
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded,
                color: AppColors.textMuted, size: 40),
            const SizedBox(height: 12),
            Text(
              message ?? 'Something went wrong.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
