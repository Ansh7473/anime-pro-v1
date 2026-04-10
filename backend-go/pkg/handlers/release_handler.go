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
const GitHubRepo = "Ansh7473/anime-pro-v1"

// AddRelease - Admin only method (Legacy/Disabled)
func AddRelease(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "Manual releases are disabled. Use GitHub Releases instead."})
}

// GetLatestReleases - Scan recent releases to find newest Windows and Android binaries independently
func GetLatestReleases(c *gin.Context) {
	// Query GitHub Public API for last 10 releases
	url := "https://api.github.com/repos/" + GitHubRepo + "/releases?per_page=10"
	
	resp, err := utils.HttpClient.R().Get(url)
	if err != nil || resp.IsError() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Failed to fetch releases from GitHub API"})
		return
	}

	var ghReleases []struct {
		TagName string `json:"tag_name"`
		Name    string `json:"name"`
		Assets  []struct {
			Name               string `json:"name"`
			Size               int64  `json:"size"`
			BrowserDownloadURL string `json:"browser_download_url"`
			UpdatedAt          string `json:"updated_at"`
		} `json:"assets"`
	}

	if err := json.Unmarshal(resp.Body(), &ghReleases); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse metadata from GitHub"})
		return
	}

	// Platform Response Schema
	type ReleaseEntry struct {
		Platform    string `json:"platform"`
		Version     string `json:"version"`
		DownloadURL string `json:"download_url"`
		Size        string `json:"size"`
		UpdatedAt   string `json:"updated_at"`
	}

	results := make([]ReleaseEntry, 0)
	foundPlatforms := make(map[string]bool)

	// Scan through releases from newest to oldest
	for _, release := range ghReleases {
		for _, asset := range release.Assets {
			platform := ""
			lowerName := strings.ToLower(asset.Name)
			
			if strings.HasSuffix(lowerName, ".exe") && !foundPlatforms["windows"] {
				platform = "windows"
			} else if strings.HasSuffix(lowerName, ".apk") && !foundPlatforms["android"] {
				platform = "android"
			}

			if platform != "" {
				sizeMB := fmt.Sprintf("%.1fMB", float64(asset.Size)/(1024*1024))
				results = append(results, ReleaseEntry{
					Platform:    platform,
					Version:     release.TagName,
					DownloadURL: asset.BrowserDownloadURL,
					Size:        sizeMB,
					UpdatedAt:   asset.UpdatedAt,
				})
				foundPlatforms[platform] = true
			}
		}
		
		// Stop if all supported platforms are already found
		if foundPlatforms["windows"] && foundPlatforms["android"] {
			break
		}
	}

	c.JSON(http.StatusOK, results)
}
