package com.watchanimez.tv.ui.details

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
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
import com.watchanimez.tv.data.model.Episode
import com.watchanimez.tv.ui.theme.AppColors

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun DetailsScreen(
    animeId: Int,
    onBack: () -> Unit,
    onPlay: (animeId: Int, episode: Int) -> Unit,
    onAnimeClick: (Int) -> Unit = {},
    viewModel: DetailsViewModel = hiltViewModel(),
) {
    BackHandler(onBack = onBack)

    LaunchedEffect(animeId) {
        viewModel.loadDetailsFor(animeId)
    }

    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    when {
        uiState.isLoading -> LoadingState()
        uiState.error != null && uiState.anime == null -> ErrorState(
            message = uiState.error!!,
            onRetry = { viewModel.loadDetailsFor(animeId) },
        )
        uiState.anime != null -> DetailsContent(
            anime = uiState.anime!!,
            episodes = uiState.episodes,
            animeId = animeId,
            onBack = onBack,
            onPlay = onPlay,
            onAnimeClick = onAnimeClick,
            isInWatchlist = uiState.isInWatchlist,
            isFavorite = uiState.isFavorite,
            onToggleWatchlist = viewModel::toggleWatchlist,
            onToggleFavorite = viewModel::toggleFavorite,
        )
        else -> ErrorState(
            message = "Anime not found",
            onRetry = { viewModel.loadDetailsFor(animeId) },
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun LoadingState() {
    Box(
        modifier = Modifier.fillMaxSize().background(AppColors.bg),
        contentAlignment = Alignment.Center,
    ) {
        Text("Loading...", color = AppColors.textMuted, fontSize = 18.sp)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(AppColors.bg),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(message, color = AppColors.red, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(16.dp))
            var retryFocused by remember { mutableStateOf(false) }
            Surface(
                onClick = onRetry,
                modifier = Modifier.onFocusChanged { retryFocused = it.isFocused },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = AppColors.card,
                    focusedContainerColor = Color.White,
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
            ) {
                Text(
                    "Retry",
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
                    color = if (retryFocused) Color.Black else Color.White,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.W600,
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun DetailsContent(
    anime: Anime,
    episodes: List<Episode>,
    animeId: Int,
    onBack: () -> Unit,
    onPlay: (Int, Int) -> Unit,
    onAnimeClick: (Int) -> Unit,
    isInWatchlist: Boolean = false,
    isFavorite: Boolean = false,
    onToggleWatchlist: () -> Unit = {},
    onToggleFavorite: () -> Unit = {},
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Full-screen backdrop
        AsyncImage(
            model = anime.bannerImage ?: anime.poster ?: anime.image,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )

        // Left scrim
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Black.copy(alpha = 0.95f),
                            0.55f to Color.Black.copy(alpha = 0.65f),
                            1.0f to Color.Black.copy(alpha = 0.2f),
                        ),
                    )
                )
        )

        // Bottom scrim
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        colorStops = arrayOf(
                            0.0f to Color.Transparent,
                            0.55f to Color.Black.copy(alpha = 0.4f),
                            1.0f to AppColors.bg,
                        ),
                    )
                )
        )

        // Back button
        BackButton(onBack = onBack)

        // Content: split pane
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(top = 80.dp, start = 48.dp, end = 32.dp, bottom = 32.dp),
        ) {
            // Left pane — info (42%)
            InfoColumn(
                anime = anime,
                episodes = episodes,
                animeId = animeId,
                onPlay = onPlay,
                isInWatchlist = isInWatchlist,
                isFavorite = isFavorite,
                onToggleWatchlist = onToggleWatchlist,
                onToggleFavorite = onToggleFavorite,
                modifier = Modifier.weight(0.42f),
            )

            // Right pane — episodes + recommendations (58%)
            EpisodesColumn(
                episodes = episodes,
                anime = anime,
                animeId = animeId,
                onPlay = onPlay,
                onAnimeClick = onAnimeClick,
                modifier = Modifier.weight(0.58f),
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun BackButton(onBack: () -> Unit) {
    var backFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onBack,
        modifier = Modifier
            .padding(start = 32.dp, top = 32.dp)
            .size(44.dp)
            .onFocusChanged { backFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(CircleShape),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = Color.White.copy(alpha = 0.1f),
            focusedContainerColor = Color.White.copy(alpha = 0.25f),
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.1f),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text("←", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun InfoColumn(
    anime: Anime,
    episodes: List<Episode>,
    animeId: Int,
    onPlay: (Int, Int) -> Unit,
    isInWatchlist: Boolean = false,
    isFavorite: Boolean = false,
    onToggleWatchlist: () -> Unit = {},
    onToggleFavorite: () -> Unit = {},
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .verticalScroll(rememberScrollState())
            .padding(end = 32.dp),
    ) {
        // Title
        Text(
            text = anime.title,
            color = Color.White,
            fontSize = 36.sp,
            fontWeight = FontWeight.W900,
            lineHeight = 40.sp,
            letterSpacing = (-0.5).sp,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Metadata chips
        Row(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            modifier = Modifier.padding(bottom = 16.dp),
        ) {
            anime.score?.let { MetadataChip("★ ${it / 10.0}") }
            anime.year?.let { MetadataChip("$it") }
            anime.type?.let { MetadataChip(it) }
            anime.status?.let { MetadataChip(it) }
            anime.episodes?.let { MetadataChip("$it eps") }
        }

        // Genre pills
        if (anime.genres.isNotEmpty()) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(bottom = 16.dp),
            ) {
                anime.genres.take(5).forEach { genre ->
                    Text(
                        text = genre,
                        modifier = Modifier
                            .background(Color.Transparent, RoundedCornerShape(16.dp))
                            .border(1.dp, AppColors.textMuted.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                        color = AppColors.textMuted,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.W500,
                    )
                }
            }
        }

        // Action buttons
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            val firstEp = episodes.firstOrNull()?.number ?: 1

            // Play button
            var playFocused by remember { mutableStateOf(false) }
            Surface(
                onClick = { onPlay(animeId, firstEp) },
                modifier = Modifier.onFocusChanged { playFocused = it.isFocused },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = AppColors.red,
                    focusedContainerColor = Color.White,
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
            ) {
                Text(
                    "▶  Play EP $firstEp",
                    modifier = Modifier.padding(horizontal = 24.dp, vertical = 13.dp),
                    color = if (playFocused) Color.Black else Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.W700,
                )
            }

            // Watchlist button
            var wlFocused by remember { mutableStateOf(false) }
            Surface(
                onClick = onToggleWatchlist,
                modifier = Modifier.onFocusChanged { wlFocused = it.isFocused },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = if (isInWatchlist) AppColors.red.copy(alpha = 0.2f) else Color.White.copy(alpha = 0.12f),
                    focusedContainerColor = Color.White.copy(alpha = 0.3f),
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
            ) {
                Text(
                    if (isInWatchlist) "✓ Watchlist" else "+ Watchlist",
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 13.dp),
                    color = if (wlFocused) Color.White else AppColors.textMuted,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.W600,
                )
            }

            // Favorite button
            var favFocused by remember { mutableStateOf(false) }
            Surface(
                onClick = onToggleFavorite,
                modifier = Modifier.onFocusChanged { favFocused = it.isFocused },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = Color.White.copy(alpha = 0.12f),
                    focusedContainerColor = AppColors.red,
                ),
                scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
            ) {
                Text(
                    if (isFavorite) "♥" else "♡",
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 13.dp),
                    color = if (isFavorite) AppColors.red else Color.White,
                    fontSize = 16.sp,
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Synopsis
        if (!anime.synopsis.isNullOrBlank()) {
            Text(
                text = anime.synopsis.replace(Regex("<[^>]*>"), ""),
                color = AppColors.textMuted,
                fontSize = 15.sp,
                lineHeight = 22.sp,
                maxLines = 8,
                overflow = TextOverflow.Ellipsis,
            )
        }

        // Studios
        if (anime.studios.isNotEmpty()) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Studio: ${anime.studios.joinToString(", ")}",
                color = AppColors.textMuted.copy(alpha = 0.7f),
                fontSize = 13.sp,
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun EpisodesColumn(
    episodes: List<Episode>,
    anime: Anime,
    animeId: Int,
    onPlay: (Int, Int) -> Unit,
    onAnimeClick: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.verticalScroll(rememberScrollState()),
    ) {
        if (episodes.isNotEmpty()) {
            SectionHeader("Episodes (${episodes.size})")

            val chunkedEpisodes = episodes.chunked(8)
            chunkedEpisodes.forEach { row ->
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.padding(bottom = 10.dp),
                ) {
                    row.forEach { episode ->
                        EpisodeTile(
                            episode = episode,
                            onClick = { onPlay(animeId, episode.number) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                    // Fill remaining space for incomplete rows
                    repeat(8 - row.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }

        // Recommendations
        if (anime.recommendations.isNotEmpty()) {
            Spacer(modifier = Modifier.height(24.dp))
            SectionHeader("More Like This")

            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(end = 16.dp),
            ) {
                items(anime.recommendations, key = { it.id }) { rec ->
                    RecommendationCard(
                        anime = rec,
                        onClick = { onAnimeClick(rec.id) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SectionHeader(title: String) {
    Row(
        modifier = Modifier.padding(bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .width(4.dp)
                .height(22.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(Color.White)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            title,
            color = Color.White,
            fontSize = 20.sp,
            fontWeight = FontWeight.W700,
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun MetadataChip(text: String) {
    Text(
        text = text,
        modifier = Modifier
            .background(AppColors.card, RoundedCornerShape(6.dp))
            .border(1.dp, AppColors.cardHover, RoundedCornerShape(6.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
        color = Color.White,
        fontSize = 13.sp,
        fontWeight = FontWeight.W600,
    )
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun EpisodeTile(
    episode: Episode,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = modifier
            .aspectRatio(1.4f)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(10.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = AppColors.card,
            focusedContainerColor = Color.White,
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = BorderStroke(1.dp, AppColors.cardHover),
                shape = RoundedCornerShape(10.dp),
            ),
            focusedBorder = Border(
                border = BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(10.dp),
            ),
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevationColor = Color.White.copy(alpha = 0.2f),
                elevation = 12.dp,
            ),
        ),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            Text(
                text = "${episode.number}",
                color = if (isFocused) Color.Black else Color.White,
                fontSize = 20.sp,
                fontWeight = FontWeight.W700,
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun RecommendationCard(
    anime: Anime,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = Modifier
            .width(150.dp)
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(10.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = AppColors.card,
            focusedContainerColor = AppColors.cardHover,
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = BorderStroke(1.dp, AppColors.border),
                shape = RoundedCornerShape(10.dp),
            ),
            focusedBorder = Border(
                border = BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(10.dp),
            ),
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
        glow = ClickableSurfaceDefaults.glow(
            focusedGlow = Glow(
                elevationColor = Color.White.copy(alpha = 0.15f),
                elevation = 8.dp,
            ),
        ),
    ) {
        Column {
            AsyncImage(
                model = anime.poster ?: anime.image,
                contentDescription = anime.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(0.7f)
                    .clip(RoundedCornerShape(topStart = 10.dp, topEnd = 10.dp)),
                contentScale = ContentScale.Crop,
            )
            Text(
                text = anime.title,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                color = if (isFocused) Color.White else AppColors.textMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.W600,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}
