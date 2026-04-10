package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Client represents a connected user in a chat room
type Client struct {
	ID     uint
	Conn   *websocket.Conn
	Send   chan []byte
	RoomID string // animeId-episode
	Hub    *Hub
}

// Hub manages active clients and room broadcasting
type Hub struct {
	Rooms      map[string]map[*Client]bool
	Broadcast  chan Message
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

// Message defines the structure of data sent over WS
type Message struct {
	RoomID   string `json:"roomId"`
	UserID   uint   `json:"userId"`
	UserName string `json:"userName"`
	Avatar   string `json:"avatar"`
	Content  string `json:"content"`
	Type     string `json:"type"` // "chat", "join", "leave"
}

func NewHub() *Hub {
	return &Hub{
		Rooms:      make(map[string]map[*Client]bool),
		Broadcast:  make(chan Message),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			if h.Rooms[client.RoomID] == nil {
				h.Rooms[client.RoomID] = make(map[*Client]bool)
			}
			h.Rooms[client.RoomID][client] = true
			h.mu.Unlock()
			log.Printf("Client registered in room %s", client.RoomID)

		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Rooms[client.RoomID][client]; ok {
				delete(h.Rooms[client.RoomID], client)
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("Client unregistered from room %s", client.RoomID)

		case msg := <-h.Broadcast:
			h.mu.Lock()
			if clients, ok := h.Rooms[msg.RoomID]; ok {
				for client := range clients {
					select {
					case client.Send <- h.jsonMessage(msg):
					default:
						close(client.Send)
						delete(clients, client)
					}
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) jsonMessage(msg Message) []byte {
	b, _ := json.Marshal(msg)
	return b
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for dev, restrict in prod
	},
}

// ServeWS handles WebSocket upgradation and client lifecycle
func (h *Hub) ServeWS(c *gin.Context) {
	animeId := c.Query("animeId")
	episode := c.Query("episode")
	if animeId == "" || episode == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing animeId or episode"})
		return
	}
	roomId := animeId + "-" + episode

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("WS Upgrade error: %v", err)
		return
	}

	userId, _ := c.Get("userId")
	client := &Client{
		ID:     userId.(uint),
		Conn:   conn,
		Send:   make(chan []byte, 256),
		RoomID: roomId,
		Hub:    h,
	}

	h.Register <- client

	// Start reader and writer routines
	go client.writePump()
	go client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.Unregister <- c
		c.Conn.Close()
	}()

	for {
		var msg Message
		err := c.Conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}
		msg.RoomID = c.RoomID
		c.Hub.Broadcast <- msg
	}
}

func (c *Client) writePump() {
	defer func() {
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.Conn.WriteMessage(websocket.TextMessage, message)
		}
	}
}

var MainHub = NewHub()
