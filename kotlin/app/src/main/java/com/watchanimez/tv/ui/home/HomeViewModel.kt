package com.watchanimez.tv.ui.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.data.model.HomeData
import com.watchanimez.tv.data.model.WatchHistory
import com.watchanimez.tv.data.repository.AnimeRepository
import com.watchanimez.tv.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

data class HomeUiState(
    val isLoading: Boolean = true,
    val homeData: HomeData? = null,
    val continueWatching: List<WatchHistory> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val animeRepo: AnimeRepository,
    private val authRepo: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val isLoggedIn: StateFlow<Boolean> = authRepo.isLoggedIn
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), false)

    init {
        loadHome()
    }

    fun loadHome() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                Log.d("HomeViewModel", "Fetching home data...")
                val homeData = withContext(NonCancellable) {
                    animeRepo.getHome()
                }
                Log.d("HomeViewModel", "Home data received: trending=${homeData?.trending?.size}")
                _uiState.update { it.copy(isLoading = false, homeData = homeData) }

                // Load continue watching if logged in (non-blocking)
                loadContinueWatching()
            } catch (e: Exception) {
                Log.e("HomeViewModel", "Home request failed", e)
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    private fun loadContinueWatching() {
        viewModelScope.launch {
            try {
                val history = authRepo.getHistory()
                // Only show incomplete entries, sorted by most recent
                val continueList = history
                    .filter { !it.completed && it.progress > 0 }
                    .sortedByDescending { it.lastWatchedAt }
                    .take(20)
                _uiState.update { it.copy(continueWatching = continueList) }
            } catch (e: Exception) {
                // Not logged in or API error — silently ignore
                Log.d("HomeViewModel", "Continue watching unavailable: ${e.message}")
            }
        }
    }

    fun retryIfNeeded() {
        if (_uiState.value.homeData == null && !_uiState.value.isLoading) {
            loadHome()
        }
    }
}
