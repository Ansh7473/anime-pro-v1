package com.watchanimez.tv.data.api

import com.watchanimez.tv.data.model.*
import retrofit2.http.*

interface AnimeApi {

    // ── AniList ──
    @GET("anilist/home")
    suspend fun getHome(): HomeResponse

    @GET("anilist/anime/{id}")
    suspend fun getAnimeDetail(@Path("id") id: Int): AnimeDetailResponse

    @GET("anilist/search")
    suspend fun search(
        @Query("q") query: String,
        @Query("page") page: Int = 1,
        @Query("perPage") perPage: Int = 20,
        @Query("sort") sort: String? = null,
        @Query("genres") genres: String? = null,
        @Query("year") year: Int? = null,
        @Query("format") format: String? = null,
        @Query("status") status: String? = null,
    ): SearchResponse

    @GET("anilist/recommendations/{id}")
    suspend fun getRecommendations(@Path("id") id: Int): RecommendationsResponse

    // ── Streaming ──
    @GET("streaming/episode-metadata")
    suspend fun getEpisodeMetadata(
        @Query("animeId") animeId: Int,
    ): EpisodeMetadataResponse

    @GET("streaming/sources")
    suspend fun getSources(
        @Query("animeId") animeId: Int,
        @Query("ep") episode: Int,
    ): StreamSourceResponse

    @GET("streaming/sources/{provider}")
    suspend fun getSourcesByProvider(
        @Path("provider") provider: String,
        @Query("animeId") animeId: Int,
        @Query("ep") episode: Int,
    ): StreamSourceResponse

    // ── Auth ──
    @POST("auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: Map<String, String>): AuthResponse

    // ── User (requires JWT) ──
    @GET("user/me")
    suspend fun getMe(): User

    @GET("user/history")
    suspend fun getHistory(@Query("profileId") profileId: String? = null): List<WatchHistory>

    @POST("user/history")
    suspend fun updateHistory(@Body body: WatchHistory): WatchHistory

    @GET("user/watchlist")
    suspend fun getWatchlist(): List<WatchlistEntry>

    @POST("user/watchlist")
    suspend fun addToWatchlist(@Body body: Map<String, String>): WatchlistEntry

    @DELETE("user/watchlist/{animeId}")
    suspend fun removeFromWatchlist(@Path("animeId") animeId: String)

    @GET("user/watchlist/{animeId}/status")
    suspend fun getWatchlistStatus(@Path("animeId") animeId: String): WatchlistStatusResponse

    @GET("user/favorites")
    suspend fun getFavorites(): List<FavoriteEntry>

    @POST("user/favorites")
    suspend fun addToFavorites(@Body body: Map<String, String>): FavoriteEntry

    @DELETE("user/favorites/{animeId}")
    suspend fun removeFromFavorites(@Path("animeId") animeId: String)

    @GET("user/favorites/{animeId}/status")
    suspend fun getFavoriteStatus(@Path("animeId") animeId: String): FavoriteStatusResponse
}
