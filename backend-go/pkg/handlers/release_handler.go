package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"github.com/gin-gonic/gin"
)

// GitHubRepo point to the repository for releases
const GitHubRepo = "Ansh7473/anime-pro"

// AddRelease - Admin only method (Legacy/Disabled)
func AddRelease(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Manual releases are disabled. Use GitHub Releases instead."})
}

// GetLatestReleases - Fetches latest version and direct download links from GitHub API
func GetLatestReleases(c *gin.Context) {
	// Query GitHub Public API for latest release
	url := "https://api.github.com/repos/" + GitHubRepo + "/releases/latest"
	
	resp, err := utils.HttpClient.R().Get(url)
	if err != nil || resp.IsError() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to fetch releases from GitHub API"})
		return
	}

	var ghRelease struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
		Assets  []struct {
			Name               string `json:"name"`
			Size               int64  `json:"size"`
			BrowserDownloadURL string `json:"browser_download_url" `
			UpdatedAt          string `json:"updated_at"`
		} `json:"assets"`
	}

	if err := json.Unmarshal(resp.Body(), &ghRelease); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse metadata from GitHub"})
		return
	}

	// Transform GitHub assets into our platform-specific format
	type ReleaseResponse struct {
		Platform    string `json:"platform"`
		Version     string `json:"version"`
		DownloadURL string `json:"download_url"`
		Size        string `json:"size"`
		UpdatedAt   string `json:"updated_at"`
	}

	results := make([]ReleaseResponse, 0)

	for _, asset := range ghRelease.Assets {
		platform := ""
		lowerName := strings.ToLower(asset.Name)
		
		if strings.HasSuffix(lowerName, ".exe") {
			platform = "windows"
		} else if strings.HasSuffix(lowerName, ".apk") {
			platform = "android"
		}

		if platform != "" {
			// Convert size to human readable MB
			sizeMB := fmt.Sprintf("%.1fMB", float64(asset.Size)/(1024*1024))
			
			results = append(results, ReleaseResponse{
				Platform:    platform,
				Version:     ghRelease.TagName,
				DownloadURL: asset.BrowserDownloadURL,
				Size:        sizeMB,
				UpdatedAt:   asset.UpdatedAt,
			})
		}
	}

	c.JSON(http.StatusOK, results)
}
