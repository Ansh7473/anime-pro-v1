//go:build js && wasm
// +build js,wasm

package handlers

import (
	"net/http"
	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
)

type Hub struct{}
type Message struct{}

func NewHub() *Hub {
	return &Hub{}
}

func (h *Hub) Run() {}

func (h *Hub) ServeWS(c *utils.LiteContext) {
	c.JSON(http.StatusNotImplemented, utils.H{
		"error": "WebSockets are not supported in the Cloudflare Edge version. Please use the standalone server or Ably-based real-time features if configured.",
	})
}

var MainHub = &Hub{}
