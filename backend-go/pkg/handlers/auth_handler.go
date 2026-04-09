package handlers

import (
	"log"
	"net/http"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/models"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// generateToken creates a JWT token for the given userId, valid for 7 days.
func generateToken(userId string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userId,
		"exp":    time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})
	return token.SignedString(config.GetJWTSecret())
}

func Register(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required,min=6"`
		Name     string `json:"name" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	// Check if user exists
	iter := database.DB.Collection("users").Where("email", "==", input.Email).Limit(1).Documents(database.Ctx)
	if _, err := iter.Next(); err != database.Done {
		if err == nil {
			c.JSON(http.StatusConflict, utils.H{"error": "User already exists with this email"})
			return
		}
		// Handle other iterator errors if any
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to process password"})
		return
	}

	// Atomic registration using Batch
	batch := database.DB.Batch()
	
	userRef := database.DB.Collection("users").NewDoc()
	user := models.User{
		ID:        userRef.ID,
		Email:     input.Email,
		Password:  string(hashedPassword),
		Role:      "user",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	batch.Set(userRef, user)

	profileRef := database.DB.Collection("profiles").NewDoc()
	profile := models.Profile{
		ID:        profileRef.ID,
		UserID:    user.ID,
		Name:      input.Name,
		Avatar:    "",
		CreatedAt: time.Now(),
		AutoNext:  true,
		AutoSkip:  false,
		Language:  "multi",
	}
	batch.Set(profileRef, profile)

	if _, err := batch.Commit(database.Ctx); err != nil {
		log.Printf("❌ Failed to commit register batch: %v", err)
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to create user"})
		return
	}

	// Auto-login: Generate token
	tokenString, err := generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusOK, utils.H{"message": "User registered successfully. Please login.", "userId": user.ID})
		return
	}

	c.JSON(http.StatusOK, utils.H{
		"message": "User registered successfully",
		"token":   tokenString,
		"user": utils.H{
			"id":       user.ID,
			"email":    user.Email,
			"profiles": []models.Profile{profile},
		},
	})
}

func Login(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	var input struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, utils.H{"error": err.Error()})
		return
	}

	// Find user by email
	iter := database.DB.Collection("users").Where("email", "==", input.Email).Limit(1).Documents(database.Ctx)
	doc, err := iter.Next()
	if err != nil {
		if err == database.Done {
			c.JSON(http.StatusUnauthorized, utils.H{"error": "Invalid credentials"})
		} else {
			c.JSON(http.StatusInternalServerError, utils.H{"error": "Database error"})
		}
		return
	}

	var user models.User
	if err := doc.DataTo(&user); err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to parse user data"})
		return
	}

	// Check password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, utils.H{"error": "Invalid credentials"})
		return
	}

	// Fetch profiles
	var profiles []models.Profile
	pIter := database.DB.Collection("profiles").Where("userId", "==", user.ID).Documents(database.Ctx)
	for {
		pDoc, err := pIter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			break
		}
		var p models.Profile
		pDoc.DataTo(&p)
		profiles = append(profiles, p)
	}

	// Create token
	tokenString, err := generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, utils.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, utils.H{
		"token": tokenString,
		"user": utils.H{
			"id":       user.ID,
			"email":    user.Email,
			"profiles": profiles,
		},
	})
}

func GetCurrentUser(c *utils.LiteContext) {
	if database.DB == nil {
		c.JSON(http.StatusServiceUnavailable, utils.H{"error": "Database not available"})
		return
	}

	userId := c.MustGet("userId").(string)

	doc, err := database.DB.Collection("users").Doc(userId).Get(database.Ctx)
	if err != nil {
		c.JSON(http.StatusNotFound, utils.H{"error": "User not found"})
		return
	}

	var user models.User
	doc.DataTo(&user)

	// Fetch profiles
	var profiles []models.Profile
	pIter := database.DB.Collection("profiles").Where("userId", "==", userId).Documents(database.Ctx)
	for {
		pDoc, err := pIter.Next()
		if err == database.Done {
			break
		}
		if err != nil {
			break
		}
		var p models.Profile
		pDoc.DataTo(&p)
		profiles = append(profiles, p)
	}

	c.JSON(http.StatusOK, utils.H{
		"id":       user.ID,
		"email":    user.Email,
		"profiles": profiles,
	})
}

