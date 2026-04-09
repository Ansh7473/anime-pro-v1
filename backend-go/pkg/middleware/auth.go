package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/config"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"github.com/golang-jwt/jwt/v5"
)

func AuthMiddleware(next utils.HandlerFunc) utils.HandlerFunc {
	return func(c *utils.LiteContext) {
		authHeader := c.GetHeader("Authorization")
		var tokenString string

		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, utils.H{"error": "Authorization token is required"})
			c.Abort()
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				log.Printf("Unexpected signing method: %v", token.Header["alg"])
				return nil, jwt.ErrSignatureInvalid
			}
			return config.GetJWTSecret(), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, utils.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, utils.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		userId, ok := claims["userId"].(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, utils.H{"error": "Invalid user ID in token"})
			c.Abort()
			return
		}
		c.Set("userId", userId)

		next(c)
	}
}

func OptionalAuthMiddleware(next utils.HandlerFunc) utils.HandlerFunc {
	return func(c *utils.LiteContext) {
		authHeader := c.GetHeader("Authorization")
		var tokenString string

		if authHeader != "" {
			parts := strings.Split(authHeader, " ")
			if len(parts) == 2 && parts[0] == "Bearer" {
				tokenString = parts[1]
			}
		}

		if tokenString == "" {
			tokenString = c.Query("token")
		}

		if tokenString == "" {
			next(c)
			return
		}

		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return config.GetJWTSecret(), nil
		})

		if err == nil && token.Valid {
			if claims, ok := token.Claims.(jwt.MapClaims); ok {
				if userId, ok := claims["userId"].(string); ok {
					c.Set("userId", userId)
				}
			}
		}

		next(c)
	}
}
