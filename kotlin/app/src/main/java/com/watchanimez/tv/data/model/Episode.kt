package com.watchanimez.tv.data.model

import kotlinx.serialization.Serializable

@Serializable
data class Episode(
    val id: String? = null,
    val number: Int,
    val title: String? = null,
    val image: String? = null,
    val description: String? = null,
    val aired: String? = null,
    val isFiller: Boolean = false,
)

@Serializable
data class EpisodeMetadataResponse(
    val provider: String? = null,
    val status: Int? = null,
    val data: EpisodeData? = null,
)

@Serializable
data class EpisodeData(
    val episodes: List<Episode> = emptyList(),
    val totalEpisodes: Int? = null,
    val provider: String? = null,
)
