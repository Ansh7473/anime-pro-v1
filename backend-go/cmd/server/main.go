package main

import (
	"log"
	"net/http"
	"os"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var app *gin.Engine

func init() {
	// Load .env file if it exists (ignore error if not found in production)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found or failed to load, proceeding with environment variables")
	}

	// Initialize JWT secret AFTER loading .env
	_ = config.GetJWTSecret()

	// Initialize Database
	database.InitDB()

	// Set Gin to release mode for production
	gin.SetMode(gin.ReleaseMode)

	app = gin.New()

	// Recovery middleware
	app.Use(gin.Recovery())

	// Configure CORS to match working example (Allows Credentials for session/auth)
	app.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:4001", "http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://anime-pro-v1-frontend.vercel.app"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Cache-Status"},
		AllowCredentials: true,
	}))

	// Favicon - Return 204 No Content to stop 404 noise
	app.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(204)
	})

	// Health check
	app.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		if database.DB != nil {
			dbStatus = "connected"
		}
		c.JSON(200, gin.H{
			"status":   "healthy",
			"service":  "backend-go",
			"version":  "1.1.0",
			"database": dbStatus,
		})
	})

	// API Info
	app.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"name":          "Anime Pro Backend API (Go)",
			"version":       "1.1.0",
			"description":   "High-performance Go backend for anime streaming platform",
			"documentation": "See /api/v1/jikan for available endpoints",
		})
	})

	// Initialize routes
	routes.SetupRoutes(app)
}

// Handler is the main entry point for Vercel serverless functions
func Handler(w http.ResponseWriter, r *http.Request) {
	app.ServeHTTP(w, r)
}

// For local development
func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("🚀 Go Backend Server starting on port %s", port)
	if err := app.Run(":" + port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}
