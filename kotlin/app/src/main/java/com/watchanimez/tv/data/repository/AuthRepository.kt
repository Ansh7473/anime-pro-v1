package com.watchanimez.tv.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.watchanimez.tv.data.api.AnimeApi
import com.watchanimez.tv.data.model.*
import com.watchanimez.tv.util.Constants
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuthRepository @Inject constructor(
    private val api: AnimeApi,
    private val dataStore: DataStore<Preferences>,
) {
    val tokenFlow: Flow<String?> = dataStore.data.map { prefs ->
        prefs[stringPreferencesKey(Constants.KEY_TOKEN)]
    }

    val isLoggedIn: Flow<Boolean> = tokenFlow.map { it != null }

    val profileIdFlow: Flow<String?> = dataStore.data.map { prefs ->
        prefs[stringPreferencesKey(Constants.KEY_PROFILE_ID)]
    }

    suspend fun login(email: String, password: String): AuthResponse {
        val response = api.login(mapOf("email" to email, "password" to password))
        response.token?.let { saveToken(it) }
        response.user?.id?.let { saveUserId(it) }
        response.user?.profiles?.firstOrNull()?.id?.let { saveProfileId(it) }
        return response
    }

    suspend fun register(email: String, password: String, name: String): AuthResponse {
        val response = api.register(mapOf("email" to email, "password" to password, "name" to name))
        response.token?.let { saveToken(it) }
        response.user?.id?.let { saveUserId(it) }
        response.user?.profiles?.firstOrNull()?.id?.let { saveProfileId(it) }
        return response
    }

    suspend fun getMe(): User = api.getMe()

    suspend fun logout() {
        dataStore.edit { it.clear() }
    }

    private suspend fun saveToken(token: String) {
        dataStore.edit { it[stringPreferencesKey(Constants.KEY_TOKEN)] = token }
    }

    private suspend fun saveUserId(userId: String) {
        dataStore.edit { it[stringPreferencesKey(Constants.KEY_USER_ID)] = userId }
    }

    private suspend fun saveProfileId(profileId: String) {
        dataStore.edit { it[stringPreferencesKey(Constants.KEY_PROFILE_ID)] = profileId }
    }

    // ── Watchlist ──
    suspend fun getWatchlist(): List<WatchlistEntry> = api.getWatchlist()

    suspend fun addToWatchlist(animeId: String, title: String?, poster: String?) =
        api.addToWatchlist(buildMap {
            put("animeId", animeId)
            title?.let { put("animeTitle", it) }
            poster?.let { put("animePoster", it) }
        })

    suspend fun removeFromWatchlist(animeId: String) = api.removeFromWatchlist(animeId)

    suspend fun getWatchlistStatus(animeId: String) = api.getWatchlistStatus(animeId)

    // ── Favorites ──
    suspend fun getFavorites(): List<FavoriteEntry> = api.getFavorites()

    suspend fun addToFavorites(animeId: String, title: String?, poster: String?) =
        api.addToFavorites(buildMap {
            put("animeId", animeId)
            title?.let { put("animeTitle", it) }
            poster?.let { put("animePoster", it) }
        })

    suspend fun removeFromFavorites(animeId: String) = api.removeFromFavorites(animeId)

    suspend fun getFavoriteStatus(animeId: String) = api.getFavoriteStatus(animeId)

    // ── Watch History ──
    suspend fun getHistory(profileId: String? = null): List<WatchHistory> = api.getHistory(profileId)

    suspend fun updateHistory(history: WatchHistory) = api.updateHistory(history)
}
