package handler

import (
	"net/http"
	"sync"

	"github.com/Ansh7473/anime-pro/backend-go/internal/config"
	"github.com/Ansh7473/anime-pro/backend-go/internal/database"
	"github.com/Ansh7473/anime-pro/backend-go/internal/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var (
	app  *gin.Engine
	once sync.Once
)

func initApp() {
	// Initialize standard Gin setup
	gin.SetMode(gin.ReleaseMode)
	app = gin.New()
	app.Use(gin.Recovery())

	// Database initialization
	database.InitDB()

	// JWT Config
	_ = config.GetJWTSecret()

	// CORS Setup
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4001", "http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://anime-pro-v1-frontend.vercel.app"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Cache-Status"},
		AllowCredentials: true,
	}))

	// Health check
	app.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		if database.DB != nil {
			dbStatus = "connected"
		}
		c.JSON(200, gin.H{
			"status":   "healthy",
			"service":  "backend-go-vercel",
			"database": dbStatus,
		})
	})

	// Routes
	routes.SetupRoutes(app)
}

// Handler is the entry point for Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(initApp)
	app.ServeHTTP(w, r)
}
