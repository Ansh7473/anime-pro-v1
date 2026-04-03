package database

import (
	"fmt"
	"log"
	"os"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
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
		log.Println("❌ Failed to connect to database:", err)
		return
	}

	// Automigrate models only if explicitly requested
	if os.Getenv("DB_AUTO_MIGRATE") == "true" {
		log.Println("🔄 Running database auto-migration...")
		err = db.AutoMigrate(&models.User{}, &models.Profile{}, &models.WatchHistory{}, &models.Watchlist{}, &models.Favorite{}, &models.Reaction{}, &models.Comment{}, &models.Release{})
		if err != nil {
			log.Println("❌ Failed to automigrate models:", err)
			return
		}
		log.Println("✅ Database migration completed")
	} else {
		log.Println("⏭️ Skipping auto-migration (set DB_AUTO_MIGRATE=true to enable)")
	}

	DB = db
	fmt.Println("✅ Database connected and migrated")
}
