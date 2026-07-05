package com.watchanimez.tv.ui.details

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.data.model.Episode
import com.watchanimez.tv.data.repository.AnimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class DetailsUiState(
    val isLoading: Boolean = true,
    val anime: Anime? = null,
    val episodes: List<Episode> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class DetailsViewModel @Inject constructor(
    private val animeRepo: AnimeRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DetailsUiState())
    val uiState: StateFlow<DetailsUiState> = _uiState.asStateFlow()
    private var loadedId: Int? = null

    fun loadDetailsFor(id: Int) {
        if (id == loadedId && _uiState.value.anime != null) return
        loadedId = id
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val anime = withContext(NonCancellable) { animeRepo.getAnimeDetail(id) }
                val episodes = withContext(NonCancellable) { animeRepo.getEpisodes(id) }
                Log.d("DetailsViewModel", "Loaded: ${anime?.title}, ${episodes.size} episodes")
                _uiState.update { it.copy(isLoading = false, anime = anime, episodes = episodes) }
            } catch (e: Exception) {
                Log.e("DetailsViewModel", "Failed to load details", e)
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
