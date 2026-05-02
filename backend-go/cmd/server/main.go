package main

import (
	"log"
	"net/http"
	"os"
	"sync"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/server"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

var (
	app  *gin.Engine
	once sync.Once
)

// For local development
func main() {
	// Load .env file if it exists (ignore error if not found in production)
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found or failed to load, proceeding with environment variables")
	}

	initializeApp(false)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("🚀 Go Backend Server starting on port %s", port)
	if err := app.Run(":" + port); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

func initializeApp(enableLogger bool) {
	once.Do(func() {
		_ = config.GetJWTSecret()
		database.InitDB()
		app = server.NewRouter(server.Options{
			ServiceName: "backend-go",
			Logger:      enableLogger,
		})
	})
}

// Handler is the main entry point for Vercel serverless functions
func Handler(w http.ResponseWriter, r *http.Request) {
	initializeApp(true)
	app.ServeHTTP(w, r)
}
