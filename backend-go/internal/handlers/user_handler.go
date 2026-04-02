package handlers

import (
	"net/http"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/internal/database"
	"github.com/Ansh7473/anime-pro/backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

func GetWatchHistory(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	profileId := c.Query("profileId")

	var history []models.WatchHistory
	query := database.DB.Where("user_id = ?", userId)
	if profileId != "" {
		query = query.Where("profile_id = ?", profileId)
	}

	if err := query.Order("last_watched_at desc").Limit(50).Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch history"})
		return
	}

	c.JSON(http.StatusOK, history)
}

func UpdateWatchHistory(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	var input models.WatchHistory
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.UserID = userId
	input.LastWatchedAt = time.Now()

	// Update existing record or create new (upsert by user+anime+episode)
	var existing models.WatchHistory
	err := database.DB.Where("user_id = ? AND anime_id = ? AND episode_number = ?", userId, input.AnimeID, input.EpisodeNumber).First(&existing).Error

	if err == nil {
		// Update existing
		existing.Progress = input.Progress
		existing.Duration = input.Duration
		existing.LastWatchedAt = input.LastWatchedAt
		existing.Completed = input.Completed
		existing.AnimeTitle = input.AnimeTitle
		existing.AnimePoster = input.AnimePoster
		if input.ProfileID != 0 {
			existing.ProfileID = input.ProfileID
		}
		database.DB.Save(&existing)
		c.JSON(http.StatusOK, existing)
	} else {
		// Create new
		if err := database.DB.Create(&input).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save history"})
			return
		}
		c.JSON(http.StatusOK, input)
	}
}

func DeleteHistory(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	animeId := c.Param("animeId")

	if animeId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "animeId is required"})
		return
	}

	result := database.DB.Where("user_id = ? AND anime_id = ?", userId, animeId).Delete(&models.WatchHistory{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "History deleted", "deleted": result.RowsAffected})
}

func GetWatchlist(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	var watchlist []models.Watchlist
	if err := database.DB.Where("user_id = ?", userId).Order("created_at desc").Find(&watchlist).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch watchlist"})
		return
	}
	c.JSON(http.StatusOK, watchlist)
}

func AddToWatchlist(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	var input struct {
		AnimeID     string `json:"animeId" binding:"required"`
		AnimeTitle  string `json:"animeTitle"`
		AnimePoster string `json:"animePoster"`
		ProfileID   uint   `json:"profileId"`
		Status      string `json:"status"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	status := input.Status
	if status == "" {
		status = "PLANNING"
	}

	// Upsert: update status if already exists
	var existing models.Watchlist
	err := database.DB.Where("user_id = ? AND anime_id = ?", userId, input.AnimeID).First(&existing).Error

	if err == nil {
		// Update status
		existing.Status = status
		existing.AnimeTitle = input.AnimeTitle
		existing.AnimePoster = input.AnimePoster
		database.DB.Save(&existing)
		c.JSON(http.StatusOK, existing)
	} else {
		// Create new
		entry := models.Watchlist{
			UserID:      userId,
			ProfileID:   input.ProfileID,
			AnimeID:     input.AnimeID,
			AnimeTitle:  input.AnimeTitle,
			AnimePoster: input.AnimePoster,
			Status:      status,
			CreatedAt:   time.Now(),
		}
		if err := database.DB.Create(&entry).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to watchlist"})
			return
		}
		c.JSON(http.StatusOK, entry)
	}
}

func RemoveFromWatchlist(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	animeId := c.Param("animeId")

	if animeId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "animeId is required"})
		return
	}

	result := database.DB.Where("user_id = ? AND anime_id = ?", userId, animeId).Delete(&models.Watchlist{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from watchlist"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from watchlist", "deleted": result.RowsAffected})
}

// GetWatchlistStatus checks if a specific anime is in the user's watchlist
func GetWatchlistStatus(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	animeId := c.Param("animeId")

	var entry models.Watchlist
	err := database.DB.Where("user_id = ? AND anime_id = ?", userId, animeId).First(&entry).Error

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"inWatchlist": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{"inWatchlist": true, "status": entry.Status, "entry": entry})
}
