package utils

import (
	"crypto/tls"
	"net/http"
	"net/url"
	"time"

	"encoding/json"
	"github.com/go-resty/resty/v2"
)

// EpisodeMetadata represents a standard episode object used across providers
type EpisodeMetadata struct {
	ID           string `json:"id"`
	Number       int    `json:"number"`
	Title        string `json:"title"`
	Image        string `json:"image"`
	Description  string `json:"description"`
	Aired        string `json:"aired"`
	IsFiller     bool   `json:"isFiller"`
	OfficialSite string `json:"officialSite"`
	Site         string `json:"site"`
}



// HttpClient is a globally configured resty client for efficient HTTP requests
var HttpClient = resty.New()

func init() {
	// Configure global HTTP client settings for high performance
	HttpClient.SetTimeout(10 * time.Second)
	
	// Disable TLS verification if needed for certain proxy sources
	HttpClient.SetTLSClientConfig(&tls.Config{InsecureSkipVerify: true})
	
	// Ignore redirects if necessary or set redirect policies
	HttpClient.SetRedirectPolicy(resty.FlexibleRedirectPolicy(10))
	
	// Set common user agent
	HttpClient.SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
}

// FetchWithRetries provides a convenient wrapper around resty with specific retry logic
func FetchWithRetries(url string, retries int, retryWaitTime time.Duration) (*resty.Response, error) {
	client := resty.New()
	client.SetRetryCount(retries).
		SetRetryWaitTime(retryWaitTime).
		SetRetryMaxWaitTime(time.Second * 5).
		AddRetryCondition(
			func(r *resty.Response, err error) bool {
				// Retry on specific error codes, particularly rate limiting (429) and server errors (5xx)
				if err != nil {
					return true
				}
				status := r.StatusCode()
				// Jikan rate limits return 429
				return status == http.StatusTooManyRequests || status >= 500
			},
		)

	return client.R().Get(url)
}

// ToString is a simple helper for safe string field extraction from interfaces
func ToString(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// ToUrlQuery escapes a string for use in a URL query parameter
func ToUrlQuery(s string) string {
	return url.QueryEscape(s)
}

// Unmarshal is a helper for JSON unmarshaling with resty response body
func Unmarshal(data []byte, v interface{}) error {
	return json.Unmarshal(data, v)
}



