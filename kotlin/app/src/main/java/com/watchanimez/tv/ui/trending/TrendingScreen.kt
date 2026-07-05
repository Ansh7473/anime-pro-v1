package com.watchanimez.tv.ui.trending

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
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.ui.home.HomeViewModel
import com.watchanimez.tv.ui.theme.AppColors

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun TrendingScreen(
    onAnimeClick: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val trending = uiState.homeData?.trending.orEmpty()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bg)
            .padding(horizontal = 48.dp),
    ) {
        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 24.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Back button
            var backFocused by remember { mutableStateOf(false) }
            Surface(
                onClick = onBack,
                modifier = Modifier
                    .size(44.dp)
                    .onFocusChanged { backFocused = it.isFocused },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(22.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = AppColors.card,
                    focusedContainerColor = AppColors.cardHover,
                ),
                border = ClickableSurfaceDefaults.border(
                    focusedBorder = Border(
                        border = BorderStroke(2.dp, Color.White),
                        shape = RoundedCornerShape(22.dp),
                    ),
                ),
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                    Text("←", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.width(16.dp))

            // Title with accent bar
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(24.dp)
                    .clip(RoundedCornerShape(2.dp))
                    .background(AppColors.red)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Text(
                "Trending Now",
                color = Color.White,
                fontSize = 28.sp,
                fontWeight = FontWeight.W800,
            )

            Spacer(modifier = Modifier.weight(1f))

            Text(
                "${trending.size} titles",
                color = AppColors.textMuted,
                fontSize = 14.sp,
            )
        }

        // Grid
        if (uiState.isLoading && trending.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("Loading...", color = AppColors.textMuted, fontSize = 16.sp)
            }
        } else if (trending.isEmpty()) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No trending anime", color = AppColors.textMuted, fontSize = 16.sp)
            }
        } else {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 150.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
                modifier = Modifier.fillMaxSize(),
            ) {
                items(trending, key = { it.id }) { anime ->
                    TrendingCard(anime = anime, onClick = { onAnimeClick(anime.id) })
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun TrendingCard(
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

                // Score badge
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
                        Text("${score / 10.0}", color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.W600)
                    }
                }

                // Type badge
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
