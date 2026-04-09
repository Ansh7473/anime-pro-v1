package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
)

type H map[string]interface{}

// LiteContext is a tiny, Gin-like wrapper around http.ResponseWriter and Request
type LiteContext struct {
	Writer  http.ResponseWriter
	Request *http.Request
	Params  map[string]string
	store   map[string]interface{}
	aborted bool
}

func (c *LiteContext) JSON(code int, obj interface{}) {
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(code)
	json.NewEncoder(c.Writer).Encode(obj)
}

func (c *LiteContext) Query(key string) string {
	return c.Request.URL.Query().Get(key)
}

func (c *LiteContext) DefaultQuery(key, defaultValue string) string {
	val := c.Request.URL.Query().Get(key)
	if val == "" {
		return defaultValue
	}
	return val
}

func (c *LiteContext) Param(key string) string {
	return c.Request.PathValue(key)
}

func (c *LiteContext) Status(code int) {
	c.Writer.WriteHeader(code)
}

func (c *LiteContext) Data(code int, contentType string, data []byte) {
	c.Writer.Header().Set("Content-Type", contentType)
	c.Writer.WriteHeader(code)
	c.Writer.Write(data)
}

func (c *LiteContext) GetHeader(key string) string {
	return c.Request.Header.Get(key)
}

func (c *LiteContext) Header(key, value string) {
	c.Writer.Header().Set(key, value)
}

func (c *LiteContext) String(code int, format string, values ...interface{}) {
	c.Writer.WriteHeader(code)
	fmt.Fprintf(c.Writer, format, values...)
}

func (c *LiteContext) ClientIP() string {
	return c.Request.RemoteAddr
}

func (c *LiteContext) ShouldBindJSON(obj interface{}) error {
	return json.NewDecoder(c.Request.Body).Decode(obj)
}

func (c *LiteContext) Get(key string) (interface{}, bool) {
	if c.store == nil {
		return nil, false
	}
	val, ok := c.store[key]
	return val, ok
}

func (c *LiteContext) Set(key string, value interface{}) {
	if c.store == nil {
		c.store = make(map[string]interface{})
	}
	c.store[key] = value
}

func (c *LiteContext) MustGet(key string) interface{} {
	if val, ok := c.Get(key); ok {
		return val
	}
	panic(fmt.Sprintf("Key \"%s\" does not exist", key))
}

func (c *LiteContext) Abort() {
	c.aborted = true
}

func (c *LiteContext) IsAborted() bool {
	return c.aborted
}

// Internal tracking
type contextKey string

// HandlerFunc is our version of gin.HandlerFunc
type HandlerFunc func(*LiteContext)

// ToStd converts our HandlerFunc to a standard http.HandlerFunc
func ToStd(h HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx := &LiteContext{
			Writer:  w,
			Request: r,
			store:   make(map[string]interface{}),
		}
		h(ctx)
	}
}

// Middleware type
type Middleware func(HandlerFunc) HandlerFunc

// Chain applies a sequence of middlewares to a HandlerFunc
func Chain(h HandlerFunc, m ...Middleware) HandlerFunc {
	for i := len(m) - 1; i >= 0; i-- {
		h = m[i](h)
	}
	return h
}
