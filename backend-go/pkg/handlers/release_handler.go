package handlers

import (
	"net/http"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
	"github.com/gin-gonic/gin"
)

// AddRelease - Admin only method to register a new app release
func AddRelease(c *gin.Context) {
	// 1. Get current user from context (populated by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// 2. Check if user is Admin
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User not found"})
		return
	}

	if user.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin privileges required"})
		return
	}

	// 3. Parse Request
	var input models.Release
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 4. If this is the latest, mark others as not latest for the same platform
	if input.IsLatest {
		database.DB.Model(&models.Release{}).Where("platform = ?", input.Platform).Update("is_latest", false)
	}

	// 5. Save Release
	if err := database.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create release"})
		return
	}

	c.JSON(http.StatusCreated, input)
}

// GetLatestReleases - Public method to get latest version for each platform
func GetLatestReleases(c *gin.Context) {
	var releases []models.Release
	if err := database.DB.Where("is_latest = ?", true).Find(&releases).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch releases"})
		return
	}

	c.JSON(http.StatusOK, releases)
}
