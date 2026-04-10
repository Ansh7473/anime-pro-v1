package config

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"os"
	"sync"
)

var (
	jwtSecret     []byte
	jwtSecretOnce sync.Once
)

// GetJWTSecret returns the JWT signing key, reading from env on first call.
// This avoids the race condition where os.Getenv is called before godotenv.Load().
// If JWT_SECRET is not set, a random 32-byte key is generated (dev-mode fallback).
func GetJWTSecret() []byte {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			log.Println("⚠️  JWT_SECRET not set! Generating random secret (sessions won't survive restarts)")
			b := make([]byte, 32)
			if _, err := rand.Read(b); err != nil {
				log.Fatal("Failed to generate random JWT secret:", err)
			}
			secret = hex.EncodeToString(b)
		}
		jwtSecret = []byte(secret)
		log.Println("✅ JWT Secret initialized")
	})
	return jwtSecret
}

// GetDatabaseURL returns the DATABASE_URL from environment.
func GetDatabaseURL() string {
	return os.Getenv("DATABASE_URL")
}
