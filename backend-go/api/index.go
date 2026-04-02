package api

import (
	"log"
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
	log.Println("🛠️ Initializing Modular Vercel Backend...")

	gin.SetMode(gin.ReleaseMode)
	app = gin.New()
	
	// Add core middleware
	app.Use(gin.Recovery())
	app.Use(gin.Logger())

	// Database initialization
	database.InitDB()

	// JWT Config
	_ = config.GetJWTSecret()

	// CORS Setup
	app.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			// Allow known frontend domains
			if origin == "https://anime-pro-v1-frontend.vercel.app" || 
			   origin == "http://localhost:5173" || 
			   origin == "http://localhost:4001" {
				return true
			}
			// Allow Capacitor/Android/iOS native origins
			if origin == "http://localhost" || origin == "capacitor://localhost" {
				return true
			}
			// Allow Vercel preview domains
			if len(origin) > 10 && origin[len(origin)-10:] == ".vercel.app" {
				return true
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With", "Access-Control-Allow-Origin"},
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
			"version":  "1.2.3",
		})
	})

	// Routes
	routes.SetupRoutes(app)
	log.Println("✅ Modular Backend Ready")
}

// Handler is the entry point for Vercel
func Handler(w http.ResponseWriter, r *http.Request) {
	// Ensure app is initialized only once
	once.Do(initApp)
	app.ServeHTTP(w, r)
}
