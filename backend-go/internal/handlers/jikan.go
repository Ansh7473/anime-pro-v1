package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
	"github.com/gin-gonic/gin"
)

// Base URL for Jikan API
const JikanBaseURL = "https://api.jikan.moe/v4"

func GenericJikanProxy(c *gin.Context, path string) {
	url := fmt.Sprintf("%s%s", JikanBaseURL, path)
	// Add original query parameters
	if c.Request.URL.RawQuery != "" {
		url = fmt.Sprintf("%s?%s", url, c.Request.URL.RawQuery)
	}

	resp, err := utils.FetchWithRetries(url, 3, 1000)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from Jikan API", "message": err.Error()})
		return
	}

	if resp.StatusCode() != http.StatusOK {
		// Just proxy the error forward
		c.Data(resp.StatusCode(), resp.Header().Get("Content-Type"), resp.Body())
		return
	}

	c.Data(http.StatusOK, resp.Header().Get("Content-Type"), resp.Body())
}

func JikanInfo(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"name":        "Jikan API Proxy",
		"version":     "1.0.0",
		"description": "Proxy for Jikan (MyAnimeList) API with rate limiting implemented in Go",
	})
}

func JikanAnimeFull(c *gin.Context) {
	id := c.Param("id")
	GenericJikanProxy(c, fmt.Sprintf("/anime/%s/full", id))
}

func JikanAnimeBasic(c *gin.Context) {
	id := c.Param("id")
	GenericJikanProxy(c, fmt.Sprintf("/anime/%s", id))
}

func JikanSearch(c *gin.Context) {
	GenericJikanProxy(c, "/anime")
}

func JikanSeasonal(c *gin.Context) {
	year := c.Param("year")
	season := c.Param("season")
	GenericJikanProxy(c, fmt.Sprintf("/seasons/%s/%s", year, season))
}

func JikanSeasonalCurrent(c *gin.Context) {
	GenericJikanProxy(c, "/seasons/now")
}

func JikanTop(c *gin.Context) {
	GenericJikanProxy(c, "/top/anime")
}

func JikanTopAnime(c *gin.Context) {
	GenericJikanProxy(c, "/top/anime")
}

func JikanRecommendations(c *gin.Context) {
	id := c.Param("id")
	GenericJikanProxy(c, fmt.Sprintf("/anime/%s/recommendations", id))
}

func JikanCharacters(c *gin.Context) {
	id := c.Param("id")
	GenericJikanProxy(c, fmt.Sprintf("/anime/%s/characters", id))
}

func JikanEpisodes(c *gin.Context) {
	id := c.Param("id")

	// Fetch all episodes by paginating through all pages
	allEpisodes := []interface{}{}
	page := 1
	limit := 100 // Maximum allowed by Jikan API

	for {
		url := fmt.Sprintf("%s/anime/%s/episodes?page=%d&limit=%d", JikanBaseURL, id, page, limit)
		resp, err := utils.FetchWithRetries(url, 3, 1000)
		if err != nil {
			if page == 1 {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from Jikan API", "message": err.Error()})
				return
			}
			// If we already have some episodes, return what we have
			break
		}

		if resp.StatusCode() != http.StatusOK {
			if page == 1 {
				c.Data(resp.StatusCode(), resp.Header().Get("Content-Type"), resp.Body())
				return
			}
			// If we already have some episodes, return what we have
			break
		}

		var result map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &result); err != nil {
			if page == 1 {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse Jikan API response", "message": err.Error()})
				return
			}
			break
		}

		data, ok := result["data"].([]interface{})
		if !ok || len(data) == 0 {
			// No more episodes
			break
		}

		allEpisodes = append(allEpisodes, data...)

		// Check if there are more pages
		pagination, ok := result["pagination"].(map[string]interface{})
		if !ok {
			break
		}

		hasNextPage, _ := pagination["has_next_page"].(bool)
		if !hasNextPage {
			break
		}

		page++
	}

	// Return all episodes in the same format as Jikan API
	c.JSON(http.StatusOK, gin.H{
		"data": allEpisodes,
		"pagination": gin.H{
			"last_visible_page": page - 1,
			"has_next_page":     false,
			"current_page":      page - 1,
			"items": gin.H{
				"count":    len(allEpisodes),
				"total":    len(allEpisodes),
				"per_page": limit,
			},
		},
	})
}

func JikanSchedule(c *gin.Context) {
	GenericJikanProxy(c, "/schedules")
}

func JikanSeasonsNow(c *gin.Context) {
	GenericJikanProxy(c, "/seasons/now")
}

func JikanSeasonsUpcoming(c *gin.Context) {
	GenericJikanProxy(c, "/seasons/upcoming")
}

func JikanSeasonsList(c *gin.Context) {
	GenericJikanProxy(c, "/seasons")
}

func JikanRelations(c *gin.Context) {
	id := c.Param("id")
	url := fmt.Sprintf("%s/anime/%s/full", JikanBaseURL, id)

	resp, err := utils.FetchWithRetries(url, 3, 1000)
	if err != nil || resp.StatusCode() != http.StatusOK {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed fetching relations"})
		return
	}

	// For relations, we need to parse Jikan's full anime object, extract relations and transform
	// This mirrors the logic in Node.js JikanRouter
	c.Data(http.StatusOK, resp.Header().Get("Content-Type"), resp.Body()) // TEMPORARY stub: just return full data for now
}

func JikanHealthCheck(c *gin.Context) {
	resp, err := utils.HttpClient.R().Get(fmt.Sprintf("%s/anime/1", JikanBaseURL))

	isHealthy := err == nil && resp.StatusCode() == http.StatusOK
	status := "unhealthy"
	apiStatus := "unavailable"

	if isHealthy {
		status = "healthy"
		apiStatus = "available"
		c.JSON(http.StatusOK, gin.H{
			"status":    status,
			"jikan_api": apiStatus,
		})
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":    status,
			"jikan_api": apiStatus,
		})
	}
}
