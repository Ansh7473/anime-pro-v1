package database

import (
	"fmt"
	"log"
	"os"

	"github.com/Ansh7473/anime-pro/backend-go/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("⚠️ DATABASE_URL not set, DB features will be disabled")
		return
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	// Automigrate models
	err = db.AutoMigrate(&models.User{}, &models.Profile{}, &models.WatchHistory{}, &models.Watchlist{}, &models.Favorite{}, &models.Reaction{}, &models.Comment{})
	if err != nil {
		log.Fatalf("❌ Failed to automigrate models: %v", err)
	}

	DB = db
	fmt.Println("✅ Database connected and migrated")
}
