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
		AllowOriginFunc: func(origin string) bool {
			// Allow localhost, the production domains, and all vercel preview domains
			if origin == "" {
				return true
			}
			
			// Exact matches
			if origin == "http://localhost:4001" || 
				   origin == "http://localhost:5173" || 
				   origin == "http://localhost:5174" || 
				   origin == "http://localhost:3000" || 
				   origin == "https://anime-pro-v1-frontend.vercel.app" {
				return true
			}

			// Vercel Preview domain match (ending with .vercel.app)
			if len(origin) > 11 && origin[len(origin)-11:] == ".vercel.app" {
				return true
			}

			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Cache-Status"},
		AllowCredentials: true,
	}))

	// Favicon - handle 404/403 noise
	app.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(204)
	})

	// Health check
	app.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		dbError := ""
		if database.DB != nil {
			dbStatus = "connected"
		} else {
			dbError = "Firestore client not initialized. Check FIREBASE_SERVICE_ACCOUNT_JSON."
		}
		
		c.JSON(200, gin.H{
			"status":   "healthy",
			"service":  "backend-go-vercel",
			"database": dbStatus,
			"db_error": dbError,
			"version":  "1.2.2",
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
