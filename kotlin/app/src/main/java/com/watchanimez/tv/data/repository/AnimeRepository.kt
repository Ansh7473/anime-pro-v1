package com.watchanimez.tv.data.repository

import com.watchanimez.tv.data.api.AnimeApi
import com.watchanimez.tv.data.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AnimeRepository @Inject constructor(private val api: AnimeApi) {

    suspend fun getHome(): HomeData? = withContext(Dispatchers.IO) {
        api.getHome().data
    }

    suspend fun getAnimeDetail(id: Int): Anime? = withContext(Dispatchers.IO) {
        api.getAnimeDetail(id).data
    }

    suspend fun search(
        query: String,
        page: Int = 1,
        sort: String? = null,
        genres: String? = null,
    ): SearchResponse = withContext(Dispatchers.IO) {
        api.search(query, page, sort = sort, genres = genres)
    }

    suspend fun getRecommendations(id: Int): List<Anime> = withContext(Dispatchers.IO) {
        api.getRecommendations(id).data
    }

    suspend fun getEpisodes(animeId: Int): List<Episode> = withContext(Dispatchers.IO) {
        api.getEpisodeMetadata(animeId).data?.episodes.orEmpty()
    }
}
