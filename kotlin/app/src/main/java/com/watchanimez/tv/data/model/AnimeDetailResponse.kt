package com.watchanimez.tv.data.model

import kotlinx.serialization.Serializable

@Serializable
data class AnimeDetailResponse(
    val data: Anime? = null,
)

@Serializable
data class SearchResponse(
    val data: List<Anime> = emptyList(),
    val pagination: SearchPagination? = null,
)

@Serializable
data class SearchPagination(
    val has_next_page: Boolean = false,
)

@Serializable
data class RecommendationsResponse(
    val data: List<Anime> = emptyList(),
)
