package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

func main() {
	// Load .env
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("❌ DATABASE_URL is NOT set in .env")
	}

	fmt.Println("🚀 Testing connection to Neon...")
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("❌ Failed to open database: %v", err)
	}
	defer db.Close()

	err = db.Ping()
	if err != nil {
		log.Fatalf("❌ Could NOT ping Neon: %v", err)
	}

	fmt.Println("✅ Database connection successful!")
	fmt.Println("🛠️ All tables will be created automatically on next server start.")
}
