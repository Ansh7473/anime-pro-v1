package com.watchanimez.tv.data.repository

import android.util.Log
import com.watchanimez.tv.data.api.AnimeApi
import com.watchanimez.tv.data.model.StreamSource
import com.watchanimez.tv.data.model.Subtitle
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import javax.inject.Inject
import javax.inject.Singleton

data class StreamResult(
    val sources: List<StreamSource> = emptyList(),
    val subtitles: List<Subtitle> = emptyList(),
)

@Singleton
class StreamRepository @Inject constructor(private val api: AnimeApi) {

    private val providers = listOf(
        "animelok", "miruro", "animetsu", "aniwaves",
        "animepahe", "nineanime", "desidub", "ahd",
        "toonstream", "watchanimeworld", "animen", "animixstream",
    )

    fun getSourcesProgressively(animeId: Int, episode: Int): Flow<StreamResult> = flow {
        val accSources = mutableListOf<StreamSource>()
        val accSubtitles = mutableListOf<Subtitle>()
        val seenSubUrls = mutableSetOf<String>()

        coroutineScope {
            val jobs = providers.map { provider ->
                async {
                    try {
                        val response = api.getSourcesByProvider(provider, animeId, episode)
                        val sources = response.data?.sources.orEmpty()
                        val subs = response.data?.subtitles.orEmpty()
                        sources to subs
                    } catch (e: Exception) {
                        Log.d("StreamRepo", "Provider $provider failed: ${e.message}")
                        emptyList<StreamSource>() to emptyList<Subtitle>()
                    }
                }
            }

            for (job in jobs) {
                val (sources, subs) = job.await()
                if (sources.isNotEmpty()) {
                    accSources.addAll(sources)
                }
                // Dedupe subtitles by URL
                for (sub in subs) {
                    val url = sub.url ?: continue
                    if (seenSubUrls.add(url)) {
                        accSubtitles.add(sub)
                    }
                }
                if (sources.isNotEmpty() || subs.isNotEmpty()) {
                    emit(StreamResult(accSources.toList(), accSubtitles.toList()))
                }
            }
        }
    }.flowOn(Dispatchers.IO)

    suspend fun getSources(animeId: Int, episode: Int): List<StreamSource> =
        api.getSources(animeId, episode).data?.sources.orEmpty()
}
