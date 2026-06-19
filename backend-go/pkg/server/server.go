package server

import (
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/routes"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

const Version = "1.2.2"

type Options struct {
	ServiceName string
	Logger      bool
}

func NewRouter(options Options) *gin.Engine {
	if options.ServiceName == "" {
		options.ServiceName = "backend-go"
	}

	gin.SetMode(gin.ReleaseMode)

	app := gin.New()
	app.Use(gin.Recovery())
	if options.Logger {
		app.Use(gin.Logger())
	}
	app.Use(func(c *gin.Context) {
		c.Header("X-Robots-Tag", "noindex, nofollow")
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	})

	app.Use(cors.New(cors.Config{
		AllowOriginFunc:  allowOrigin,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"},
		AllowHeaders:     []string{"Origin", "Content-Length", "Content-Type", "Authorization", "Accept", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Cache-Status"},
		AllowCredentials: true,
	}))

	app.GET("/favicon.ico", func(c *gin.Context) {
		c.Status(204)
	})

	app.GET("/health", func(c *gin.Context) {
		dbStatus := "disconnected"
		dbError := ""
		if database.DB != nil {
			dbStatus = "connected"
		} else {
			dbError = "database client is not initialized"
		}

		c.JSON(200, gin.H{
			"status":   "healthy",
			"service":  options.ServiceName,
			"version":  Version,
			"database": dbStatus,
			"db_error": dbError,
		})
	})

	app.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"name":          "WatchAnimez Backend API",
			"version":       Version,
			"description":   "Shared API and streaming proxy layer for WatchAnimez clients",
			"documentation": "See /api/v1/jikan for available endpoints",
		})
	})

	routes.SetupRoutes(app)
	return app
}

func allowOrigin(origin string) bool {
	if origin == "" {
		return true
	}

	allowedOrigins := map[string]bool{
		"http://localhost:3000":                        true,
		"http://localhost:4001":                        true,
		"http://localhost:5173":                        true,
		"http://localhost:5174":                        true,
		"https://anime-pro-v1.anshsoni310.workers.dev": true,
		"https://watchanimez.me":                        true,
		"https://www.watchanimez.me":                    true,
		"https://anime-pro-v1-frontend.vercel.app":     true,
	}
	if allowedOrigins[origin] {
		return true
	}

	return strings.HasSuffix(origin, ".vercel.app")
}
