package handlers

import (
	"net/http"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/internal/database"
	"github.com/Ansh7473/anime-pro/backend-go/internal/models"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// ChangePassword updates the authenticated user's password
func ChangePassword(c *gin.Context) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(uint)
	var input struct {
		CurrentPassword string `json:"currentPassword" binding:"required"`
		NewPassword     string `json:"newPassword" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := database.DB.First(&user, userId).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.CurrentPassword)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Current password incorrect"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process new password"})
		return
	}

	user.Password = string(hashedPassword)
	user.UpdatedAt = time.Now()
	database.DB.Save(&user)

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

// Profile Handlers

func CreateProfile(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	var input struct {
		Name   string `json:"name" binding:"required"`
		Avatar string `json:"avatar"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Limit to 5 profiles
	var count int64
	database.DB.Model(&models.Profile{}).Where("user_id = ?", userId).Count(&count)
	if count >= 5 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Maximum of 5 profiles allowed"})
		return
	}

	profile := models.Profile{
		UserID:    userId,
		Name:      input.Name,
		Avatar:    input.Avatar,
		CreatedAt: time.Now(),
		AutoNext:  true,
	}

	if err := database.DB.Create(&profile).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile"})
		return
	}

	c.JSON(http.StatusOK, profile)
}

func UpdateProfile(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	profileId := c.Param("id")

	var profile models.Profile
	if err := database.DB.Where("id = ? AND user_id = ?", profileId, userId).First(&profile).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Name != "" { profile.Name = input.Name }
	if input.Avatar != "" { profile.Avatar = input.Avatar }
	if input.AutoNext != nil { profile.AutoNext = *input.AutoNext }
	if input.AutoSkip != nil { profile.AutoSkip = *input.AutoSkip }
	if input.Language != "" { profile.Language = input.Language }

	database.DB.Save(&profile)
	c.JSON(http.StatusOK, profile)
}

func DeleteProfile(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	profileId := c.Param("id")

	// Ensure they don't delete their last profile
	var count int64
	database.DB.Model(&models.Profile{}).Where("user_id = ?", userId).Count(&count)
	if count <= 1 {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete the last remaining profile"})
		return
	}

	result := database.DB.Where("id = ? AND user_id = ?", profileId, userId).Delete(&models.Profile{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile deleted"})
}

// Favorites Handlers

func GetFavorites(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	profileId := c.Query("profileId")

	var favorites []models.Favorite
	query := database.DB.Where("user_id = ?", userId)
	if profileId != "" {
		query = query.Where("profile_id = ?", profileId)
	}

	if err := query.Order("created_at desc").Find(&favorites).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch favorites"})
		return
	}

	c.JSON(http.StatusOK, favorites)
}

func AddToFavorite(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	var input struct {
		AnimeID     string `json:"animeId" binding:"required"`
		AnimeTitle  string `json:"animeTitle"`
		AnimePoster string `json:"animePoster"`
		ProfileID   uint   `json:"profileId"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if already exists in this profile
	var existing models.Favorite
	err := database.DB.Where("user_id = ? AND profile_id = ? AND anime_id = ?", userId, input.ProfileID, input.AnimeID).First(&existing).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Already in favorites"})
		return
	}

	favorite := models.Favorite{
		UserID:      userId,
		ProfileID:   input.ProfileID,
		AnimeID:     input.AnimeID,
		AnimeTitle:  input.AnimeTitle,
		AnimePoster: input.AnimePoster,
		CreatedAt:   time.Now(),
	}

	if err := database.DB.Create(&favorite).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add to favorites"})
		return
	}

	c.JSON(http.StatusOK, favorite)
}

func RemoveFromFavorite(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	animeId := c.Param("animeId")

	profileId := c.Query("profileId")

	query := database.DB.Where("user_id = ? AND anime_id = ?", userId, animeId)
	if profileId != "" {
		query = query.Where("profile_id = ?", profileId)
	}

	result := query.Delete(&models.Favorite{})
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove from favorites"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Removed from favorites"})
}

func GetFavoriteStatus(c *gin.Context) {
	userId := c.MustGet("userId").(uint)
	animeId := c.Param("animeId")
	profileId := c.Query("profileId")

	var entry models.Favorite
	query := database.DB.Where("user_id = ? AND anime_id = ?", userId, animeId)
	if profileId != "" {
		query = query.Where("profile_id = ?", profileId)
	}

	err := query.First(&entry).Error

	c.JSON(http.StatusOK, gin.H{"isFavorite": err == nil})
}
