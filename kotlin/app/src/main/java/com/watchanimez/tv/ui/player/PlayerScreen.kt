package com.watchanimez.tv.ui.player

import android.net.Uri
import android.util.Log
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
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
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultRenderersFactory
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import androidx.media3.exoplayer.source.ProgressiveMediaSource
import androidx.media3.ui.PlayerView
import okhttp3.OkHttpClient
import androidx.media3.datasource.okhttp.OkHttpDataSource
import java.util.concurrent.TimeUnit
import androidx.tv.material3.*
import com.watchanimez.tv.data.model.StreamSource
import com.watchanimez.tv.data.model.Subtitle
import com.watchanimez.tv.ui.theme.AppColors

// Map real provider names -> neutral "Provider N" display names.
private val providerDisplayNames = mapOf(
    "HiAnime" to "Provider 1",              // HiAnime
    "AniNeko" to "Provider 2",              // AniNeko
    "VidSrc" to "Provider 3",               // VidSrc
    "9anime" to "Provider 4",               // 9anime
    "Animelok" to "Provider 5",             // Animelok
    "DesiDubAnime" to "Provider 6",         // DesiDub
    "DesiDub" to "Provider 6",
    "AnimeHindiDubbed" to "Provider 7",     // AHD
    "AnimeHindiDubbed-WP" to "Provider 7",
    "AHD (AnimeHindiDubbed)" to "Provider 7",
    "Toonstream" to "Provider 8",           // Toonstream
    "WatchAnimeWorld" to "Provider 9",      // WatchAnimeWorld
    "Aniwaves" to "Provider 10",            // Aniwaves
    "Animen" to "Provider 11",              // Animen
    "AnimixStream" to "Provider 12",        // AnimixStream
    "AnimePahe" to "Provider 13",           // AnimePahe
)

private fun neutralizeProvider(raw: String): String {
    providerDisplayNames[raw]?.let { return it }
    for ((key, value) in providerDisplayNames) {
        if (raw.startsWith(key)) return value
    }
    return "Provider"
}

private fun langColor(lang: String): Color = when (lang) {
    "SUB" -> Color(0xFF3B82F6)     // Blue
    "DUB" -> Color(0xFF22C55E)     // Green
    "Hindi" -> Color(0xFFF97316)   // Orange
    "Tamil" -> Color(0xFFA855F7)   // Purple
    "Telugu" -> Color(0xFFEAB308)  // Yellow
    "Multi" -> Color(0xFF06B6D4)   // Cyan
    else -> AppColors.textMuted    // Gray
}

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

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        when {
            uiState.isLoading && uiState.sources.isEmpty() -> LoadingState(uiState.providerCount)
            uiState.error != null && uiState.selectedSource == null -> ErrorState(uiState.error, uiState.failedUrls.size, uiState.retryCount, onRetry = { viewModel.retryFreshSources() }, onBack = onBack)
            uiState.selectedSource != null -> {
                val source = uiState.selectedSource!!

                PlayerContent(source, uiState.subtitles, uiState.subtitlesEnabled, context) { viewModel.onSourceFailed(source) }

                ControlOverlay(
                    episodeNumber = episodeNumber,
                    source = source,
                    providerCount = uiState.providerCount,
                    totalSources = uiState.filteredSources.size,
                    failedCount = uiState.failedUrls.size,
                    subtitlesEnabled = uiState.subtitlesEnabled,
                    subtitleCount = uiState.subtitles.size,
                    selectedLanguage = uiState.selectedLanguage,
                    availableLanguages = uiState.availableLanguages,
                    onPrevious = onPreviousEpisode,
                    onNext = onNextEpisode,
                    onOpenSources = { showSourceSelector = true },
                    onToggleSubtitles = { viewModel.toggleSubtitles() },
                    onSetLanguage = { viewModel.setLanguageFilter(it) },
                    onBack = onBack,
                )

                if (showSourceSelector) {
                    SourceSelectorOverlay(
                        sources = uiState.filteredSources,
                        allSources = uiState.playableSources,
                        selectedSource = source,
                        failedUrls = uiState.failedUrls,
                        availableLanguages = uiState.availableLanguages,
                        selectedLanguage = uiState.selectedLanguage,
                        onSelect = { viewModel.selectSource(it); showSourceSelector = false },
                        onSetLanguage = { viewModel.setLanguageFilter(it) },
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
    source: StreamSource, subtitles: List<Subtitle>, subtitlesEnabled: Boolean,
    context: android.content.Context, onError: () -> Unit,
) {
    val currentOnError by rememberUpdatedState(onError)
    val exoPlayer = remember(source.url) {
        // Use DefaultRenderersFactory with software decoder fallback
        // This ensures HLS/DASH streams play even when hardware decoders are missing (emulator)
        val renderersFactory = DefaultRenderersFactory(context)
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
            .setEnableDecoderFallback(true)

        ExoPlayer.Builder(context, renderersFactory).build().apply {
            val headers = buildMap {
                source.headers?.let { putAll(it) }
                source.referer?.let { put("Referer", it) }
                source.referer?.let { ref -> try { val u = Uri.parse(ref); put("Origin", "${u.scheme}://${u.host}") } catch (_: Exception) {} }
            }
            // Use OkHttp-backed data source for better header/redirect/SSL handling
            val okClient = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .followRedirects(true)
                .followSslRedirects(true)
                .build()
            val dsf = OkHttpDataSource.Factory(okClient).apply {
                setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
                if (headers.isNotEmpty()) setDefaultRequestProperties(headers)
            }
            val subConfigs = subtitles.mapNotNull { sub ->
                val u = sub.url ?: return@mapNotNull null
                MediaItem.SubtitleConfiguration.Builder(Uri.parse(u))
                    .setMimeType(when { u.endsWith(".vtt", true) -> MimeTypes.TEXT_VTT; u.endsWith(".srt", true) -> MimeTypes.APPLICATION_SUBRIP; u.endsWith(".ass", true) || u.endsWith(".ssa", true) -> MimeTypes.TEXT_SSA; else -> MimeTypes.TEXT_VTT })
                    .setLanguage(sub.lang ?: "en").setLabel(sub.lang ?: "English")
                    .setSelectionFlags(C.SELECTION_FLAG_DEFAULT).build()
            }
            // Detect HLS: trust isM3U8 flag, but also sniff URL for .m3u8 extension
            val isHls = source.isM3U8 || source.url.contains(".m3u8", ignoreCase = true)

            // Force MIME type so ExoPlayer uses the correct parser even for proxy/redirect URLs
            val mi = MediaItem.Builder()
                .setUri(source.url)
                .apply { if (isHls) setMimeType(MimeTypes.APPLICATION_M3U8) }
                .setSubtitleConfigurations(subConfigs)
                .build()

            val ms = if (isHls) {
                HlsMediaSource.Factory(dsf)
                    .setAllowChunklessPreparation(true)
                    .createMediaSource(mi)
            } else {
                ProgressiveMediaSource.Factory(dsf).createMediaSource(mi)
            }
            setMediaSource(ms); prepare(); playWhenReady = true
            addListener(object : Player.Listener {
                override fun onPlayerError(error: PlaybackException) { Log.e("Player", "Error: ${error.errorCodeName}"); currentOnError() }
            })
        }
    }
    LaunchedEffect(subtitlesEnabled, exoPlayer) {
        exoPlayer.trackSelectionParameters = exoPlayer.trackSelectionParameters.buildUpon().setTrackTypeDisabled(C.TRACK_TYPE_TEXT, !subtitlesEnabled).build()
    }
    DisposableEffect(source.url) { onDispose { exoPlayer.release() } }
    AndroidView(factory = { PlayerView(it).apply { player = exoPlayer; useController = false } }, update = { it.player = exoPlayer }, modifier = Modifier.fillMaxSize())
}

// ─── Controls ────────────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun ControlOverlay(
    episodeNumber: Int, source: StreamSource, providerCount: Int, totalSources: Int, failedCount: Int,
    subtitlesEnabled: Boolean, subtitleCount: Int, selectedLanguage: String?, availableLanguages: List<String>,
    onPrevious: (() -> Unit)?, onNext: (() -> Unit)?, onOpenSources: () -> Unit,
    onToggleSubtitles: () -> Unit, onSetLanguage: (String?) -> Unit, onBack: () -> Unit,
) {
    Box(modifier = Modifier.fillMaxSize()) {
        // Top bar
        Row(
            modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter)
                .background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = 0.7f), Color.Transparent)))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OverlayButton("← Back", onBack)
            Spacer(Modifier.weight(1f))
            if (onPrevious != null) { OverlayButton("◀ Prev", onPrevious); Spacer(Modifier.width(8.dp)) }
            Text("EP $episodeNumber", modifier = Modifier.background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(6.dp)).padding(horizontal = 12.dp, vertical = 8.dp), color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.W700)
            if (onNext != null) { Spacer(Modifier.width(8.dp)); OverlayButton("Next ▶", onNext) }
        }

        // Bottom bar
        Row(
            modifier = Modifier.fillMaxWidth().align(Alignment.BottomCenter)
                .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f))))
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // Source info with language badge
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    // Language badge
                    val lang = source.audioLanguage
                    Text(lang, modifier = Modifier.background(langColor(lang), RoundedCornerShape(4.dp)).padding(horizontal = 6.dp, vertical = 2.dp), color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.W700)
                    Text(
                        buildString { append(neutralizeProvider(source.providerName ?: source.provider ?: "Source")); source.quality?.let { append(" • $it") }; if (source.isM3U8) append(" • HLS") },
                        color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.W600,
                    )
                }
                Text(buildString { append("$totalSources sources from $providerCount providers"); if (failedCount > 0) append(" • $failedCount failed") }, color = AppColors.textMuted.copy(alpha = 0.7f), fontSize = 10.sp)
            }

            // Language cycle button (cycles through available languages)
            if (availableLanguages.size > 1) {
                OverlayButton(text = selectedLanguage ?: "All", onClick = {
                    val langs = listOf(null) + availableLanguages
                    val idx = langs.indexOf(selectedLanguage)
                    onSetLanguage(langs[(idx + 1) % langs.size])
                })
                Spacer(Modifier.width(6.dp))
            }
            if (subtitleCount > 0) {
                OverlayButton(if (subtitlesEnabled) "CC ✓" else "CC ✗", onToggleSubtitles, accent = subtitlesEnabled)
                Spacer(Modifier.width(6.dp))
            }
            OverlayButton("⚙ Sources ($totalSources)", onOpenSources, accent = true)
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun OverlayButton(text: String, onClick: () -> Unit, accent: Boolean = false) {
    var f by remember { mutableStateOf(false) }
    Surface(onClick = onClick, modifier = Modifier.onFocusChanged { f = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(6.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (accent) AppColors.red.copy(alpha = 0.8f) else Color.Black.copy(alpha = 0.6f),
            focusedContainerColor = if (accent) AppColors.red else Color.White,
        ), scale = ClickableSurfaceDefaults.scale(focusedScale = 1.05f),
    ) { Text(text, Modifier.padding(horizontal = 14.dp, vertical = 8.dp), color = if (f && !accent) Color.Black else Color.White, fontSize = 12.sp, fontWeight = FontWeight.W600) }
}

// ─── Source Selector ─────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SourceSelectorOverlay(
    sources: List<StreamSource>, allSources: List<StreamSource>, selectedSource: StreamSource,
    failedUrls: Set<String>, availableLanguages: List<String>, selectedLanguage: String?,
    onSelect: (StreamSource) -> Unit, onSetLanguage: (String?) -> Unit, onDismiss: () -> Unit,
) {
    val focusRequester = remember { FocusRequester() }
    LaunchedEffect(Unit) { focusRequester.requestFocus() }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.85f))) {
        Column(
            modifier = Modifier.fillMaxHeight().width(440.dp).align(Alignment.CenterEnd)
                .background(AppColors.bg).padding(24.dp).focusRequester(focusRequester),
        ) {
            // Header
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text("Select Source", color = Color.White, fontSize = 20.sp, fontWeight = FontWeight.W700)
                OverlayButton("✕ Close", onDismiss)
            }

            Spacer(Modifier.height(4.dp))
            Text("${sources.size} sources • ${failedUrls.size} failed", color = AppColors.textMuted, fontSize = 11.sp)

            // Language filter tabs
            if (availableLanguages.size > 1) {
                Spacer(Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    // "All" tab
                    item {
                        LanguageTab(label = "All (${allSources.size})", isSelected = selectedLanguage == null, onClick = { onSetLanguage(null) })
                    }
                    items(availableLanguages) { lang ->
                        val count = allSources.count { it.audioLanguage == lang }
                        LanguageTab(label = "$lang ($count)", isSelected = selectedLanguage == lang, color = langColor(lang), onClick = { onSetLanguage(lang) })
                    }
                }
            }

            Spacer(Modifier.height(12.dp))

            // Sources grouped by provider (neutralized names)
                        val grouped = sources.groupBy { neutralizeProvider(it.providerName ?: it.provider ?: "Unknown") }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                grouped.forEach { (provider, providerSources) ->
                    item(key = "hdr-$provider") {
                        Text(provider.uppercase(), color = AppColors.red, fontSize = 11.sp, fontWeight = FontWeight.W800, letterSpacing = 1.sp, modifier = Modifier.padding(top = 10.dp, bottom = 4.dp))
                    }
                    items(providerSources, key = { "${it.provider}-${it.url.hashCode()}" }) { source ->
                        SourceItem(source, isSelected = source.url == selectedSource.url, isFailed = source.url in failedUrls, onClick = { onSelect(source) })
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun LanguageTab(label: String, isSelected: Boolean, color: Color = AppColors.textMuted, onClick: () -> Unit) {
    var f by remember { mutableStateOf(false) }
    Surface(onClick = onClick, modifier = Modifier.onFocusChanged { f = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(16.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) color.copy(alpha = 0.2f) else AppColors.card,
            focusedContainerColor = if (isSelected) color.copy(alpha = 0.35f) else AppColors.cardHover,
        ), border = ClickableSurfaceDefaults.border(
            border = Border(border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) color else AppColors.border), shape = RoundedCornerShape(16.dp)),
            focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, if (isSelected) color else Color.White), shape = RoundedCornerShape(16.dp)),
        ),
    ) {
        Text(label, Modifier.padding(horizontal = 14.dp, vertical = 6.dp), color = if (isSelected || f) Color.White else AppColors.textMuted, fontSize = 12.sp, fontWeight = if (isSelected) FontWeight.W700 else FontWeight.W500)
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun SourceItem(source: StreamSource, isSelected: Boolean, isFailed: Boolean, onClick: () -> Unit) {
    var f by remember { mutableStateOf(false) }
    Surface(onClick = onClick, modifier = Modifier.fillMaxWidth().onFocusChanged { f = it.isFocused },
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = when { isFailed -> Color.Red.copy(alpha = 0.08f); isSelected -> AppColors.red.copy(alpha = 0.15f); else -> AppColors.card },
            focusedContainerColor = when { isFailed -> Color.Red.copy(alpha = 0.15f); isSelected -> AppColors.red.copy(alpha = 0.25f); else -> AppColors.cardHover },
        ), border = ClickableSurfaceDefaults.border(
            border = Border(border = androidx.compose.foundation.BorderStroke(1.dp, when { isFailed -> Color.Red.copy(alpha = 0.3f); isSelected -> AppColors.red; else -> AppColors.border }), shape = RoundedCornerShape(8.dp)),
            focusedBorder = Border(border = androidx.compose.foundation.BorderStroke(2.dp, if (isSelected) AppColors.red else Color.White), shape = RoundedCornerShape(8.dp)),
        ), scale = ClickableSurfaceDefaults.scale(focusedScale = 1.02f),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            if (isSelected) Text("▶", color = AppColors.red, fontSize = 14.sp)
            if (isFailed) Text("✕", color = Color.Red, fontSize = 14.sp)
            // Language badge
            val lang = source.audioLanguage
            Text(lang, modifier = Modifier.background(langColor(lang).copy(alpha = 0.8f), RoundedCornerShape(4.dp)).padding(horizontal = 5.dp, vertical = 2.dp), color = Color.White, fontSize = 9.sp, fontWeight = FontWeight.W700)
            Column(Modifier.weight(1f)) {
                Text(source.serverName ?: source.server ?: source.name ?: "Stream", color = when { isFailed -> Color.Red.copy(0.6f); f || isSelected -> Color.White; else -> AppColors.textMuted }, fontSize = 13.sp, fontWeight = FontWeight.W600, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(buildString { if (source.isM3U8) append("HLS") else append("MP4"); source.type?.let { append(" • $it") }; if (isFailed) append(" • FAILED") }, color = if (isFailed) Color.Red.copy(0.4f) else AppColors.textMuted.copy(0.6f), fontSize = 10.sp)
            }
            source.quality?.let { q ->
                Text(q, Modifier.background(when { isFailed -> Color.Red.copy(0.2f); isSelected -> AppColors.red; else -> AppColors.cardHover }, RoundedCornerShape(4.dp)).padding(horizontal = 8.dp, vertical = 3.dp), color = if (isFailed) Color.Red else Color.White, fontSize = 11.sp, fontWeight = FontWeight.W700)
            }
        }
    }
}

// ─── Loading / Error ─────────────────────────────────────────────────────────

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable private fun LoadingState(providerCount: Int) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Loading sources...", color = AppColors.textMuted, fontSize = 16.sp)
            if (providerCount > 0) { Spacer(Modifier.height(8.dp)); Text("($providerCount providers found)", color = AppColors.textMuted.copy(alpha = 0.6f), fontSize = 13.sp) }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable private fun ErrorState(error: String?, failedCount: Int, retryCount: Int, onRetry: () -> Unit, onBack: () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(error ?: "No sources available", color = AppColors.red, fontSize = 16.sp)
            if (failedCount > 0) { Spacer(Modifier.height(4.dp)); Text("$failedCount sources tried and failed", color = AppColors.textMuted, fontSize = 12.sp) }
            Spacer(Modifier.height(20.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (retryCount < 3) OverlayButton("🔄 Retry Fresh Sources", onRetry, accent = true)
                OverlayButton("← Go Back", onBack)
            }
            if (retryCount > 0) { Spacer(Modifier.height(8.dp)); Text("Retry attempt $retryCount/3", color = AppColors.textMuted.copy(alpha = 0.5f), fontSize = 11.sp) }
        }
    }
}
