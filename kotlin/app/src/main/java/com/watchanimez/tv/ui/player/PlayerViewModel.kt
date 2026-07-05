package com.watchanimez.tv.ui.player

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.StreamSource
import com.watchanimez.tv.data.model.Subtitle
import com.watchanimez.tv.data.model.WatchHistory
import com.watchanimez.tv.data.repository.AuthRepository
import com.watchanimez.tv.data.repository.StreamRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val isLoading: Boolean = true,
    val sources: List<StreamSource> = emptyList(),
    val playableSources: List<StreamSource> = emptyList(),
    val subtitles: List<Subtitle> = emptyList(),
    val selectedSource: StreamSource? = null,
    val subtitlesEnabled: Boolean = true,
    val error: String? = null,
    val providerCount: Int = 0,
    val failedUrls: Set<String> = emptySet(),
    val availableLanguages: List<String> = emptyList(),
    val selectedLanguage: String? = null,
    val filteredSources: List<StreamSource> = emptyList(),
    val retryCount: Int = 0,
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val streamRepo: StreamRepository,
    private val authRepo: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()
    private var loadedAnimeId: Int = 0
    private var loadedEpisode: Int = 0

    fun loadSources(animeId: Int, episodeNumber: Int) {
        loadedAnimeId = animeId
        loadedEpisode = episodeNumber

        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true, error = null,
                    sources = emptyList(), playableSources = emptyList(),
                    subtitles = emptyList(), selectedSource = null,
                    failedUrls = emptySet(), availableLanguages = emptyList(),
                    selectedLanguage = null, filteredSources = emptyList(),
                )
            }
            collectSources(animeId, episodeNumber)
        }
    }

    /** Retry with fresh URLs from API (tokens expire) */
    fun retryFreshSources() {
        val retry = _uiState.value.retryCount + 1
        if (retry > 3) {
            _uiState.update { it.copy(error = "All retries exhausted. Sources may be unavailable for this episode.") }
            return
        }
        Log.d("PlayerVM", "Retrying with fresh URLs (attempt $retry)")
        viewModelScope.launch {
            _uiState.update {
                it.copy(
                    isLoading = true, error = null,
                    sources = emptyList(), playableSources = emptyList(),
                    subtitles = emptyList(), selectedSource = null,
                    failedUrls = emptySet(), filteredSources = emptyList(),
                    retryCount = retry,
                )
            }
            collectSources(loadedAnimeId, loadedEpisode)
        }
    }

    private suspend fun collectSources(animeId: Int, episodeNumber: Int) {
        streamRepo.getSourcesProgressively(animeId, episodeNumber)
            .catch { e ->
                Log.e("PlayerVM", "Stream error", e)
                if (_uiState.value.sources.isEmpty()) {
                    _uiState.update { it.copy(isLoading = false, error = e.message) }
                }
            }
            .collect { result ->
                val failed = _uiState.value.failedUrls
                val playable = result.sources.filter { !it.isEmbed && it.url !in failed }

                val langs = playable.map { it.audioLanguage }.distinct()
                val ordered = buildList {
                    if ("SUB" in langs) add("SUB")
                    if ("DUB" in langs) add("DUB")
                    addAll(langs.filter { it != "SUB" && it != "DUB" })
                }

                val langFilter = _uiState.value.selectedLanguage
                val filtered = if (langFilter != null) playable.filter { it.audioLanguage == langFilter } else playable
                val best = _uiState.value.selectedSource?.takeIf { it.url !in failed && (langFilter == null || it.audioLanguage == langFilter) }
                    ?: pickBestSource(filtered)

                Log.d("PlayerVM", "Got ${result.sources.size} sources, ${playable.size} playable, langs=$ordered, selected=${best?.provider}/${best?.quality}/${best?.audioLanguage}")
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        sources = result.sources,
                        playableSources = playable,
                        subtitles = result.subtitles,
                        selectedSource = best,
                        providerCount = result.sources.map { s -> s.provider }.distinct().size,
                        availableLanguages = ordered,
                        filteredSources = filtered,
                    )
                }
            }
    }

    fun selectSource(source: StreamSource) {
        _uiState.update { it.copy(selectedSource = source) }
    }

    fun setLanguageFilter(language: String?) {
        _uiState.update { state ->
            val filtered = if (language != null) state.playableSources.filter { it.audioLanguage == language } else state.playableSources
            val newSelected = if (state.selectedSource != null && (language == null || state.selectedSource.audioLanguage == language)) {
                state.selectedSource
            } else {
                pickBestSource(filtered)
            }
            state.copy(selectedLanguage = language, filteredSources = filtered, selectedSource = newSelected)
        }
    }

    fun toggleSubtitles() {
        _uiState.update { it.copy(subtitlesEnabled = !it.subtitlesEnabled) }
    }

    fun onSourceFailed(failedSource: StreamSource) {
        Log.w("PlayerVM", "Source failed: ${failedSource.provider}/${failedSource.quality} url=${failedSource.url.take(60)}")
        _uiState.update { state ->
            val newFailed = state.failedUrls + failedSource.url
            val remaining = state.playableSources.filter { it.url !in newFailed }
            val langFilter = state.selectedLanguage
            val filtered = if (langFilter != null) remaining.filter { it.audioLanguage == langFilter } else remaining
            val next = pickBestSource(filtered)
            state.copy(
                failedUrls = newFailed,
                playableSources = remaining,
                filteredSources = filtered,
                selectedSource = next,
                error = if (next == null) "All ${newFailed.size} sources failed — tap Retry for fresh URLs" else null,
            )
        }
    }

    fun saveProgress(animeId: Int, episode: Int, positionMs: Long, durationMs: Long, title: String?, poster: String?) {
        if (durationMs <= 0) return
        viewModelScope.launch {
            try {
                authRepo.updateHistory(WatchHistory(
                    animeId = animeId.toString(),
                    animeTitle = title,
                    animePoster = poster,
                    episodeNumber = episode,
                    progress = positionMs.toDouble(),
                    duration = durationMs.toDouble(),
                    completed = positionMs.toDouble() / durationMs.toDouble() > 0.9,
                ))
            } catch (_: Exception) { }
        }
    }

    private fun pickBestSource(sources: List<StreamSource>): StreamSource? {
        return sources.firstOrNull { it.isM3U8 && it.quality?.contains("1080", ignoreCase = true) == true }
            ?: sources.firstOrNull { it.isM3U8 && it.quality?.contains("720", ignoreCase = true) == true }
            ?: sources.firstOrNull { it.isM3U8 }
            ?: sources.firstOrNull { it.quality?.contains("1080", ignoreCase = true) == true }
            ?: sources.firstOrNull { it.quality?.contains("720", ignoreCase = true) == true }
            ?: sources.firstOrNull()
    }
}
