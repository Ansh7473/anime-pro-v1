package database

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

// WaitForDB blocks until DB is connected or timeout (20s) is reached.
// Returns true if DB is ready, false if timed out.
func WaitForDB() bool {
	if DB != nil {
		return true
	}
	// Poll every 250ms for up to 20 seconds
	for i := 0; i < 80; i++ {
		time.Sleep(250 * time.Millisecond)
		if DB != nil {
			return true
		}
	}
	return false
}

func InitDB() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("⚠️ DATABASE_URL not set, DB features will be disabled")
		return
	}

	// Run connection in a goroutine to prevent blocking the main thread (fixes 35s preflight lag)
	go func() {
		log.Println("🔌 Connecting to database in background...")
		db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
		if err != nil {
			log.Println("❌ Failed to connect to database:", err)
			return
		}

		// Automigrate models
		err = db.AutoMigrate(&models.User{}, &models.Profile{}, &models.WatchHistory{}, &models.Watchlist{}, &models.Favorite{}, &models.Reaction{}, &models.Comment{})
		if err != nil {
			log.Println("❌ Failed to automigrate models:", err)
			return
		}

		DB = db
		fmt.Println("✅ Database connected and ready")
	}()
}

