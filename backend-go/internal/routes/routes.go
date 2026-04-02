package routes

import (
	"github.com/Ansh7473/anime-pro/backend-go/internal/handlers"
	"github.com/Ansh7473/anime-pro/backend-go/internal/middleware"
	"github.com/gin-gonic/gin"
)

// SetupRoutes registers all API routes for the backend
func SetupRoutes(r *gin.Engine) {
	// Initialize API version grouping
	v1 := r.Group("/api/v1")
	r.NoRoute(handlers.SmartAssetProxy)

	// 1. Jikan API Routes Group
	jikan := v1.Group("/jikan")
	{
		jikan.GET("/", handlers.JikanInfo)
		jikan.GET("/anime/:id", handlers.JikanAnimeFull)
		jikan.GET("/anime/:id/basic", handlers.JikanAnimeBasic)
		jikan.GET("/search", handlers.JikanSearch)
		jikan.GET("/seasonal/:year/:season", handlers.JikanSeasonal)
		jikan.GET("/seasonal", handlers.JikanSeasonalCurrent) // fallback
		jikan.GET("/top", handlers.JikanTop)
		jikan.GET("/top/anime", handlers.JikanTopAnime)
		jikan.GET("/anime/:id/recommendations", handlers.JikanRecommendations)
		jikan.GET("/anime/:id/characters", handlers.JikanCharacters)
		jikan.GET("/anime/:id/episodes", handlers.JikanEpisodes)
		jikan.GET("/schedule", handlers.JikanSchedule)
		jikan.GET("/seasons/now", handlers.JikanSeasonsNow)
		jikan.GET("/seasons/upcoming", handlers.JikanSeasonsUpcoming)
		jikan.GET("/seasons", handlers.JikanSeasonsList)
		jikan.GET("/anime/:id/relations", handlers.JikanRelations)
		jikan.GET("/health", handlers.JikanHealthCheck)
	}

	// 2. AniList GraphQL API Routes Group
	anilist := v1.Group("/anilist")
	{
		anilist.GET("/home", handlers.AnilistHome)
		anilist.GET("/anime/:id", handlers.AnilistAnime)
		anilist.GET("/search", handlers.AnilistSearch)
		anilist.GET("/characters/:id", handlers.AnilistCharacters)
		anilist.GET("/recommendations/:id", handlers.AnilistRecommendations)
	}

	// 3. Streaming API Routes Group
	streaming := v1.Group("/streaming")
	{
		streaming.GET("/sources/animelok", handlers.StreamingAnimelok)
		streaming.GET("/animelok-slug", handlers.StreamingAnimelokSlug)
		streaming.GET("/sources/desidub", handlers.StreamingDesiDub)
		streaming.GET("/sources/ahd", handlers.StreamingAnimeHindiDubbed)
		streaming.GET("/sources", handlers.StreamingSourcesAggregate)
		streaming.GET("/episode-metadata", handlers.StreamingEpisodeMetadata)
		streaming.GET("/proxy", handlers.StreamingProxy)
	}

	// 4. Dedicated Provider Routes (Optional legacy support)
	animelok := v1.Group("/animelok")
	{
		animelok.GET("/search", handlers.ProviderAnimelokSearch)
		animelok.GET("/metadata/:slug", handlers.ProviderAnimelokMetadata)
		animelok.GET("/sources/:id", handlers.ProviderAnimelokSources)
	}

	desidub := v1.Group("/desidubanime")
	{
		desidub.GET("/search", handlers.ProviderDesidubSearch)
		desidub.GET("/info/:slug", handlers.ProviderDesidubInfo)
		desidub.GET("/sources", handlers.ProviderDesidubSources)
	}

	ahd := v1.Group("/animehindidubbed")
	{
		ahd.GET("/search", handlers.ProviderAHDSearch)
		ahd.GET("/info", handlers.ProviderAHDInfo)
		ahd.GET("/sources", handlers.ProviderAHDSources)
	}

	ahdWP := v1.Group("/animehindidubbed-wp")
	{
		ahdWP.GET("/search", handlers.ProviderAHDWPSearch)
		ahdWP.GET("/latest", handlers.ProviderAHDWPLatest)
		ahdWP.GET("/episodes", handlers.ProviderAHDWPEpisodes)
		ahdWP.GET("/servers", handlers.ProviderAHDWPServers)
		ahdWP.GET("/sources", handlers.ProviderAHDWPSources)
	}

	// Run WebSocket Hub
	go handlers.MainHub.Run()

	// 5. Auth Routes
	auth := v1.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
	}

	// 6. User Routes (Protected)
	user := v1.Group("/user")
	user.Use(middleware.AuthMiddleware())
	{
		user.GET("/me", handlers.GetCurrentUser)
		user.GET("/history", handlers.GetWatchHistory)
		user.POST("/history", handlers.UpdateWatchHistory)
		user.DELETE("/history/:animeId", handlers.DeleteHistory)
		user.GET("/watchlist", handlers.GetWatchlist)
		user.POST("/watchlist", handlers.AddToWatchlist)
		user.DELETE("/watchlist/:animeId", handlers.RemoveFromWatchlist)
		user.GET("/watchlist/:animeId", handlers.GetWatchlistStatus)

		// 7. Profile Management
		user.POST("/profiles", handlers.CreateProfile)
		user.PUT("/profiles/:id", handlers.UpdateProfile)
		user.DELETE("/profiles/:id", handlers.DeleteProfile)

		// 8. Favorites
		user.GET("/favorites", handlers.GetFavorites)
		user.POST("/favorites", handlers.AddToFavorite)
		user.DELETE("/favorites/:animeId", handlers.RemoveFromFavorite)
		user.GET("/favorites/:animeId", handlers.GetFavoriteStatus)

		// 10. Social & Community
		user.POST("/reactions", handlers.ToggleReaction)
		user.GET("/reactions/:animeId/:episode", handlers.GetReactions)
		user.POST("/comments", handlers.CreateComment)
		user.GET("/comments/:animeId/:episode", handlers.GetComments)
		user.DELETE("/comments/:id", handlers.DeleteComment)

		// 11. WebSocket (Live Chat)
		user.GET("/ws", handlers.MainHub.ServeWS)
	}
}
