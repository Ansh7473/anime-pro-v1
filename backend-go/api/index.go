package api

import (
	"log"
	"net/http"
	"sync"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

var (
	app  *gin.Engine
	once sync.Once
)

func initApp() {
	log.Println("🛠️ Initializing Vercel Serverless Backend...")

	gin.SetMode(gin.ReleaseMode)
	app = gin.New()
	
	// Add core middleware
	app.Use(gin.Recovery())
	app.Use(gin.Logger())

	// Database initialization
	log.Println("🔌 Connecting to database...")
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
			"version":  "1.2.0",
		})
	})

	// Routes
	routes.SetupRoutes(app)
	log.Println("✅ Vercel Backend Ready")
}

// Handler is the entry point for Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	// Ensure app is initialized only once
	once.Do(initApp)

	// Additional safety recovery for the top-level handler
	defer func() {
		if err := recover(); err != nil {
			log.Printf("🔥 CRITICAL PANIC in Handler: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}()

	app.ServeHTTP(w, r)
}
