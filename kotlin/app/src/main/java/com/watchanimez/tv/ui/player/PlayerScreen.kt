package com.watchanimez.tv.ui.player

import android.net.Uri
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.PlayerView
import androidx.tv.material3.*
import com.watchanimez.tv.data.model.StreamSource
import com.watchanimez.tv.ui.theme.AppColors

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun PlayerScreen(
    animeId: Int,
    episodeNumber: Int,
    onBack: () -> Unit,
    onNextEpisode: (() -> Unit)? = null,
    onPreviousEpisode: (() -> Unit)? = null,
    viewModel: PlayerViewModel = hiltViewModel(),
) {
    LaunchedEffect(animeId, episodeNumber) {
        viewModel.loadSources(animeId, episodeNumber)
    }

    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showSourceSelector by remember { mutableStateOf(false) }

    BackHandler {
        if (showSourceSelector) showSourceSelector = false else onBack()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        when {
            uiState.isLoading && uiState.sources.isEmpty() -> {
                LoadingState(providerCount = uiState.providerCount)
            }

            uiState.error != null && uiState.selectedSource == null -> {
                ErrorState(
                    error = uiState.error,
                    failedCount = uiState.failedUrls.size,
                    onBack = onBack,
                )
            }

            uiState.selectedSource != null -> {
                val source = uiState.selectedSource!!

                // ExoPlayer with error auto-fallback
                PlayerContent(
                    source = source,
                    context = context,
                    onError = { viewModel.onSourceFailed(source) },
                )

                // Controls
                ControlOverlay(
                    episodeNumber = episodeNumber,
                    source = source,
                    providerCount = uiState.providerCount,
                    totalSources = uiState.playableSources.size,
                    failedCount = uiState.failedUrls.size,
                    onPrevious = onPreviousEpisode,
                    onNext = onNextEpisode,
                    onOpenSources = { showSourceSelector = true },
                    onBack = onBack,
                )

                // Source selector
                if (showSourceSelector) {
                    SourceSelectorOverlay(
                        sources = uiState.playableSources,
                        selectedSource = source,
                        failedUrls = uiState.failedUrls,
                        onSelect = { selected ->
                            viewModel.selectSource(selected)
                            showSourceSelector = false
                        },
                        onDismiss = { showSourceSelector = false },
                    )
                }
            }
        }
    }
}

// ─── Player ──────────────────────────────────────────────────────────────────

@androidx.annotation.OptIn(androidx.media3.common.util.UnstableApi::class)
@Composable
private fun PlayerContent(
    source: StreamSource,
    context: android.content.Context,
    onError: () -> Unit,
) {
    val currentOnError by rememberUpdatedState(onError)

    val exoPlayer = remember(source.url) {
        ExoPlayer.Builder(context).build().apply {
            val headers = buildMap {
                source.headers?.let { putAll(it) }
                source.referer?.let { put("Referer", it) }
                // Some providers need Origin header too
                source.referer?.let { ref ->
                    try {
                        val uri = Uri.parse(ref)
                        put("Origin", "${uri.scheme}://${uri.host}")
                    } catch (_: Exception) {}
                }
            }
            val dataSourceFactory = DefaultHttpDataSource.Factory().apply {
                if (headers.isNotEmpty()) setDefaultRequestProperties(headers)
                setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                setConnectTimeoutMs(10_000)
                setReadTimeoutMs(10_000)
            }
            val mediaItem = MediaItem.fromUri(Uri.parse(source.url))
            val mediaSource = if (source.isM3U8) {
                HlsMediaSource.Factory(dataSourceFactory)
                    .setAllowChunklessPreparation(true)
                    .createMediaSource(mediaItem)
            } else {
                ProgressiveMediaSource.Factory(dataSourceFactory).createMediaSource(mediaItem)
            }
            setMediaSource(mediaSource)
            prepare()
            playWhenReady = true

            addListener(object : Player.Listener {
                override fun onPlayerError(error: PlaybackException) {
                    Log.e("PlayerContent", "ExoPlayer error: ${error.errorCodeName} → ${error.cause?.message}")
                    currentOnError()
                }
            })
        }
    }

    DisposableEffect(source.url) {
        onDispose { exoPlayer.release() }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = exoPlayer
                useController = false
            }
        },
        update = { view -> view.player = exoPlayer },
        modifier = Modifier.fillMaxSize(),
    )
}

// ─── Control Overlay ─────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ControlOverlay(
    episodeNumber: Int,
    source: StreamSource,
    providerCount: Int,
    totalSources: Int,
    failedCount: Int,
    onPrevious: (() -> Unit)?,
    onNext: (() -> Unit)?,
    onOpenSources: () -> Unit,
    onBack: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Top bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter)
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent)))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OverlayButton(text = "← Back", onClick = onBack)
            Spacer(modifier = Modifier.weight(1f))

            if (onPrevious != null) {
                OverlayButton(text = "◀ Prev", onClick = onPrevious)
                Spacer(modifier = Modifier.width(8.dp))
            }

            Text(
                "EP $episodeNumber",
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                color = Color.White,
                fontSize = 13.sp,
                fontWeight = FontWeight.W700,
            )

            if (onNext != null) {
                Spacer(modifier = Modifier.width(8.dp))
                OverlayButton(text = "Next ▶", onClick = onNext)
            }
        }

        // Bottom bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = buildString {
                        source.providerName?.let { append(it) }
                            ?: source.provider?.let { append(it) }
                            ?: append("Source")
                        source.quality?.let { append(" • $it") }
                        if (source.isM3U8) append(" • HLS")
                    },
                    color = Color.White,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.W600,
                )
                Text(
                    buildString {
                        append("$totalSources sources from $providerCount providers")
                        if (failedCount > 0) append(" • $failedCount failed")
                    },
                    color = AppColors.textMuted.copy(alpha = 0.7f),
                    fontSize = 10.sp,
                )
            }

            OverlayButton(
                text = "⚙ Sources ($totalSources)",
                onClick = onOpenSources,
                accent = true,
            )
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun OverlayButton(text: String, onClick: () -> Unit, accent: Boolean = false) {
    var isFocused by remember { mutableStateOf(false) }
    Surface(
        onClick = onClick,
        modifier = Modifier.onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (accent) AppColors.red.copy(alpha = 0.8f) else Color.Black.copy(alpha = 0.6f),
            focusedContainerColor = if (accent) AppColors.red else Color.White,
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
            color = if (isFocused && !accent) Color.Black else Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.W600,
        )
    }
}

// ─── Source Selector ─────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SourceSelectorOverlay(
    sources: List<StreamSource>,
    selectedSource: StreamSource,
    failedUrls: Set<String>,
    onSelect: (StreamSource) -> Unit,
    onDismiss: () -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.85f)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .width(420.dp)
                .align(Alignment.CenterEnd)
                .background(AppColors.bg)
                .padding(24.dp)
                .focusRequester(focusRequester),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Select Source", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.W700)
                OverlayButton(text = "✕ Close", onClick = onDismiss)
            }

            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${sources.size} playable • ${failedUrls.size} failed",
                color = AppColors.textMuted,
                fontSize = 11.sp,
            )

            Spacer(modifier = Modifier.height(16.dp))

            val grouped = sources.groupBy { it.providerName ?: it.provider ?: "Unknown" }

            LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                grouped.forEach { (provider, providerSources) ->
                    item(key = "hdr-$provider") {
                        Text(
                            text = provider.uppercase(),
                            color = AppColors.red,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.W800,
                            letterSpacing = 1.sp,
                            modifier = Modifier.padding(top = 10.dp, bottom = 4.dp),
                        )
                    }

                    items(providerSources, key = { "${it.provider}-${it.url.hashCode()}" }) { source ->
                        SourceItem(
                            source = source,
                            isSelected = source.url == selectedSource.url,
                            isFailed = source.url in failedUrls,
                            onClick = { onSelect(source) },
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SourceItem(
    source: StreamSource,
    isSelected: Boolean,
    isFailed: Boolean,
    onClick: () -> Unit,
) {
    var isFocused by remember { mutableStateOf(false) }

    Surface(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .onFocusChanged { isFocused = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = when {
                isFailed -> Color.Red.copy(alpha = 0.08f)
                isSelected -> AppColors.red.copy(alpha = 0.15f)
                else -> AppColors.card
            },
            focusedContainerColor = when {
                isFailed -> Color.Red.copy(alpha = 0.15f)
                isSelected -> AppColors.red.copy(alpha = 0.25f)
                else -> AppColors.cardHover
            },
        ),
        border = ClickableSurfaceDefaults.border(
            border = Border(
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    when {
                        isFailed -> Color.Red.copy(alpha = 0.3f)
                        isSelected -> AppColors.red
                        else -> AppColors.border
                    },
                ),
                shape = RoundedCornerShape(8.dp),
            ),
            focusedBorder = Border(
                border = androidx.compose.foundation.BorderStroke(2.dp, if (isSelected) AppColors.red else Color.White),
                shape = RoundedCornerShape(8.dp),
            ),
        ),
        scale = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (isSelected) {
                Text("▶", color = AppColors.red, fontSize = 14.sp, modifier = Modifier.padding(end = 8.dp))
            }
            if (isFailed) {
                Text("✕", color = Color.Red, fontSize = 14.sp, modifier = Modifier.padding(end = 8.dp))
            }

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = source.serverName ?: source.server ?: "Stream",
                    color = when {
                        isFailed -> Color.Red.copy(alpha = 0.6f)
                        isFocused || isSelected -> Color.White
                        else -> AppColors.textMuted
                    },
                    fontSize = 13.sp,
                    fontWeight = FontWeight.W600,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    text = buildString {
                        if (source.isM3U8) append("HLS") else append("MP4")
                        source.type?.let { append(" • $it") }
                        if (isFailed) append(" • FAILED")
                    },
                    color = if (isFailed) Color.Red.copy(alpha = 0.4f) else AppColors.textMuted.copy(alpha = 0.6f),
                    fontSize = 10.sp,
                )
            }

            source.quality?.let { quality ->
                Text(
                    text = quality,
                    modifier = Modifier
                        .background(
                            when {
                                isFailed -> Color.Red.copy(alpha = 0.2f)
                                isSelected -> AppColors.red
                                else -> AppColors.cardHover
                            },
                            RoundedCornerShape(4.dp),
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                    color = if (isFailed) Color.Red else Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.W700,
                )
            }
        }
    }
}

// ─── Loading / Error ─────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun LoadingState(providerCount: Int) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Loading sources...", color = AppColors.textMuted, fontSize = 16.sp)
            if (providerCount > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "($providerCount providers found)",
                    color = AppColors.textMuted.copy(alpha = 0.6f),
                    fontSize = 13.sp,
                )
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ErrorState(error: String?, failedCount: Int, onBack: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                error ?: "No sources available",
                color = AppColors.red,
                fontSize = 16.sp,
            )
            if (failedCount > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "$failedCount sources tried and failed",
                    color = AppColors.textMuted,
                    fontSize = 12.sp,
                )
            }
            Spacer(modifier = Modifier.height(20.dp))
            OverlayButton(text = "← Go Back", onClick = onBack)
        }
    }
}
