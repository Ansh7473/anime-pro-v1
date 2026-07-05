package com.watchanimez.tv.data.repository

import android.util.Log
import com.watchanimez.tv.data.api.AnimeApi
import com.watchanimez.tv.data.model.StreamSource
import com.watchanimez.tv.data.model.StreamSourceResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class StreamRepository @Inject constructor(private val api: AnimeApi) {

    // ponytail: individual provider endpoints for parallel fetching
    private val providers = listOf(
        "animelok", "miruro", "animetsu", "aniwaves",
        "animepahe", "nineanime", "desidub", "ahd",
        "toonstream", "watchanimeworld", "animen", "animixstream",
    )

    /**
     * Stream sources progressively — emits batches as each provider responds.
     * UI can display sources as they arrive instead of waiting for all.
     */
    fun getSourcesProgressively(animeId: Int, episode: Int): Flow<List<StreamSource>> = flow {
        val accumulated = mutableListOf<StreamSource>()

        // Fire all providers in parallel, emit as each completes
        coroutineScope {
            val jobs = providers.map { provider ->
                async {
                    try {
                        val response = api.getSourcesByProvider(provider, animeId, episode)
                        response.data?.sources.orEmpty()
                    } catch (e: Exception) {
                        Log.d("StreamRepo", "Provider $provider failed: ${e.message}")
                        emptyList()
                    }
                }
            }

            // Collect results as each completes
            for (job in jobs) {
                val sources = job.await()
                if (sources.isNotEmpty()) {
                    accumulated.addAll(sources)
                    emit(accumulated.toList())
                }
            }
        }
    }.flowOn(Dispatchers.IO)

    /**
     * Fallback: single aggregate call (slow but guaranteed).
     */
    suspend fun getSources(animeId: Int, episode: Int): List<StreamSource> =
        api.getSources(animeId, episode).data?.sources.orEmpty()
}
