package handlers

import (
	"net/http"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"strconv"
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

	// Refresh metadata from AniList API (Main API)
	var ids []int
	for _, h := range history {
		if id, err := strconv.Atoi(h.AnimeID); err == nil {
			ids = append(ids, id)
		}
	}
	if len(ids) > 0 {
		freshData, err := ResolveBatchMetadata(ids)
		if err == nil {
			for i := range history {
				if id, err := strconv.Atoi(history[i].AnimeID); err == nil {
					if fresh, ok := freshData[id]; ok {
						// Update with fresh data from AniList
						history[i].AnimeTitle = utils.ToString(fresh["title"])
						history[i].AnimePoster = utils.ToString(fresh["poster"])
					}
				}
			}
		}
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

	// Refresh metadata from AniList API (Main API)
	var ids []int
	for _, w := range watchlist {
		if id, err := strconv.Atoi(w.AnimeID); err == nil {
			ids = append(ids, id)
		}
	}
	if len(ids) > 0 {
		freshData, err := ResolveBatchMetadata(ids)
		if err == nil {
			for i := range watchlist {
				if id, err := strconv.Atoi(watchlist[i].AnimeID); err == nil {
					if fresh, ok := freshData[id]; ok {
						// Update with fresh data from AniList
						watchlist[i].AnimeTitle = utils.ToString(fresh["title"])
						watchlist[i].AnimePoster = utils.ToString(fresh["poster"])
					}
				}
			}
		}
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

// GetUserStats returns aggregated user statistics
func GetUserStats(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)

	var stats struct {
		TotalSeconds  float64 `json:"totalSeconds"`
		RecentCount   int64   `json:"recentCount"`
		ReservesCount int64   `json:"reservesCount"`
		HistoryCount  int64   `json:"historyCount"`
	}

	// 1. Total Seconds Watched (Combat Hours)
	database.DB.Model(&models.WatchHistory{}).Where("user_id = ?", userId).Select("SUM(progress)").Scan(&stats.TotalSeconds)

	// 2. Strategic Reserves (Plan to Watch)
	database.DB.Model(&models.Watchlist{}).Where("user_id = ? AND status = ?", userId, "PLANNING").Count(&stats.ReservesCount)

	// 3. History Count
	database.DB.Model(&models.WatchHistory{}).Where("user_id = ?", userId).Count(&stats.HistoryCount)

	// 4. Recently Active (Last 7 days)
	lastWeek := time.Now().AddDate(0, 0, -7)
	database.DB.Model(&models.WatchHistory{}).Where("user_id = ? AND last_watched_at > ?", userId, lastWeek).Count(&stats.RecentCount)

	c.JSON(http.StatusOK, gin.H{
		"total_hours":    stats.TotalSeconds / 3600,
		"reserves_count": stats.ReservesCount,
		"history_count":  stats.HistoryCount,
		"recent_active":  stats.RecentCount,
		"favorite_genre": "Tactical Scifi", // Placeholder for now - will implement genre aggregation next
	})
}

// GetAIRecommendations generates tactical recommendations based on user history
func GetAIRecommendations(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	_ = userId // Explicitly ignore until personalized recommendation logic is added

	// Logic: Get top 2 genres from history and fetch trending from Anilist
	// For now, return a curated "Tactical Briefing" of high-score action/thriller anime
	// as a fallback while we implement the genre analyzer.
	
	// We'll reuse the Anilist search logic or just return popular action anime
	// Mock implementation for the first phase of UI testing
	c.JSON(http.StatusOK, gin.H{
		"intelligence_level": "Alpha",
		"briefing": "Based on your recent combat logs, intelligence suggests these high-value targets:",
		"recommendations": []gin.H{
			{"id": "1", "title": "Psycho-Pass", "poster": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx13601-9t1m1z.jpg", "reason": "High tactical overlap"},
			{"id": "2", "title": "Code Geass", "poster": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx1575-S6AMir9V9m7d.png", "reason": "Strategic mastermind detected"},
			{"id": "3", "title": "86 Eighty-Six", "poster": "https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx116589-SFrKjZ8132kC.jpg", "reason": "Tactical squad combat"},
		},
	})
}
