package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"github.com/gin-gonic/gin"
	"google.golang.org/api/iterator"
)

func GetWatchHistory(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	profileId := c.Query("profileId")

	query := database.DB.Collection("watch_history").Where("userId", "==", userId)
	if profileId != "" {
		query = query.Where("profileId", "==", profileId)
	}

	iter := query.OrderBy("lastWatchedAt", database.Desc).Limit(50).Documents(database.Ctx)
	var history []models.WatchHistory
	var ids []int

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			log.Printf("❌ Error fetching history: %v", err)
			break
		}
		var h models.WatchHistory
		doc.DataTo(&h)
		history = append(history, h)

		if id, err := strconv.Atoi(h.AnimeID); err == nil {
			ids = append(ids, id)
		}
	}

	// Refresh metadata from AniList API (Main API)
	if len(ids) > 0 {
		freshData, err := ResolveBatchMetadata(ids)
		if err == nil {
			for i := range history {
				if id, err := strconv.Atoi(history[i].AnimeID); err == nil {
					if fresh, ok := freshData[id]; ok {
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

	userId := c.MustGet("userId").(string)
	var input models.WatchHistory
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.UserID = userId
	input.LastWatchedAt = time.Now()

	// Update existing record or create new (upsert by user+anime+episode)
	iter := database.DB.Collection("watch_history").
		Where("userId", "==", userId).
		Where("animeId", "==", input.AnimeID).
		Where("episodeNumber", "==", input.EpisodeNumber).
		Limit(1).Documents(database.Ctx)
	
	doc, err := iter.Next()
	if err == nil {
		// Update existing
		_, err = doc.Ref.Update(database.Ctx, []database.Update{
			{Path: "progress", Value: input.Progress},
			{Path: "duration", Value: input.Duration},
			{Path: "lastWatchedAt", Value: input.LastWatchedAt},
			{Path: "completed", Value: input.Completed},
			{Path: "animeTitle", Value: input.AnimeTitle},
			{Path: "animePoster", Value: input.AnimePoster},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update history"})
			return
		}
		// Refetch updated data to return
		updatedDoc, _ := doc.Ref.Get(database.Ctx)
		updatedDoc.DataTo(&input)
		c.JSON(http.StatusOK, input)
	} else if err == iterator.Done {
		// Create new
		ref := database.DB.Collection("watch_history").NewDoc()
		input.ID = ref.ID
		if _, err := ref.Set(database.Ctx, input); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create history"})
			return
		}
		c.JSON(http.StatusOK, input)
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
	}
}

func DeleteHistory(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	animeId := c.Param("animeId")

	if animeId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "animeId is required"})
		return
	}

	iter := database.DB.Collection("watch_history").Where("userId", "==", userId).Where("animeId", "==", animeId).Documents(database.Ctx)
	batch := database.DB.Batch()
	count := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		batch.Delete(doc.Ref)
		count++
	}

	if count > 0 {
		if _, err := batch.Commit(database.Ctx); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete history"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "History deleted", "deleted": count})
}

func GetWatchlist(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	profileId := c.Query("profileId")

	query := database.DB.Collection("watchlist").Where("userId", "==", userId)
	if profileId != "" {
		query = query.Where("profileId", "==", profileId)
	}

	iter := query.OrderBy("createdAt", database.Desc).Documents(database.Ctx)
	var watchlist []models.Watchlist
	var ids []int

	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		var w models.Watchlist
		doc.DataTo(&w)
		watchlist = append(watchlist, w)

		if id, err := strconv.Atoi(w.AnimeID); err == nil {
			ids = append(ids, id)
		}
	}

	// Refresh metadata from AniList API (Main API)
	if len(ids) > 0 {
		freshData, err := ResolveBatchMetadata(ids)
		if err == nil {
			for i := range watchlist {
				if id, err := strconv.Atoi(watchlist[i].AnimeID); err == nil {
					if fresh, ok := freshData[id]; ok {
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

	userId := c.MustGet("userId").(string)
	var input struct {
		AnimeID     string `json:"animeId" binding:"required"`
		AnimeTitle  string `json:"animeTitle"`
		AnimePoster string `json:"animePoster"`
		ProfileID   string `json:"profileId"`
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
	iter := database.DB.Collection("watchlist").
		Where("userId", "==", userId).
		Where("animeId", "==", input.AnimeID).
		Limit(1).Documents(database.Ctx)
	
	doc, err := iter.Next()
	if err == nil {
		// Update status
		_, err = doc.Ref.Update(database.Ctx, []database.Update{
			{Path: "status", Value: status},
			{Path: "animeTitle", Value: input.AnimeTitle},
			{Path: "animePoster", Value: input.AnimePoster},
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update watchlist status"})
			return
		}
		var updated models.Watchlist
		updatedDoc, _ := doc.Ref.Get(database.Ctx)
		updatedDoc.DataTo(&updated)
		c.JSON(http.StatusOK, updated)
	} else if err == iterator.Done {
		// Create new
		ref := database.DB.Collection("watchlist").NewDoc()
		entry := models.Watchlist{
			ID:          ref.ID,
			UserID:      userId,
			ProfileID:   input.ProfileID,
			AnimeID:     input.AnimeID,
			AnimeTitle:  input.AnimeTitle,
			AnimePoster: input.AnimePoster,
			Status:      status,
			CreatedAt:   time.Now(),
		}
		if _, err := ref.Set(database.Ctx, entry); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to watchlist"})
			return
		}
		c.JSON(http.StatusOK, entry)
	} else {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
	}
}

func RemoveFromWatchlist(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	animeId := c.Param("animeId")

	if animeId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "animeId is required"})
		return
	}

	iter := database.DB.Collection("watchlist").Where("userId", "==", userId).Where("animeId", "==", animeId).Documents(database.Ctx)
	batch := database.DB.Batch()
	count := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		batch.Delete(doc.Ref)
		count++
	}

	if count > 0 {
		if _, err := batch.Commit(database.Ctx); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from watchlist"})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from watchlist", "deleted": count})
}

func GetWatchlistStatus(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	animeId := c.Param("animeId")

	iter := database.DB.Collection("watchlist").Where("userId", "==", userId).Where("animeId", "==", animeId).Limit(1).Documents(database.Ctx)
	doc, err := iter.Next()

	if err != nil {
		c.JSON(http.StatusOK, gin.H{"inWatchlist": false})
		return
	}

	var entry models.Watchlist
	doc.DataTo(&entry)
	c.JSON(http.StatusOK, gin.H{"inWatchlist": true, "status": entry.Status, "entry": entry})
}

func GetUserStats(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)

	var totalProgress float64
	var recentCount int64
	var reservesCount int64
	var historyCount int64

	// 1. History calculations (iterating for progress SUM)
	lastWeek := time.Now().AddDate(0, 0, -7)
	hIter := database.DB.Collection("watch_history").Where("userId", "==", userId).Documents(database.Ctx)
	for {
		doc, err := hIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		var h models.WatchHistory
		doc.DataTo(&h)
		historyCount++
		totalProgress += h.Progress
		if h.LastWatchedAt.After(lastWeek) {
			recentCount++
		}
	}

	// 2. Strategic Reserves (Plan to Watch count)
	// Using the collection query for specific status
	rIter := database.DB.Collection("watchlist").Where("userId", "==", userId).Where("status", "==", "PLANNING").Documents(database.Ctx)
	for {
		_, err := rIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		reservesCount++
	}

	c.JSON(http.StatusOK, gin.H{
		"total_hours":    utils.Round(totalProgress/3600, 1),
		"reserves_count": reservesCount,
		"history_count":  historyCount,
		"recent_active":  recentCount,
		"favorite_genre": "Tactical Scifi",
	})
}

func GetAIRecommendations(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	// In a real high-perf scenario, we'd query past history genres
	// Mock remains for the "WOW" tactical UI fallback
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
