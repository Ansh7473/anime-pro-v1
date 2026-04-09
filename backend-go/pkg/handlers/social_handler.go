package handlers

import (
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
)

// Reaction Handlers

func ToggleReaction(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	// Get userId from context (optional auth) or use profileId as guestId
	var userId string
	val, exists := c.Get("userId")
	if exists {
		userId = val.(string)
	}

	var input struct {
		AnimeID   string `json:"animeId" binding:"required"`
		Episode   int    `json:"episode" binding:"required"`
		Type      string `json:"type" binding:"required"`
		ProfileID string `json:"profileId"` // Used as guestId if not logged in
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	// Fallback to guest ID if not logged in
	if userId == "" {
		if input.ProfileID == "" {
			c.JSON(http.StatusUnauthorized, utils.H{"error": "Login or Guest ID required"})
			return
		}
		userId = input.ProfileID
	}

	// Use a query to find existing reaction
	iter := database.DB.Collection("reactions").
		Where("userId", "==", userId).
		Where("animeId", "==", input.AnimeID).
		Where("episode", "==", input.Episode).
		Where("type", "==", input.Type).
		Limit(1).Documents(database.Ctx)

	doc, err := iter.Next()
	if err == nil {
		// Already exists, remove it (toggle off)
		_, err = doc.Ref.Delete(database.Ctx)
		if err != nil {
			c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to remove reaction"})
			return
		}
		c.JSON(http.StatusOK, utils.H{"status": "removed"})
	} else if err == database.Done {
		// Not found, add it (toggle on)
		ref := database.DB.Collection("reactions").NewDoc()
		newReaction := models.Reaction{
			ID:        ref.ID,
			UserID:    userId,
			AnimeID:   input.AnimeID,
			Episode:   input.Episode,
			Type:      input.Type,
			CreatedAt: time.Now(),
		}
		if _, err := ref.Set(database.Ctx, newReaction); err != nil {
			c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to add reaction"})
			return
		}
		c.JSON(http.StatusOK, utils.H{"status": "added"})
	} else {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Database error"})
	}
}

func GetReactions(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	animeId := c.Param("animeId")
	episode, _ := strconv.Atoi(c.Param("episode"))

	iter := database.DB.Collection("reactions").
		Where("animeId", "==", animeId).
		Where("episode", "==", episode).
		Documents(database.Ctx)

	counts := make(map[string]int)
	userReaction := ""
	currentUserID, loggedIn := c.Get("userId")
	if !loggedIn || currentUserID == nil {
		loggedIn = false
	}

	for {
		doc, err := iter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			break
		}
		var r models.Reaction
		doc.DataTo(&r)
		counts[r.Type]++
		if loggedIn && r.UserID == currentUserID.(string) {
			userReaction = r.Type
		}
	}

	c.JSON(http.StatusOK, utils.H{
		"counts":       counts,
		"userReaction": userReaction,
	})
}

// Comment Handlers

func CreateComment(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	var input struct {
		AnimeID  string `json:"animeId" binding:"required"`
		Episode  int    `json:"episode" binding:"required"`
		Content  string `json:"content" binding:"required"`
		ParentID string `json:"parentId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	// Fetch user info for denormalization (username/avatar)
	// We'll use the first profile or a default for now, or just some placeholder
	// In this app, users can have multiple profiles, but for simplicity we'll check profiles
	pIter := database.DB.Collection("profiles").Where("userId", "==", userId).Limit(1).Documents(database.Ctx)
	pDoc, pErr := pIter.Next()
	
	userName := "User"
	userAvatar := ""
	if pErr == nil {
		var p models.Profile
		pDoc.DataTo(&p)
		userName = p.Name
		userAvatar = p.Avatar
	}

	ref := database.DB.Collection("comments").NewDoc()
	comment := models.Comment{
		ID:              ref.ID,
		UserID:          userId,
		UserName:        userName,
		UserAvatar:      userAvatar,
		AnimeID:         input.AnimeID,
		Episode:         input.Episode,
		Content:         input.Content,
		ParentID:        input.ParentID,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if _, err := ref.Set(database.Ctx, comment); err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to post comment"})
		return
	}

	c.JSON(http.StatusOK, comment)
}

func GetComments(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	animeId := c.Param("animeId")
	episode, _ := strconv.Atoi(c.Param("episode"))

	iter := database.DB.Collection("comments").
		Where("animeId", "==", animeId).
		Where("episode", "==", episode).
		Documents(database.Ctx)

	var comments []models.Comment
	for {
		doc, err := iter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			log.Printf("❌ Error fetching comments: %v", err)
			break
		}
		var cm models.Comment
		doc.DataTo(&cm)
		comments = append(comments, cm)
	}

	// Sort in-memory to avoid composite index requirements
	sort.Slice(comments, func(i, j int) bool {
		return comments[i].CreatedAt.After(comments[j].CreatedAt)
	})

	c.JSON(http.StatusOK, comments)
}

func DeleteComment(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	commentId := c.Param("id")

	doc, err := database.DB.Collection("comments").Doc(commentId).Get(database.Ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.H{"error": "Comment not found"})
		return
	}

	var comment models.Comment
	doc.DataTo(&comment)

	if comment.UserID != userId {
		c.JSON(http.StatusForbidden, utils.H{"error": "Unauthorized"})
		return
	}

	_, err = doc.Ref.Delete(database.Ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to delete comment"})
		return
	}

	c.JSON(http.StatusOK, utils.H{"message": "Comment deleted"})
}
