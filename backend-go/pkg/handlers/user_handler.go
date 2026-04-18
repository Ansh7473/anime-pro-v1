package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
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

	iter := query.Documents(database.Ctx)
	history := []models.WatchHistory{}
	ids := []int{}

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

	// Sort in-memory to avoid composite index requirements on Spark plan
	sort.Slice(history, func(i, j int) bool {
		return history[i].LastWatchedAt.After(history[j].LastWatchedAt)
	})

	// Apply limit after sorting
	if len(history) > 50 {
		history = history[:50]
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

	iter := query.Documents(database.Ctx)
	watchlist := []models.Watchlist{}
	ids := []int{}

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

	// Sort in-memory to avoid composite index requirements
	sort.Slice(watchlist, func(i, j int) bool {
		return watchlist[i].CreatedAt.After(watchlist[j].CreatedAt)
	})

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

	var totalSeconds float64
	var recentCount int64
	var reservesCount int64
	var historyCount int64
	var animeIDs []int
	var historyItems []models.WatchHistory
	genreCounts := make(map[string]int)
	dailyActivity := make(map[string]float64) // key: YYYY-MM-DD

	// 1. History calculations
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
		historyItems = append(historyItems, h)
		historyCount++
		totalSeconds += h.Progress
		
		// Track Daily Activity (Last 7 Days)
		if h.LastWatchedAt.After(lastWeek) {
			recentCount++
			dateKey := h.LastWatchedAt.Format("2006-01-02")
			dailyActivity[dateKey] += h.Progress
		}

		if id, err := strconv.Atoi(h.AnimeID); err == nil {
			animeIDs = append(animeIDs, id)
		}
	}

	// 2. Format Activity for frontend (Last 7 days)
	activityArray := []gin.H{}
	for i := 6; i >= 0; i-- {
		d := time.Now().AddDate(0, 0, -i)
		key := d.Format("2006-01-02")
		activityArray = append(activityArray, gin.H{
			"day":     d.Format("Mon"),
			"minutes": utils.Round(dailyActivity[key]/60, 0),
			"level":   int(dailyActivity[key]/1800), // Intensity level (0-4) based on 30m blocks
		})
	}

	// 3. Progression System (XP & Ranks)
	currentXP := int(totalSeconds / 60) // 1 minute = 1 XP
	rankTitle := "RECRUIT"
	nextRankXP := 500
	if currentXP >= 10000 {
		rankTitle = "COMMANDER"
		nextRankXP = 25000
	} else if currentXP >= 2500 {
		rankTitle = "ELITE"
		nextRankXP = 10000
	} else if currentXP >= 500 {
		rankTitle = "OPERATIVE"
		nextRankXP = 2500
	}

	// Determine Quick Resume (latest entry)
	var quickResume *models.WatchHistory
	if len(historyItems) > 0 {
		sort.Slice(historyItems, func(i, j int) bool {
			return historyItems[i].LastWatchedAt.After(historyItems[j].LastWatchedAt)
		})
		quickResume = &historyItems[0]
	}

	// 4. Fetch genres for favorite calculation
	uniqueIDs := utils.UniqueInts(animeIDs)
	if len(uniqueIDs) > 0 {
		metadata, _ := utils.GetMultipleMediaMetadata(uniqueIDs)
		for _, m := range metadata {
			if genres, ok := m["genres"].([]interface{}); ok {
				for _, g := range genres {
					genreCounts[g.(string)]++
				}
			}
		}
	}

	favoriteGenre := "Tactical Scifi"
	maxCount := 0
	for genre, count := range genreCounts {
		if count > maxCount {
			maxCount = count
			favoriteGenre = genre
		}
	}

	// 5. Strategic Reserves
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
		"total_hours":    utils.Round(totalSeconds/3600, 1),
		"reserves_count": reservesCount,
		"history_count":  historyCount,
		"recent_active":  recentCount,
		"favorite_genre": favoriteGenre,
		"quick_resume":   quickResume,
		"progression": gin.H{
			"xp":           currentXP,
			"rank":         rankTitle,
			"next_rank":    nextRankXP,
			"level":        (currentXP / 100) + 1,
		},
		"activity": activityArray,
	})
}

func GetAIRecommendations(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)

	// 1. Fetch recent history and stats for context
	hIter := database.DB.Collection("watch_history").
		Where("userId", "==", userId).
		OrderBy("lastWatchedAt", database.Desc).
		Limit(10).
		Documents(database.Ctx)

	var historyContext []string
	var lastAnimeID int
	var animeIDs []int
	genreCounts := make(map[string]int)

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
		historyContext = append(historyContext, fmt.Sprintf("%s (EP %d)", h.AnimeTitle, h.EpisodeNumber))
		if id, err := strconv.Atoi(h.AnimeID); err == nil {
			if lastAnimeID == 0 {
				lastAnimeID = id
			}
			animeIDs = append(animeIDs, id)
		}
	}

	// 2. Aggregate Top Genre
	metadata, _ := utils.GetMultipleMediaMetadata(utils.UniqueInts(animeIDs))
	userPreferences := ""
	for _, m := range metadata {
		if genres, ok := m["genres"].([]interface{}); ok {
			for _, g := range genres {
				genreCounts[g.(string)]++
			}
			userPreferences += fmt.Sprintf("- %v: %v\n", m["title"].(map[string]interface{})["english"], genres)
		}
	}

	topGenre := "Action"
	maxCount := 0
	for g, c := range genreCounts {
		if c > maxCount {
			maxCount = c
			topGenre = g
		}
	}

	// 3. Try AI Mode
	apiKey := config.GetOpenRouterAPIKey()
	if apiKey != "" {
		systemPrompt := `You are the AI Intel Officer for ANIMEPRO... JSON format...`
		userPrompt := fmt.Sprintf(`Analyze logs: %v. Metadata: %s`, historyContext, userPreferences)
		
		aiResponse, err := CallOpenRouter(userPrompt, systemPrompt)
		if err == nil {
			var result map[string]interface{}
			if err := json.Unmarshal([]byte(aiResponse), &result); err == nil {
				c.JSON(http.StatusOK, result)
				return
			}
		}
		log.Printf("⚠️ AI Mode failed, falling back to Deterministic Tactical Computer")
	}

	// 4. Deterministic Tactical Computer (Fallback/Non-AI)
	var finalRecs []gin.H
	uniqueRecIDs := make(map[int]bool)

	// A. Get recommendations for the most recently watched show
	if lastAnimeID != 0 {
		aniRecs, _ := utils.GetAniListRecommendations(lastAnimeID)
		for _, r := range aniRecs {
			if len(finalRecs) >= 3 { break }
			id := int(r["id"].(float64))
			if !uniqueRecIDs[id] {
				uniqueRecIDs[id] = true
				finalRecs = append(finalRecs, gin.H{
					"id":     strconv.Itoa(id),
					"title":  r["title"].(map[string]interface{})["english"],
					"poster": r["coverImage"].(map[string]interface{})["large"],
					"reason": "Direct tactical match with recent engagement",
				})
			}
		}
	}

	// B. Supplement with Top Genre trending if needed
	if len(finalRecs) < 3 {
		genreRecs, _ := utils.GetPopularByGenre(topGenre, animeIDs)
		for _, r := range genreRecs {
			if len(finalRecs) >= 5 { break }
			id := int(r["id"].(float64))
			if !uniqueRecIDs[id] {
				uniqueRecIDs[id] = true
				finalRecs = append(finalRecs, gin.H{
					"id":     strconv.Itoa(id),
					"title":  r["title"].(map[string]interface{})["english"],
					"poster": r["coverImage"].(map[string]interface{})["large"],
					"reason": fmt.Sprintf("High-value target in %s sector", topGenre),
				})
			}
		}
	}

	// C. Template-based Briefing
	briefingTemplates := []string{
		"Field analysis complete. Operator shows 80%% affinity for %s category. Advise deployment to prioritized targets.",
		"Tactical scanners identify a recurring pattern in your engagement logs. Sector %s is showing high volatility.",
		"Intelligence reports suggest potential synchronization with these high-value objectives based on recent combat data.",
	}
	// Select template based on time or something deterministic
	selectedBriefing := fmt.Sprintf(briefingTemplates[time.Now().Unix()%int64(len(briefingTemplates))], topGenre)

	c.JSON(http.StatusOK, gin.H{
		"intelligence_level": "GAMMA",
		"briefing":           selectedBriefing,
		"recommendations":    finalRecs,
	})
}
