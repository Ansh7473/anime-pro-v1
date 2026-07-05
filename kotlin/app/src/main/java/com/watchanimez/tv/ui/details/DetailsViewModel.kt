package com.watchanimez.tv.ui.details

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.data.model.Episode
import com.watchanimez.tv.data.repository.AnimeRepository
import com.watchanimez.tv.data.repository.AuthRepository
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
    val isInWatchlist: Boolean = false,
    val isFavorite: Boolean = false,
    val watchlistLoading: Boolean = false,
    val favoriteLoading: Boolean = false,
)

@HiltViewModel
class DetailsViewModel @Inject constructor(
    private val animeRepo: AnimeRepository,
    private val authRepo: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(DetailsUiState())
    val uiState: StateFlow<DetailsUiState> = _uiState.asStateFlow()
    private var loadedId: Int? = null

    val isLoggedIn: StateFlow<Boolean> = authRepo.isLoggedIn
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    fun loadDetailsFor(id: Int) {
        if (id == loadedId && _uiState.value.anime != null) return
        loadedId = id
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null, isInWatchlist = false, isFavorite = false) }
            try {
                val anime = withContext(NonCancellable) { animeRepo.getAnimeDetail(id) }
                val episodes = withContext(NonCancellable) { animeRepo.getEpisodes(id) }
                Log.d("DetailsVM", "Loaded: ${anime?.title}, ${episodes.size} episodes")
                _uiState.update { it.copy(isLoading = false, anime = anime, episodes = episodes) }
                // Check library status (non-blocking)
                checkLibraryStatus(id)
            } catch (e: Exception) {
                Log.e("DetailsVM", "Failed to load details", e)
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    private fun checkLibraryStatus(id: Int) {
        viewModelScope.launch {
            try {
                val wlStatus = authRepo.getWatchlistStatus(id.toString())
                _uiState.update { it.copy(isInWatchlist = wlStatus.inWatchlist) }
            } catch (_: Exception) { }
        }
        viewModelScope.launch {
            try {
                val favStatus = authRepo.getFavoriteStatus(id.toString())
                _uiState.update { it.copy(isFavorite = favStatus.isFavorite) }
            } catch (_: Exception) { }
        }
    }

    fun toggleWatchlist() {
        val anime = _uiState.value.anime ?: return
        val id = anime.id.toString()
        val isIn = _uiState.value.isInWatchlist
        _uiState.update { it.copy(watchlistLoading = true) }
        viewModelScope.launch {
            try {
                if (isIn) {
                    authRepo.removeFromWatchlist(id)
                } else {
                    authRepo.addToWatchlist(id, anime.title, anime.poster ?: anime.image)
                }
                _uiState.update { it.copy(isInWatchlist = !isIn, watchlistLoading = false) }
            } catch (e: Exception) {
                Log.e("DetailsVM", "Watchlist toggle failed", e)
                _uiState.update { it.copy(watchlistLoading = false) }
            }
        }
    }

    fun toggleFavorite() {
        val anime = _uiState.value.anime ?: return
        val id = anime.id.toString()
        val isFav = _uiState.value.isFavorite
        _uiState.update { it.copy(favoriteLoading = true) }
        viewModelScope.launch {
            try {
                if (isFav) {
                    authRepo.removeFromFavorites(id)
                } else {
                    authRepo.addToFavorites(id, anime.title, anime.poster ?: anime.image)
                }
                _uiState.update { it.copy(isFavorite = !isFav, favoriteLoading = false) }
            } catch (e: Exception) {
                Log.e("DetailsVM", "Favorite toggle failed", e)
                _uiState.update { it.copy(favoriteLoading = false) }
            }
        }
    }
}
