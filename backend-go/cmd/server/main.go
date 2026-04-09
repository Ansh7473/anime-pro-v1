package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/routes"
	"github.com/joho/godotenv"
	"github.com/syumai/workers"
)

var mux *http.ServeMux

func initApp() {
	_ = config.GetJWTSecret()
	database.InitDB()
	
	mux = http.NewServeMux()
	
	// API Info
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"name":"Anime Pro Edge API","version":"2.0.0-cf"}`)
	})

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"healthy"}`)
	})

	// Initialize routes (to be updated to use mux)
	routes.SetupRoutes(mux)
}

func main() {
	_ = godotenv.Load()
	initApp()

	if os.Getenv("WORKER_MODE") == "true" {
		log.Printf("🚀 Starting Cloudflare Worker")
		workers.Serve(mux)
		return
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}
	log.Printf("🚀 Server starting on port %s", port)
	http.ListenAndServe(":"+port, mux)
}

func Handler(w http.ResponseWriter, r *http.Request) {
	if mux == nil {
		initApp()
	}
	mux.ServeHTTP(w, r)
}
