package com.watchanimez.tv.ui.home

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.data.model.HomeData
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
    val continueWatching: List<Anime> = emptyList(),
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
                // NonCancellable: let the HTTP request finish even if the fragment
                // is briefly detached during Leanback entrance animation
                val homeData = withContext(NonCancellable) {
                    animeRepo.getHome()
                }
                Log.d("HomeViewModel", "Home data received: trending=${homeData?.trending?.size}")
                _uiState.update { it.copy(isLoading = false, homeData = homeData) }
            } catch (e: Exception) {
                Log.e("HomeViewModel", "Home request failed", e)
                _uiState.update { it.copy(isLoading = false, error = e.message ?: "Network error") }
            }
        }
    }

    fun retryIfNeeded() {
        if (_uiState.value.homeData == null && !_uiState.value.isLoading) {
            Log.d("HomeViewModel", "Retrying home load...")
            loadHome()
        }
    }
}
