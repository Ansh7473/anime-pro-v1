package com.watchanimez.tv.ui.library

import androidx.compose.animation.animateColorAsState
import com.watchanimez.tv.ui.components.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
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
import com.watchanimez.tv.data.model.FavoriteEntry
import com.watchanimez.tv.data.model.WatchlistEntry
import com.watchanimez.tv.ui.theme.AppColors

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LibraryScreen(
    initialTab: String = "watchlist",
    onAnimeClick: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: LibraryViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var selectedTab by remember { mutableStateOf(initialTab) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bg)
            .padding(24.dp),
    ) {
        // Top row: back button + title
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Surface(
                onClick = onBack,
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = AppColors.card,
                    focusedContainerColor = AppColors.cardHover,
                ),
                border = ClickableSurfaceDefaults.border(
                    focusedBorder = Border(
                        border = BorderStroke(2.dp, Color.White),
                        shape = RoundedCornerShape(8.dp),
                    ),
                ),
                modifier = Modifier.size(48.dp),
            ) {
                Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("←", color = Color.White, fontSize = 20.sp)
                }
            }

            Text(
                "My Library",
                color = Color.White,
                fontSize = 24.sp,
                fontWeight = FontWeight.Bold,
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Tab selector
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            LibraryTab(
                label = "Watchlist",
                isSelected = selectedTab == "watchlist",
                onClick = { selectedTab = "watchlist" },
            )
            LibraryTab(
                label = "Favorites",
                isSelected = selectedTab == "favorites",
                onClick = { selectedTab = "favorites" },
            )
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Content
        when {
            uiState.isLoading -> {
                GridLoadingSkeleton()
            }

            uiState.error != null -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            uiState.error ?: "An error occurred",
                            color = AppColors.red,
                            fontSize = 16.sp,
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Surface(
                            onClick = { viewModel.loadLibrary() },
                            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                            colors = ClickableSurfaceDefaults.colors(
                                containerColor = AppColors.red,
                                focusedContainerColor = AppColors.redHover,
                            ),
                        ) {
                            Text(
                                "Retry",
                                modifier = Modifier.padding(horizontal = 24.dp, vertical = 12.dp),
                                color = Color.White,
                                fontWeight = FontWeight.W600,
                            )
                        }
                    }
                }
            }

            selectedTab == "watchlist" -> {
                if (uiState.watchlist.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "Your watchlist is empty",
                            color = AppColors.textMuted,
                            fontSize = 18.sp,
                        )
                    }
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(uiState.watchlist, key = { it.animeId }) { entry ->
                            WatchlistCard(
                                entry = entry,
                                onClick = {
                                    entry.animeId.toIntOrNull()?.let { onAnimeClick(it) }
                                },
                            )
                        }
                    }
                }
            }

            selectedTab == "favorites" -> {
                if (uiState.favorites.isEmpty()) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "No favorites yet",
                            color = AppColors.textMuted,
                            fontSize = 18.sp,
                        )
                    }
                } else {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(5),
                        horizontalArrangement = Arrangement.spacedBy(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp),
                        modifier = Modifier.fillMaxSize(),
                    ) {
                        items(uiState.favorites, key = { it.animeId }) { entry ->
                            FavoriteCard(
                                entry = entry,
                                onClick = {
                                    entry.animeId.toIntOrNull()?.let { onAnimeClick(it) }
                                },
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun LibraryTab(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    val bgColor by animateColorAsState(
        targetValue = if (isSelected) AppColors.red else AppColors.card,
        label = "tabBg",
    )

    Surface(
        onClick = onClick,
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(20.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = bgColor,
            focusedContainerColor = if (isSelected) AppColors.redHover else AppColors.cardHover,
        ),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(20.dp),
            ),
        ),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp),
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.W500,
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun WatchlistCard(
    entry: WatchlistEntry,
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
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                    .background(AppColors.cardHover),
            ) {
                AsyncImage(
                    model = entry.animePoster,
                    contentDescription = entry.animeTitle,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }

            Text(
                text = entry.animeTitle ?: "Unknown",
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

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun FavoriteCard(
    entry: FavoriteEntry,
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
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(topStart = 12.dp, topEnd = 12.dp))
                    .background(AppColors.cardHover),
            ) {
                AsyncImage(
                    model = entry.animePoster,
                    contentDescription = entry.animeTitle,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }

            Text(
                text = entry.animeTitle ?: "Unknown",
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
