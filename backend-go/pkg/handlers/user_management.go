package handlers

import (
	"log"
	"net/http"
	"sort"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"golang.org/x/crypto/bcrypt"
)

// ChangePassword updates the authenticated user's password
func ChangePassword(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	var input struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	doc, err := database.DB.Collection("users").Doc(userId).Get(database.Ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.H{"error": "User not found"})
		return
	}

	var user models.User
	doc.DataTo(&user)

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, utils.H{"error": "Current password incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to process new password"})
		return
	}

	_, err = database.DB.Collection("users").Doc(userId).Update(database.Ctx, []database.Update{
		{Path: "password", Value: string(hashedPassword)},
		{Path: "updatedAt", Value: time.Now()},
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, utils.H{"message": "Password updated successfully"})
}

// Profile Handlers

func CreateProfile(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	var input struct {
		Name   string `json:"name" binding:"required"`
		Avatar string `json:"avatar"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	// Limit to 5 profiles
	iter := database.DB.Collection("profiles").Where("userId", "==", userId).Documents(database.Ctx)
	count := 0
	for {
		_, err := iter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			break
		}
		count++
	}

	if count >= 5 {
		c.JSON(http.StatusForbidden, utils.H{"error": "Maximum of 5 profiles allowed"})
		return
	}

	profileRef := database.DB.Collection("profiles").NewDoc()
	profile := models.Profile{
		ID:        profileRef.ID,
		UserID:    userId,
		Name:      input.Name,
		Avatar:    input.Avatar,
		CreatedAt: time.Now(),
		AutoNext:  true,
	}

	if _, err := profileRef.Set(database.Ctx, profile); err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to create profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func UpdateProfile(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	profileId := c.Param("id")

	doc, err := database.DB.Collection("profiles").Doc(profileId).Get(database.Ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.H{"error": "Profile not found"})
		return
	}

	var profile models.Profile
	doc.DataTo(&profile)

	if profile.UserID != userId {
		c.JSON(http.StatusForbidden, utils.H{"error": "Unauthorized access to profile"})
		return
	}

	var input struct {
		Name     string `json:"name"`
		Avatar   string `json:"avatar"`
		AutoNext *bool  `json:"autoNext"`
		AutoSkip *bool  `json:"autoSkip"`
		Language string `json:"language"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	updates := []database.Update{}
	if input.Name != "" { updates = append(updates, database.Update{Path: "name", Value: input.Name}) }
	if input.Avatar != "" { updates = append(updates, database.Update{Path: "avatar", Value: input.Avatar}) }
	if input.AutoNext != nil { updates = append(updates, database.Update{Path: "autoNext", Value: *input.AutoNext}) }
	if input.AutoSkip != nil { updates = append(updates, database.Update{Path: "autoSkip", Value: *input.AutoSkip}) }
	if input.Language != "" { updates = append(updates, database.Update{Path: "language", Value: input.Language}) }

	if len(updates) > 0 {
		_, err = database.DB.Collection("profiles").Doc(profileId).Update(database.Ctx, updates)
		if err != nil {
			c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to update profile"})
			return
		}
	}

	// Refetch to return full updated profile
	updatedDoc, _ := database.DB.Collection("profiles").Doc(profileId).Get(database.Ctx)
	updatedDoc.DataTo(&profile)

	c.JSON(http.StatusOK, profile)
}

func DeleteProfile(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	profileId := c.Param("id")

	// Ensure they don't delete their last profile
	iter := database.DB.Collection("profiles").Where("userId", "==", userId).Documents(database.Ctx)
	count := 0
	for {
		_, err := iter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			break
		}
		count++
	}

	if count <= 1 {
		c.JSON(http.StatusForbidden, utils.H{"error": "Cannot delete the last remaining profile"})
		return
	}

	// Double check ownership
	doc, err := database.DB.Collection("profiles").Doc(profileId).Get(database.Ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.H{"error": "Profile not found"})
		return
	}
	var profile models.Profile
	doc.DataTo(&profile)
	if profile.UserID != userId {
		c.JSON(http.StatusForbidden, utils.H{"error": "Unauthorized"})
		return
	}

	_, err = database.DB.Collection("profiles").Doc(profileId).Delete(database.Ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to delete profile"})
		return
	}

	c.JSON(http.StatusOK, utils.H{"message": "Profile deleted"})
}

// Favorites Handlers

func GetFavorites(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	profileId := c.Query("profileId")

	query := database.DB.Collection("favorites").Where("userId", "==", userId)
	if profileId != "" {
		query = query.Where("profileId", "==", profileId)
	}

	iter := query.Documents(database.Ctx)
	favorites := []models.Favorite{}
	for {
		doc, err := iter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			log.Printf("❌ Error fetching favorites: %v", err)
			break
		}
		var f models.Favorite
		doc.DataTo(&f)
		favorites = append(favorites, f)
	}

	// Sort in-memory to avoid composite index requirements
	sort.Slice(favorites, func(i, j int) bool {
		return favorites[i].CreatedAt.After(favorites[j].CreatedAt)
	})

	c.JSON(http.StatusOK, favorites)
}

func AddToFavorite(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	var input struct {
		AnimeID     string `json:"animeId" binding:"required"`
		AnimeTitle  string `json:"animeTitle"`
		AnimePoster string `json:"animePoster"`
		ProfileID   string `json:"profileId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	// Check if already exists in this profile (Spark plan has limited indices, but simple equality is fine)
	iter := database.DB.Collection("favorites").
		Where("userId", "==", userId).
		Where("profileId", "==", input.ProfileID).
		Where("animeId", "==", input.AnimeID).
		Limit(1).Documents(database.Ctx)
	
	_, err := iter.Next()
	if err != database.Done {
		c.JSON(http.StatusConflict, utils.H{"error": "Already in favorites"})
		return
	}

	favRef := database.DB.Collection("favorites").NewDoc()
	favorite := models.Favorite{
		ID:          favRef.ID,
		UserID:      userId,
		ProfileID:   input.ProfileID,
		AnimeID:     input.AnimeID,
		AnimeTitle:  input.AnimeTitle,
		AnimePoster: input.AnimePoster,
		CreatedAt:   time.Now(),
	}

	if _, err := favRef.Set(database.Ctx, favorite); err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to add to favorites"})
		return
	}

	c.JSON(http.StatusOK, favorite)
}

func RemoveFromFavorite(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	animeId := c.Param("animeId")
	profileId := c.Query("profileId")

	query := database.DB.Collection("favorites").Where("userId", "==", userId).Where("animeId", "==", animeId)
	if profileId != "" {
		query = query.Where("profileId", "==", profileId)
	}

	iter := query.Documents(database.Ctx)
	batch := database.DB.Batch()
	found := false
	for {
		doc, err := iter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			break
		}
		batch.Delete(doc.Ref)
		found = true
	}

	if !found {
		c.JSON(http.StatusNotFound, utils.H{"error": "Favorite not found"})
		return
	}

	if _, err := batch.Commit(database.Ctx); err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to remove from favorites"})
		return
	}

	c.JSON(http.StatusOK, utils.H{"message": "Removed from favorites"})
}

func GetFavoriteStatus(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)
	animeId := c.Param("animeId")
	profileId := c.Query("profileId")

	query := database.DB.Collection("favorites").Where("userId", "==", userId).Where("animeId", "==", animeId)
	if profileId != "" {
		query = query.Where("profileId", "==", profileId)
	}

	iter := query.Limit(1).Documents(database.Ctx)
	_, err := iter.Next()

	c.JSON(http.StatusOK, utils.H{"isFavorite": err == nil})
}
