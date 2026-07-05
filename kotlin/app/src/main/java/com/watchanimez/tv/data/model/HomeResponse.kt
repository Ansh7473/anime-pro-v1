package com.watchanimez.tv.data.model

import kotlinx.serialization.Serializable

@Serializable
data class HomeResponse(
    val data: HomeData? = null,
)

@Serializable
data class HomeData(
    val trending: List<Anime> = emptyList(),
    val popular: List<Anime> = emptyList(),
    val topRated: List<Anime> = emptyList(),
    val action: List<Anime> = emptyList(),
    val romance: List<Anime> = emptyList(),
    val movies: List<Anime> = emptyList(),
)
