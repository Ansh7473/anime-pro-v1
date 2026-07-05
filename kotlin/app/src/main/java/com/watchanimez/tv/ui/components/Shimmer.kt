package com.watchanimez.tv.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.watchanimez.tv.ui.theme.AppColors

@Composable
fun shimmerBrush(): Brush {
    val shimmerColors = listOf(
        AppColors.card,
        AppColors.cardHover,
        AppColors.card,
    )
    val transition = rememberInfiniteTransition(label = "shimmer")
    val translateX = transition.animateFloat(
        initialValue = -300f,
        targetValue = 300f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerX",
    )
    return Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateX.value, 0f),
        end = Offset(translateX.value + 200f, 200f),
    )
}

@Composable
fun ShimmerBox(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 12.dp,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(cornerRadius))
            .background(shimmerBrush())
    )
}

/** Skeleton for a single anime card (150dp wide, 2:3 poster + title line) */
@Composable
fun ShimmerCard(modifier: Modifier = Modifier) {
    Column(modifier = modifier.width(150.dp)) {
        ShimmerBox(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f),
        )
        Spacer(modifier = Modifier.height(8.dp))
        ShimmerBox(
            modifier = Modifier
                .fillMaxWidth(0.8f)
                .height(12.dp),
            cornerRadius = 4.dp,
        )
        Spacer(modifier = Modifier.height(4.dp))
        ShimmerBox(
            modifier = Modifier
                .fillMaxWidth(0.5f)
                .height(10.dp),
            cornerRadius = 4.dp,
        )
    }
}

/** Skeleton for a content row (title bar + horizontal card row) */
@Composable
fun ShimmerContentRow(cardCount: Int = 7) {
    Column(modifier = Modifier.padding(top = 20.dp)) {
        // Title skeleton
        Row(
            modifier = Modifier.padding(start = 48.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ShimmerBox(
                modifier = Modifier.width(4.dp).height(20.dp),
                cornerRadius = 2.dp,
            )
            Spacer(modifier = Modifier.width(10.dp))
            ShimmerBox(
                modifier = Modifier.width(140.dp).height(18.dp),
                cornerRadius = 4.dp,
            )
        }

        // Cards skeleton
        LazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            userScrollEnabled = false,
        ) {
            items(cardCount) {
                ShimmerCard()
            }
        }
    }
}

/** Skeleton for the hero banner */
@Composable
fun ShimmerHeroBanner() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(380.dp)
    ) {
        ShimmerBox(modifier = Modifier.fillMaxSize(), cornerRadius = 0.dp)

        // Fake content overlay
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 48.dp, bottom = 40.dp)
                .fillMaxWidth(0.4f),
        ) {
            ShimmerBox(Modifier.width(80.dp).height(12.dp), cornerRadius = 4.dp)
            Spacer(Modifier.height(10.dp))
            ShimmerBox(Modifier.fillMaxWidth().height(28.dp), cornerRadius = 6.dp)
            Spacer(Modifier.height(8.dp))
            ShimmerBox(Modifier.fillMaxWidth(0.6f).height(20.dp), cornerRadius = 4.dp)
            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ShimmerBox(Modifier.width(120.dp).height(38.dp), cornerRadius = 8.dp)
                ShimmerBox(Modifier.width(100.dp).height(38.dp), cornerRadius = 8.dp)
            }
        }
    }
}

/** Full home loading skeleton */
@Composable
fun HomeLoadingSkeleton() {
    Column(modifier = Modifier.fillMaxSize()) {
        ShimmerHeroBanner()
        ShimmerContentRow()
        ShimmerContentRow()
        ShimmerContentRow()
    }
}

/** Grid loading skeleton (for search, trending, library) */
@Composable
fun GridLoadingSkeleton(columns: Int = 6, rows: Int = 3) {
    Column(
        modifier = Modifier.padding(horizontal = 48.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        repeat(rows) {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                repeat(columns) {
                    ShimmerCard(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}
