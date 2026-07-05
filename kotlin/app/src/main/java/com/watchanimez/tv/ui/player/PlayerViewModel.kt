package com.watchanimez.tv.ui.player

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.StreamSource
import com.watchanimez.tv.data.repository.StreamRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PlayerUiState(
    val isLoading: Boolean = true,
    val sources: List<StreamSource> = emptyList(),
    val playableSources: List<StreamSource> = emptyList(),
    val selectedSource: StreamSource? = null,
    val error: String? = null,
    val providerCount: Int = 0,
    val failedUrls: Set<String> = emptySet(),
)

@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val streamRepo: StreamRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(PlayerUiState())
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()
    private var loadedKey: String? = null

    fun loadSources(animeId: Int, episodeNumber: Int) {
        val key = "$animeId:$episodeNumber"
        if (key == loadedKey && _uiState.value.selectedSource != null) return
        loadedKey = key

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, sources = emptyList(), playableSources = emptyList(), selectedSource = null, failedUrls = emptySet()) }

            streamRepo.getSourcesProgressively(animeId, episodeNumber)
                .catch { e ->
                    Log.e("PlayerVM", "Stream error", e)
                    if (_uiState.value.sources.isEmpty()) {
                        _uiState.update { it.copy(isLoading = false, error = e.message) }
                    }
                }
                .collect { allSources ->
                    // Filter: remove embeds (webpage URLs, not direct video) and already-failed URLs
                    val failed = _uiState.value.failedUrls
                    val playable = allSources.filter { !it.isEmbed && it.url !in failed }

                    val best = _uiState.value.selectedSource?.takeIf { it.url !in failed }
                        ?: pickBestSource(playable)

                    Log.d("PlayerVM", "Got ${allSources.size} total, ${playable.size} playable, selected=${best?.provider}/${best?.quality}")
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            sources = allSources,
                            playableSources = playable,
                            selectedSource = best,
                            providerCount = allSources.map { s -> s.provider }.distinct().size,
                        )
                    }
                }
        }
    }

    fun selectSource(source: StreamSource) {
        _uiState.update { it.copy(selectedSource = source) }
    }

    /** Called when ExoPlayer gets a 403/error — marks URL as failed and picks next source */
    fun onSourceFailed(failedSource: StreamSource) {
        Log.w("PlayerVM", "Source failed: ${failedSource.provider}/${failedSource.quality} → ${failedSource.url.take(80)}")
        _uiState.update { state ->
            val newFailed = state.failedUrls + failedSource.url
            val remaining = state.playableSources.filter { it.url !in newFailed }
            val next = pickBestSource(remaining)
            state.copy(
                failedUrls = newFailed,
                playableSources = remaining,
                selectedSource = next,
                error = if (next == null) "All sources failed (${newFailed.size} tried)" else null,
            )
        }
    }

    private fun pickBestSource(sources: List<StreamSource>): StreamSource? {
        // Prefer HLS > progressive, prefer higher quality labels
        return sources.firstOrNull { it.isM3U8 && it.quality?.contains("1080", ignoreCase = true) == true }
            ?: sources.firstOrNull { it.isM3U8 && it.quality?.contains("720", ignoreCase = true) == true }
            ?: sources.firstOrNull { it.isM3U8 }
            ?: sources.firstOrNull { it.quality?.contains("1080", ignoreCase = true) == true }
            ?: sources.firstOrNull { it.quality?.contains("720", ignoreCase = true) == true }
            ?: sources.firstOrNull()
    }
}
