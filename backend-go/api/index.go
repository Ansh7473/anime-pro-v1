package api

import (
	"log"
	"net/http"
	"sync"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/server"
	"github.com/gin-gonic/gin"
)

var (
	app  *gin.Engine
	once sync.Once
)

func initApp() {
	log.Println("Initializing Vercel serverless backend")
	_ = config.GetJWTSecret()
	database.InitDB()
	app = server.NewRouter(server.Options{
		ServiceName: "backend-go-vercel",
		Logger:      true,
	})
	log.Println("Vercel backend ready")
}

// Handler is the entry point for Vercel.
func Handler(w http.ResponseWriter, r *http.Request) {
	once.Do(initApp)

	defer func() {
		if err := recover(); err != nil {
			log.Printf("critical panic in handler: %v", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		}
	}()

	app.ServeHTTP(w, r)
}
