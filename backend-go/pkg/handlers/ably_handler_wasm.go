//go:build js && wasm
// +build js,wasm

package handlers

import (
	"net/http"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
)

// GetChatToken is a stub for Cloudflare Workers where Ably is not supported
func GetChatToken(c *utils.LiteContext) {
	c.JSON(http.StatusNotImplemented, utils.H{
		"error": "Real-time chat is currently not supported in the Edge/Cloudflare version of the backend. Please use the standalone server build for chat features.",
	})
}
