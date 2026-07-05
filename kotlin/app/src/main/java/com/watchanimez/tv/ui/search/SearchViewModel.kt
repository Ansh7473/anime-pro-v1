package com.watchanimez.tv.ui.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.watchanimez.tv.data.model.Anime
import com.watchanimez.tv.data.repository.AnimeRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val animeRepo: AnimeRepository,
) : ViewModel() {

    private val _results = MutableStateFlow<List<Anime>>(emptyList())
    val results: StateFlow<List<Anime>> = _results.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private var searchJob: Job? = null

    fun search(query: String) {
        searchJob?.cancel()
        if (query.length < 2) {
            _results.value = emptyList()
            return
        }
        searchJob = viewModelScope.launch {
            delay(300) // debounce
            _isLoading.value = true
            try {
                val response = animeRepo.search(query)
                _results.value = response.data
            } catch (_: Exception) {
                _results.value = emptyList()
            }
            _isLoading.value = false
        }
    }
}
