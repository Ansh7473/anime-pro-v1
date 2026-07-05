package com.watchanimez.tv.ui.search

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.ui.theme.AppColors

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun SearchScreen(
    onAnimeClick: (Int) -> Unit,
    onBack: () -> Unit,
    viewModel: SearchViewModel = hiltViewModel(),
) {
    val results by viewModel.results.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }
    val focusRequester = remember { FocusRequester() }

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bg)
            .padding(24.dp),
    ) {
        // Top row: back button + search field
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            // Back button
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

            // Search field
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(48.dp)
                    .background(AppColors.card, RoundedCornerShape(8.dp)),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text("🔍", fontSize = 16.sp)
                    BasicTextField(
                        value = query,
                        onValueChange = { newQuery ->
                            query = newQuery
                            viewModel.search(newQuery)
                        },
                        modifier = Modifier
                            .weight(1f)
                            .focusRequester(focusRequester),
                        textStyle = TextStyle(
                            color = Color.White,
                            fontSize = 16.sp,
                        ),
                        singleLine = true,
                        cursorBrush = SolidColor(AppColors.red),
                        decorationBox = { innerTextField ->
                            Box(modifier = Modifier.fillMaxWidth()) {
                                if (query.isEmpty()) {
                                    Text(
                                        "Search anime...",
                                        color = AppColors.textMuted,
                                        fontSize = 16.sp,
                                    )
                                }
                                innerTextField()
                            }
                        },
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Content area
        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("Searching...", color = AppColors.textMuted, fontSize = 16.sp)
                }
            }

            query.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("🔍", fontSize = 48.sp)
                        Spacer(modifier = Modifier.height(16.dp))
                        Text(
                            "Search for anime...",
                            color = AppColors.textMuted,
                            fontSize = 18.sp,
                        )
                    }
                }
            }

            results.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        "No results found",
                        color = AppColors.textMuted,
                        fontSize = 18.sp,
                    )
                }
            }

            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(5),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                    modifier = Modifier.fillMaxSize(),
                ) {
                    items(results, key = { it.id }) { anime ->
                        SearchAnimeCard(
                            anime = anime,
                            onClick = { onAnimeClick(anime.id) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SearchAnimeCard(
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
