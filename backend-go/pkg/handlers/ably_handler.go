package handlers

import (
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

	userId := c.MustGet("userId").(string)
	
	// Initialize Ably client
	client, err := ably.NewREST(ably.WithKey(apiKey))
	if err != nil {
		log.Printf("❌ Failed to initialize Ably REST: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize realtime service"})
		return
	}

	// Create a token request with 1 hour TTL
	params := &ably.TokenParams{
		ClientID: userId,
		TTL:      time.Hour,
	}

	tokenRequest, err := client.Auth.CreateTokenRequest(params)
	if err != nil {
		log.Printf("❌ Failed to create Ably token request: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	c.JSON(http.StatusOK, tokenRequest)
}
