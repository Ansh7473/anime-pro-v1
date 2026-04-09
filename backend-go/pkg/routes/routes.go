package routes

import (
	"net/http"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/handlers"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/middleware"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
)

func SetupRoutes(mux *http.ServeMux) {
	// Root/Health
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(200)
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Public Routes (No Auth required)
	mux.HandleFunc("GET /api/v1/jikan/", utils.ToStd(handlers.JikanInfo))
	mux.HandleFunc("GET /api/v1/jikan/anime/{id}", utils.ToStd(handlers.JikanAnimeFull))
	mux.HandleFunc("GET /api/v1/jikan/anime/{id}/basic", utils.ToStd(handlers.JikanAnimeBasic))
	mux.HandleFunc("GET /api/v1/jikan/search", utils.ToStd(handlers.JikanSearch))
	mux.HandleFunc("GET /api/v1/jikan/top", utils.ToStd(handlers.JikanTop))
	mux.HandleFunc("GET /api/v1/jikan/schedule", utils.ToStd(handlers.JikanSchedule))

	mux.HandleFunc("GET /api/v1/anilist/home", utils.ToStd(handlers.AnilistHome))
	mux.HandleFunc("GET /api/v1/anilist/anime/{id}", utils.ToStd(handlers.AnilistAnime))
	mux.HandleFunc("GET /api/v1/anilist/search", utils.ToStd(handlers.AnilistSearch))

	mux.HandleFunc("GET /api/v1/streaming/sources", utils.ToStd(handlers.StreamingSourcesAggregate))
	mux.HandleFunc("GET /api/v1/streaming/proxy", utils.ToStd(handlers.StreamingProxy))

	// Auth Routes
	mux.HandleFunc("POST /api/v1/auth/register", utils.ToStd(handlers.Register))
	mux.HandleFunc("POST /api/v1/auth/login", utils.ToStd(handlers.Login))

	// Protected Routes (Auth Required)
	auth := middleware.AuthMiddleware
	db := middleware.DBMiddleware

	mux.HandleFunc("GET /api/v1/user/me", utils.ToStd(utils.Chain(handlers.GetCurrentUser, db, auth)))
	mux.HandleFunc("GET /api/v1/user/history", utils.ToStd(utils.Chain(handlers.GetWatchHistory, db, auth)))
	mux.HandleFunc("POST /api/v1/user/history", utils.ToStd(utils.Chain(handlers.UpdateWatchHistory, db, auth)))
	mux.HandleFunc("GET /api/v1/user/watchlist", utils.ToStd(utils.Chain(handlers.GetWatchlist, db, auth)))
	mux.HandleFunc("POST /api/v1/user/watchlist", utils.ToStd(utils.Chain(handlers.AddToWatchlist, db, auth)))
	
	// Social
	mux.HandleFunc("POST /api/v1/social/reaction", utils.ToStd(utils.Chain(handlers.ToggleReaction, db, auth)))
	mux.HandleFunc("GET /api/v1/social/reactions", utils.ToStd(utils.Chain(handlers.GetReactions, db)))

	// Real-time (Conditional build)
	mux.HandleFunc("GET /api/v1/chat/token", utils.ToStd(utils.Chain(handlers.GetChatToken, auth)))
	mux.HandleFunc("GET /api/v1/ws", utils.ToStd(handlers.MainHub.ServeWS))
}
