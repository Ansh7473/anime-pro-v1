package com.watchanimez.tv.data.model

import kotlinx.serialization.Serializable

@Serializable
data class WatchHistory(
    val id: String? = null,
    val userId: String? = null,
    val profileId: String? = null,
    val animeId: String = "",
    val animeTitle: String? = null,
    val animePoster: String? = null,
    val episodeNumber: Int = 0,
    val progress: Double = 0.0,
    val duration: Double = 0.0,
    val lastWatchedAt: String? = null,
    val completed: Boolean = false,
)

@Serializable
data class WatchlistEntry(
    val id: String? = null,
    val animeId: String = "",
    val animeTitle: String? = null,
    val animePoster: String? = null,
    val status: String = "PLANNING",
)

@Serializable
data class WatchlistStatusResponse(
    val inWatchlist: Boolean = false,
    val status: String? = null,
)

@Serializable
data class FavoriteEntry(
    val id: String? = null,
    val animeId: String = "",
    val animeTitle: String? = null,
    val animePoster: String? = null,
)

@Serializable
data class FavoriteStatusResponse(
    val isFavorite: Boolean = false,
)
