package handlers

import (
	"net/http"
	"strconv"

	"github.com/Ansh7473/anime-pro/backend-go/internal/database"
	"github.com/Ansh7473/anime-pro/backend-go/internal/models"
	"github.com/gin-gonic/gin"
)

// Reaction Handlers

func ToggleReaction(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	var input struct {
		AnimeID string `json:"animeId" binding:"required"`
		Episode int    `json:"episode" binding:"required"`
		Type    string `json:"type" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var reaction models.Reaction
	err := database.DB.Where("user_id = ? AND anime_id = ? AND episode = ? AND type = ?", userId, input.AnimeID, input.Episode, input.Type).First(&reaction).Error
	
	if err == nil {
		// Already exists, remove it (toggle off)
		database.DB.Delete(&reaction)
		c.JSON(http.StatusOK, gin.H{"status": "removed"})
	} else {
		// Not found, add it (toggle on)
		newReaction := models.Reaction{
			UserID:  userId,
			AnimeID: input.AnimeID,
			Episode: input.Episode,
			Type:    input.Type,
		}
		database.DB.Create(&newReaction)
		c.JSON(http.StatusOK, gin.H{"status": "added"})
	}
}

func GetReactions(c *gin.Context) {
	animeId := c.Param("animeId")
	episodeStr := c.Param("episode")
	episode, _ := strconv.Atoi(episodeStr)

	var reactions []models.Reaction
	database.DB.Where("anime_id = ? AND episode = ?", animeId, episode).Find(&reactions)

	// Aggregate counts
	counts := make(map[string]int)
	for _, r := range reactions {
		counts[r.Type]++
	}

	// User status if logged in
	userStatus := ""
	if userId, ok := c.Get("userId"); ok {
		var r models.Reaction
		if err := database.DB.Where("user_id = ? AND anime_id = ? AND episode = ?", userId.(uint), animeId, episode).First(&r).Error; err == nil {
			userStatus = r.Type
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"counts":     counts,
		"userReaction": userStatus,
	})
}

// Comment Handlers

func CreateComment(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	var input struct {
		AnimeID  string `json:"animeId" binding:"required"`
		Episode  int    `json:"episode" binding:"required"`
		Content  string `json:"content" binding:"required"`
		ParentID *uint  `json:"parentId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment := models.Comment{
		UserID:   userId,
		AnimeID:  input.AnimeID,
		Episode:  input.Episode,
		Content:  input.Content,
		ParentID: input.ParentID,
	}

	if err := database.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to post comment"})
		return
	}

	// Load user for response
	database.DB.Preload("User").First(&comment, comment.ID)
	c.JSON(http.StatusOK, comment)
}

func GetComments(c *gin.Context) {
	animeId := c.Param("animeId")
	episodeStr := c.Param("episode")
	episode, _ := strconv.Atoi(episodeStr)

	var comments []models.Comment
	// Fetch only top-level comments and preload replies + users
	database.DB.Preload("User").
		Preload("Replies").
		Preload("Replies.User").
		Where("anime_id = ? AND episode = ? AND parent_id IS NULL", animeId, episode).
		Order("created_at desc").
		Find(&comments)

	c.JSON(http.StatusOK, comments)
}

func DeleteComment(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	commentId := c.Param("id")

	result := database.DB.Where("id = ? AND user_id = ?", commentId, userId).Delete(&models.Comment{})
	if result.RowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Comment not found or not authorized"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted"})
}
