package com.watchanimez.tv.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.Profile
import com.watchanimez.tv.data.repository.AuthRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoggedIn: Boolean = false,
    val email: String = "",
    val profile: Profile? = null,
    val watchlistCount: Int = 0,
    val favoritesCount: Int = 0,
    val isLoading: Boolean = true,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepo: AuthRepository,
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        viewModelScope.launch {
            authRepo.isLoggedIn.collect { loggedIn ->
                _uiState.update { it.copy(isLoggedIn = loggedIn) }
                if (loggedIn) {
                    loadProfile()
                } else {
                    _uiState.update { it.copy(isLoading = false, email = "", profile = null) }
                }
            }
        }
    }

    private suspend fun loadProfile() {
        _uiState.update { it.copy(isLoading = true) }
        try {
            val user = authRepo.getMe()
            val watchlist = authRepo.getWatchlist()
            val favorites = authRepo.getFavorites()
            _uiState.update {
                it.copy(
                    isLoading = false,
                    email = user.email,
                    profile = user.profiles.firstOrNull(),
                    watchlistCount = watchlist.size,
                    favoritesCount = favorites.size,
                )
            }
        } catch (_: Exception) {
            _uiState.update { it.copy(isLoading = false) }
        }
    }

    fun logout() {
        viewModelScope.launch {
            authRepo.logout()
        }
    }
}
