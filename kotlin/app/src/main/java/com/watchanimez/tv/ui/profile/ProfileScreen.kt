package com.watchanimez.tv.ui.profile

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.*
import coil.compose.AsyncImage
import com.watchanimez.tv.ui.theme.AppColors

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun ProfileScreen(
    onBack: () -> Unit,
    onLogout: () -> Unit,
    onNavigateToAuth: () -> Unit,
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bg)
            .padding(24.dp),
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

        Spacer(modifier = Modifier.height(32.dp))

        if (uiState.isLoading) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Text("Loading...", color = AppColors.textMuted, fontSize = 16.sp)
            }
        } else if (!uiState.isLoggedIn) {
            // Not logged in state
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        "You're not signed in",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.W600,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Sign in to sync your watchlist and favorites",
                        color = AppColors.textMuted,
                        fontSize = 14.sp,
                    )
                    Spacer(modifier = Modifier.height(24.dp))
                    Surface(
                        onClick = onNavigateToAuth,
                        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                        colors = ClickableSurfaceDefaults.colors(
                            containerColor = AppColors.red,
                            focusedContainerColor = AppColors.redHover,
                        ),
                        border = ClickableSurfaceDefaults.border(
                            focusedBorder = Border(
                                border = BorderStroke(2.dp, Color.White),
                                shape = RoundedCornerShape(8.dp),
                            ),
                        ),
                    ) {
                        Text(
                            "Sign In",
                            modifier = Modifier.padding(horizontal = 32.dp, vertical = 14.dp),
                            color = Color.White,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.W600,
                        )
                    }
                }
            }
        } else {
            // Logged in state
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                // Avatar
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .clip(CircleShape)
                        .background(AppColors.cardHover),
                    contentAlignment = Alignment.Center,
                ) {
                    val avatar = uiState.profile?.avatar
                    if (avatar != null) {
                        AsyncImage(
                            model = avatar,
                            contentDescription = "Profile avatar",
                            modifier = Modifier.fillMaxSize(),
                            contentScale = ContentScale.Crop,
                        )
                    } else {
                        Text(
                            uiState.profile?.name?.firstOrNull()?.uppercase() ?: "U",
                            color = Color.White,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Name
                Text(
                    uiState.profile?.name ?: "User",
                    color = Color.White,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                )

                // Email
                if (uiState.email.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        uiState.email,
                        color = AppColors.textMuted,
                        fontSize = 14.sp,
                    )
                }

                Spacer(modifier = Modifier.height(32.dp))

                // Stats
                Row(
                    horizontalArrangement = Arrangement.spacedBy(32.dp),
                ) {
                    StatItem(label = "Watchlist", count = uiState.watchlistCount)
                    StatItem(label = "Favorites", count = uiState.favoritesCount)
                }

                Spacer(modifier = Modifier.height(40.dp))

                // Settings section
                Column(
                    modifier = Modifier
                        .width(400.dp)
                        .background(AppColors.card, RoundedCornerShape(12.dp))
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    Text(
                        "Settings",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.W600,
                    )

                    // Auto-next toggle
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Auto-next Episode", color = Color.White, fontSize = 14.sp)
                            Text(
                                "Automatically play next episode",
                                color = AppColors.textMuted,
                                fontSize = 12.sp,
                            )
                        }
                        Text(
                            if (uiState.profile?.autoNext == true) "ON" else "OFF",
                            color = if (uiState.profile?.autoNext == true) AppColors.red else AppColors.textMuted,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.W600,
                        )
                    }

                    // Divider
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(1.dp)
                            .background(AppColors.border),
                    )

                    // Language preference
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            Text("Language", color = Color.White, fontSize = 14.sp)
                            Text(
                                "Preferred audio language",
                                color = AppColors.textMuted,
                                fontSize = 12.sp,
                            )
                        }
                        Text(
                            when (uiState.profile?.language) {
                                "sub" -> "Sub"
                                "dub" -> "Dub"
                                else -> "Multi"
                            },
                            color = AppColors.textMuted,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.W500,
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Logout button
                Surface(
                    onClick = {
                        viewModel.logout()
                        onLogout()
                    },
                    shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                    colors = ClickableSurfaceDefaults.colors(
                        containerColor = Color.Transparent,
                        focusedContainerColor = AppColors.red.copy(alpha = 0.1f),
                    ),
                    border = ClickableSurfaceDefaults.border(
                        border = Border(
                            border = BorderStroke(1.dp, AppColors.red),
                            shape = RoundedCornerShape(8.dp),
                        ),
                        focusedBorder = Border(
                            border = BorderStroke(2.dp, AppColors.red),
                            shape = RoundedCornerShape(8.dp),
                        ),
                    ),
                ) {
                    Text(
                        "Logout",
                        modifier = Modifier.padding(horizontal = 32.dp, vertical = 12.dp),
                        color = AppColors.red,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.W600,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatItem(label: String, count: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            "$count",
            color = Color.White,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            label,
            color = AppColors.textMuted,
            fontSize = 13.sp,
        )
    }
}
