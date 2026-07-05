package com.watchanimez.tv.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.FavoriteEntry
import com.watchanimez.tv.data.model.WatchlistEntry
import com.watchanimez.tv.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class LibraryUiState(
    val isLoading: Boolean = true,
    val watchlist: List<WatchlistEntry> = emptyList(),
    val favorites: List<FavoriteEntry> = emptyList(),
    val error: String? = null,
)

@HiltViewModel
class LibraryViewModel @Inject constructor(
    private val authRepo: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(LibraryUiState())
    val uiState: StateFlow<LibraryUiState> = _uiState.asStateFlow()

    init {
        loadLibrary()
    }

    fun loadLibrary() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val watchlist = authRepo.getWatchlist()
                val favorites = authRepo.getFavorites()
                _uiState.update { it.copy(isLoading = false, watchlist = watchlist, favorites = favorites) }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }
}
