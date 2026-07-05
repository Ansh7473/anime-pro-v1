package com.watchanimez.tv.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.MaterialTheme
import androidx.tv.material3.darkColorScheme

@Immutable
object AppColors {
    val bg = Color(0xFF0A0A0A)
    val bgLite = Color(0xFF141414)
    val card = Color(0xFF181818)
    val cardHover = Color(0xFF262626)
    val red = Color(0xFFE50914)
    val redHover = Color(0xFFF40612)
    val text = Color(0xFFFFFFFF)
    val textMuted = Color(0xFFA3A3A3)
    val border = Color(0xFF2A2A2A)
}

@OptIn(ExperimentalTvMaterial3Api::class)
private val DarkColors = darkColorScheme(
    primary = AppColors.red,
    onPrimary = AppColors.text,
    background = AppColors.bg,
    onBackground = AppColors.text,
    surface = AppColors.card,
    onSurface = AppColors.text,
    surfaceVariant = AppColors.cardHover,
    onSurfaceVariant = AppColors.textMuted,
)

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun WatchAnimezTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content,
    )
}
