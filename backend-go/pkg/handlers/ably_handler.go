package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ably/ably-go/ably"
)

// GetChatToken generates an Ably TokenRequest for the client
func GetChatToken(c *gin.Context) {
	apiKey := os.Getenv("ABLY_API_KEY")
	if apiKey == "" || apiKey == "PLACEHOLDER_FOR_ABLY_API_KEY" {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Ably API Key not configured"})
		return
	}

	userId, exists := c.Get("userId")
	var clientID string
	var capability string

	if exists {
		clientID = userId.(string)
		capability = `{"*":["subscribe","publish","presence"]}`
	} else {
		// Guest user: unique ID and subscribe only
		b := make([]byte, 4)
		rand.Read(b)
		randID := hex.EncodeToString(b)
		clientID = "Guest-" + randID
		capability = `{"*":["subscribe"]}`
	}
	
	// Initialize Ably client
	client, err := ably.NewREST(ably.WithKey(apiKey))
	if err != nil {
		log.Printf("❌ Failed to initialize Ably REST: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize realtime service"})
		return
	}

	// Create a token request with specific capabilities
	params := &ably.TokenParams{
		ClientID: clientID,
		TTL:      int64(time.Hour / time.Millisecond),
		Capability: capability,
	}

	tokenRequest, err := client.Auth.CreateTokenRequest(params)
	if err != nil {
		log.Printf("❌ Failed to create Ably token request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, tokenRequest)
}
