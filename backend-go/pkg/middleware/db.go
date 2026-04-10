package middleware

import (
	"net/http"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/gin-gonic/gin"
)

// DBMiddleware ensures that the database connection is initialized.
// If the database client is nil, it returns a 503 error with diagnostic info.
func DBMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if database.DB == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error":   "Database connection not initialized",
				"details": "The Firebase/Firestore client failed to start. Check FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT_JSON environment variables.",
				"status":  "critical",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
