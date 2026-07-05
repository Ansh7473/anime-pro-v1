package com.watchanimez.tv.ui.home

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import com.watchanimez.tv.ui.components.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.data.model.WatchHistory
import com.watchanimez.tv.ui.theme.AppColors
import kotlinx.coroutines.delay

// ─── Main Screen ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeScreen(
    onAnimeClick: (Int) -> Unit,
    onNavigate: (String) -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bg),
    ) {
        TopNavBar(onNavigate = onNavigate)

        when {
            // Error with no data — full-screen error + retry
            uiState.error != null && uiState.homeData == null -> {
                ErrorState(
                    message = uiState.error!!,
                    onRetry = { viewModel.loadHome() },
                )
            }
            // Initial loading — shimmer placeholders
            uiState.isLoading && uiState.homeData == null -> {
                LoadingState()
            }
            // Data (possibly partial) — render immediately as sections arrive
            else -> {
                HomeContent(
                    uiState = uiState,
                    onAnimeClick = onAnimeClick,
                )
            }
        }
    }
}

// ─── Top Navigation Bar ────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TopNavBar(onNavigate: (String) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                Brush.verticalGradient(
                    colors = listOf(AppColors.bg, AppColors.bg.copy(alpha = 0.8f), Color.Transparent),
                )
            )
            .padding(horizontal = 48.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Logo
        Text(
            text = "WATCHANIMEZ",
            color = AppColors.red,
            fontSize = 20.sp,
            fontWeight = FontWeight.W900,
            letterSpacing = 2.sp,
        )

        Spacer(modifier = Modifier.width(36.dp))

        // Primary nav items
        NavItem(label = "Home", onClick = { /* already on home */ })
        NavItem(label = "Trending", onClick = { onNavigate("trending") })
        NavItem(label = "Watchlist", onClick = { onNavigate("watchlist") })
        NavItem(label = "Favorites", onClick = { onNavigate("favorites") })

        Spacer(modifier = Modifier.weight(1f))

        // Search button (icon-style)
        var searchFocused by remember { mutableStateOf(false) }
        Surface(
            onClick = { onNavigate("search") },
            modifier = Modifier
                .size(40.dp)
                .onFocusChanged { searchFocused = it.isFocused },
            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(20.dp)),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = Color.White.copy(alpha = 0.08f),
                focusedContainerColor = Color.White.copy(alpha = 0.2f),
            ),
            border = ClickableSurfaceDefaults.border(
                focusedBorder = Border(
                    border = BorderStroke(1.5.dp, Color.White.copy(alpha = 0.5f)),
                    shape = RoundedCornerShape(20.dp),
                ),
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Text("\uD83D\uDD0D", fontSize = 16.sp)
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Profile button (icon-style)
        var profileFocused by remember { mutableStateOf(false) }
        Surface(
            onClick = { onNavigate("profile") },
            modifier = Modifier
                .size(40.dp)
                .onFocusChanged { profileFocused = it.isFocused },
            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(20.dp)),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = Color.White.copy(alpha = 0.08f),
                focusedContainerColor = Color.White.copy(alpha = 0.2f),
            ),
            border = ClickableSurfaceDefaults.border(
                focusedBorder = Border(
                    border = BorderStroke(1.5.dp, AppColors.red),
                    shape = RoundedCornerShape(20.dp),
                ),
            ),
            scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
        ) {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                Text("\uD83D\uDC64", fontSize = 16.sp)
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun NavItem(label: String, onClick: () -> Unit) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = Modifier
            .padding(horizontal = 2.dp)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.Transparent,
            focusedContainerColor = Color.Transparent,
        ),
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = label,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                color = if (isFocused) Color.White else AppColors.textMuted,
                fontSize = 14.sp,
                fontWeight = if (isFocused) FontWeight.W700 else FontWeight.W400,
            )
            // Active indicator bar
            Box(
                modifier = Modifier
                    .width(if (isFocused) 20.dp else 0.dp)
                    .height(2.dp)
                    .clip(RoundedCornerShape(1.dp))
                    .background(if (isFocused) AppColors.red else Color.Transparent)
            )
        }
    }
}

// ─── Home Content (LazyColumn with hero + rows) ────────────────────────────────

@Composable
private fun HomeContent(
    uiState: HomeUiState,
    onAnimeClick: (Int) -> Unit,
) {
    val homeData = uiState.homeData
    val sections = buildList {
        homeData?.trending?.takeIf { it.isNotEmpty() }?.let { add("🔥 Trending Now" to it) }
        homeData?.popular?.takeIf { it.isNotEmpty() }?.let { add("⭐ Popular" to it) }
        homeData?.topRated?.takeIf { it.isNotEmpty() }?.let { add("🏆 Top Rated" to it) }
        homeData?.action?.takeIf { it.isNotEmpty() }?.let { add("⚔️ Action" to it) }
        homeData?.romance?.takeIf { it.isNotEmpty() }?.let { add("💕 Romance" to it) }
        homeData?.movies?.takeIf { it.isNotEmpty() }?.let { add("🎬 Movies" to it) }
    }

    LazyColumn(modifier = Modifier.fillMaxSize()) {
        // Hero banner
        homeData?.trending?.takeIf { it.isNotEmpty() }?.let { trending ->
            item(key = "hero") {
                HeroBanner(
                    animes = trending.take(5),
                    onAnimeClick = onAnimeClick,
                )
            }
        }

        // Continue watching (if present)
        if (uiState.continueWatching.isNotEmpty()) {
            item(key = "continue") {
                ContinueWatchingRow(
                    items = uiState.continueWatching,
                    onAnimeClick = onAnimeClick,
                )
            }
        }

        // Content rows — render each section immediately as data arrives
        items(sections, key = { it.first }) { (title, animes) ->
            ContentRow(
                title = title,
                animes = animes,
                onAnimeClick = onAnimeClick,
            )
        }

        item(key = "spacer") { Spacer(modifier = Modifier.height(48.dp)) }
    }
}

// ─── Hero Banner ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun HeroBanner(
    animes: List<Anime>,
    onAnimeClick: (Int) -> Unit,
) {
    if (animes.isEmpty()) return

    var currentIndex by remember { mutableIntStateOf(0) }

    // Auto-rotate every 5 seconds
    LaunchedEffect(animes.size) {
        while (true) {
            delay(5_000L)
            currentIndex = (currentIndex + 1) % animes.size
        }
    }

    val anime = animes[currentIndex]

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(380.dp),
    ) {
        // Background image with crossfade
        AnimatedContent(
            targetState = currentIndex,
            transitionSpec = {
                fadeIn(tween(600)) togetherWith fadeOut(tween(600))
            },
            label = "hero-crossfade",
        ) { index ->
            val a = animes[index]
            AsyncImage(
                model = a.bannerImage ?: a.poster ?: a.image,
                contentDescription = a.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }

        // Left gradient scrim (black 90% → transparent)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colors = listOf(
                            Color.Black.copy(alpha = 0.9f),
                            Color.Black.copy(alpha = 0.5f),
                            Color.Transparent,
                        ),
                        startX = 0f,
                        endX = 800f,
                    )
                )
        )

        // Bottom gradient scrim (transparent → bg)
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color.Transparent,
                            AppColors.bg,
                        ),
                        startY = 200f,
                    )
                )
        )

        // Hero info overlay
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(start = 48.dp, bottom = 64.dp)
                .widthIn(max = 500.dp),
        ) {
            // Title
            Text(
                text = anime.title,
                color = Color.White,
                fontSize = 32.sp,
                fontWeight = FontWeight.W900,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 36.sp,
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Metadata row
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                anime.score?.let { score ->
                    Text(
                        text = "★ ${score / 10.0}",
                        color = Color(0xFFFFC107),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.W700,
                    )
                }
                anime.year?.let { year ->
                    Text(text = "$year", color = AppColors.textMuted, fontSize = 14.sp)
                }
                anime.type?.let { type ->
                    Text(
                        text = type,
                        modifier = Modifier
                            .background(AppColors.red.copy(alpha = 0.9f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp),
                        color = Color.White,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.W700,
                    )
                }
                anime.episodes?.let { ep ->
                    Text(
                        text = "$ep eps",
                        color = AppColors.textMuted,
                        fontSize = 13.sp,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Synopsis
            anime.synopsis?.let { synopsis ->
                Text(
                    text = synopsis,
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 13.sp,
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 18.sp,
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Action buttons
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                var playFocused by remember { mutableStateOf(false) }
                Surface(
                    onClick = { onAnimeClick(anime.id) },
                    modifier = Modifier.onFocusChanged { playFocused = it.isFocused },
                    shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = AppColors.red,
                        focusedContainerColor = Color.White,
                    ),
                    scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
                ) {
                    Text(
                        "▶  Watch Now",
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                        color = if (playFocused) Color.Black else Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.W700,
                    )
                }

                var infoFocused by remember { mutableStateOf(false) }
                Surface(
                    onClick = { onAnimeClick(anime.id) },
                    modifier = Modifier.onFocusChanged { infoFocused = it.isFocused },
                    shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = Color.White.copy(alpha = 0.12f),
                        focusedContainerColor = Color.White.copy(alpha = 0.25f),
                    ),
                ) {
                    Text(
                        "ℹ  More Info",
                        modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.W600,
                    )
                }
            }
        }

        // Dot indicators
        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 48.dp, bottom = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            animes.forEachIndexed { index, _ ->
                Box(
                    modifier = Modifier
                        .size(if (index == currentIndex) 10.dp else 7.dp)
                        .clip(RoundedCornerShape(50))
                        .background(
                            if (index == currentIndex) Color.White
                            else Color.White.copy(alpha = 0.3f)
                        )
                )
            }
        }
    }
}

// ─── Content Row ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ContentRow(
    title: String,
    animes: List<Anime>,
    onAnimeClick: (Int) -> Unit,
) {
    Column(modifier = Modifier.padding(top = 20.dp)) {
        // Section header: red accent bar + bold title
        Row(
            modifier = Modifier.padding(start = 48.dp, bottom = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(20.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(AppColors.red)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                text = title,
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.W700,
            )
        }

        // Horizontal card row
        LazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(animes, key = { it.id }) { anime ->
                AnimeCard(anime = anime, onClick = { onAnimeClick(anime.id) })
            }
        }
    }
}

// ─── Anime Card ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun AnimeCard(
    anime: Anime,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = Modifier
            .width(150.dp)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(12.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = AppColors.card,
            focusedContainerColor = AppColors.card,
        ),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(12.dp),
            ),
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevationColor = Color.White.copy(alpha = 0.15f),
                elevation = 16.dp,
            ),
        ),
    ) {
        Column {
            // Poster — 2:3 aspect ratio
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                    .background(AppColors.cardHover),
            ) {
                AsyncImage(
                    model = anime.poster ?: anime.image,
                    contentDescription = anime.title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )

                // Score badge (top-start)
                anime.score?.let { score ->
                    Row(
                        modifier = Modifier
                            .padding(6.dp)
                            .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp),
                    ) {
                        Text("★", color = Color(0xFFFFC107), fontSize = 10.sp)
                        Text(
                            "${score / 10.0}",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.W600,
                        )
                    }
                }

                // Type badge (bottom-end)
                anime.type?.let { type ->
                    Text(
                        text = type,
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .padding(6.dp)
                            .background(AppColors.red.copy(alpha = 0.9f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp),
                        color = Color.White,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.W700,
                    )
                }
            }

            // Title
            Text(
                text = anime.title,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                color = if (isFocused) Color.White else AppColors.textMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.W500,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 15.sp,
            )
        }
    }
}

// ─── Loading State (shimmer placeholders) ──────────────────────────────────────

@Composable
private fun LoadingState() {
    HomeLoadingSkeleton()
}

// ─── Error State ───────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ErrorState(
    message: String,
    onRetry: () -> Unit,
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Something went wrong",
                color = Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.W700,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = message,
                color = AppColors.textMuted,
                fontSize = 14.sp,
            )
            Spacer(modifier = Modifier.height(24.dp))

            var retryFocused by remember { mutableStateOf(false) }
            Surface(
                onClick = onRetry,
                modifier = Modifier.onFocusChanged { retryFocused = it.isFocused },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = AppColors.red,
                    focusedContainerColor = AppColors.redHover,
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
            ) {
                Text(
                    "Retry",
                    modifier = Modifier.padding(horizontal = 32.dp, vertical = 12.dp),
                    color = Color.White,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.W600,
                )
            }
        }
    }
}

// ─── Continue Watching Row ────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ContinueWatchingRow(
    items: List<WatchHistory>,
    onAnimeClick: (Int) -> Unit,
) {
    Column(modifier = Modifier.padding(top = 16.dp)) {
        Text(
            text = "⏳ Continue Watching",
            modifier = Modifier.padding(start = 48.dp, bottom = 12.dp),
            color = Color.White,
            fontSize = 18.sp,
            fontWeight = FontWeight.W700,
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 48.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(items, key = { it.animeId }) { entry ->
                val animeIdInt = entry.animeId.toIntOrNull() ?: return@items
                ContinueWatchingCard(
                    entry = entry,
                    onClick = { onAnimeClick(animeIdInt) },
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ContinueWatchingCard(
    entry: WatchHistory,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }
    val progress = if (entry.duration > 0) (entry.progress / entry.duration).coerceIn(0.0, 1.0) else 0.0

    Surface(
        onClick = onClick,
        modifier = Modifier
            .width(150.dp)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = AppColors.card,
            focusedContainerColor = AppColors.card,
        ),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(2.dp, AppColors.red),
                shape = RoundedCornerShape(8.dp),
            ),
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
    ) {
        Column {
            // Poster with progress bar + episode badge
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(topStart = 8.dp, topEnd = 8.dp)),
            ) {
                AsyncImage(
                    model = entry.animePoster,
                    contentDescription = entry.animeTitle,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )

                // Episode badge
                Box(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .background(Color.Black.copy(alpha = 0.7f), RoundedCornerShape(4.dp))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                ) {
                    Text(
                        text = "EP ${entry.episodeNumber}",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.W700,
                    )
                }

                // Progress bar at bottom of poster
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(Color.White.copy(alpha = 0.2f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress.toFloat())
                            .background(AppColors.red),
                    )
                }
            }

            // Title
            Text(
                text = entry.animeTitle ?: "Unknown",
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 8.dp),
                color = if (isFocused) Color.White else AppColors.textMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.W500,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
