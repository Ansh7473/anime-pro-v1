package middleware

import (
	"net/http"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/database"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
)

// DBMiddleware ensures that the database connection is initialized.
func DBMiddleware(next utils.HandlerFunc) utils.HandlerFunc {
	return func(c *utils.LiteContext) {
		if database.DB == nil {
			c.JSON(http.StatusServiceUnavailable, utils.H{
				"error":   "Database connection not initialized",
				"details": "The Firebase/Firestore client failed to start.",
				"status":  "critical",
			})
			c.Abort()
			return
		}
		next(c)
	}
}
