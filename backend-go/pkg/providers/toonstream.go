package providers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"github.com/PuerkitoBio/goquery"
)

const TOONSTREAM_API_BASE = "https://toonstream-api.ry4n.qzz.io/api"
const TOONSTREAM_SITE_BASE = "https://toonstream.dad"

var TOONSTREAM_SERVER_NAMES = map[string]string{
	"short":      "Short",
	"ruby":       "Ruby",
	"cloudy":     "Cloudy",
	"strmup":     "Strmup",
	"watch/dl":   "Watch/DL",
	"turbo":      "Turbo",
	"moly":       "Moly",
	"filemoon":   "Filemoon",
	"streamwish": "StreamWish",
	"doodstream": "DoodStream",
	"mp4upload":  "Mp4Upload",
	"vidhide":    "VidHide",
	"streamtape": "Streamtape",
}

type ToonstreamResult struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
	Image string `json:"image"`
}

type ToonstreamApiResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Title   string `json:"title"`
		Sources []struct {
			Url     string `json:"url"`
			Type    string `json:"type"`
			Quality string `json:"quality"`
		} `json:"sources"`
		Servers []struct {
			Name string `json:"name"`
			ID   string `json:"id"`
		} `json:"servers"`
		Languages []string `json:"languages"`
	} `json:"data"`
}

// SearchToonstream searches for anime on Toonstream using the website (as the API doesn't seem to have a dedicated search)
func SearchToonstream(query string) []ToonstreamResult {
	url := fmt.Sprintf("%s/?s=%s", TOONSTREAM_SITE_BASE, urlQuery(query))
	resp, err := utils.HttpClient.R().
		SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36").
		SetHeader("Referer", TOONSTREAM_SITE_BASE+"/").
		Get(url)

	if err != nil || !resp.IsSuccess() {
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(resp.String()))
	if err != nil {
		return nil
	}

	results := make([]ToonstreamResult, 0)
	doc.Find(".post-lst li article.post").Each(func(i int, s *goquery.Selection) {
		title := s.Find(".entry-title").Text()
		link, _ := s.Find(".lnk-blk").Attr("href")
		img, _ := s.Find(".post-thumbnail img").Attr("src")

		slug := ""
		if link != "" {
			parts := strings.Split(strings.Trim(link, "/"), "/")
			if len(parts) > 0 {
				slug = parts[len(parts)-1]
			}
		}

		id, _ := s.Attr("id")

		results = append(results, ToonstreamResult{
			ID:    id,
			Title: title,
			Slug:  slug,
			Image: img,
		})
	})

	return results
}

// urlQuery is a local helper since utils.ToUrlQuery might be named differently in pkg/utils
func urlQuery(q string) string {
	return strings.ReplaceAll(q, " ", "+")
}

// GetToonstreamSources fetches streaming sources using either the JSON API or direct website scraping
func GetToonstreamSources(slug string, season int, ep int) []map[string]interface{} {
	// Try website scraping first as it seems more reliable for recent titles
	sources := ScrapeToonstreamSources(slug, season, ep)
	if len(sources) > 0 {
		return sources
	}

	// Fallback to JSON API
	// Pattern: /episode/{slug}-{season}x{episode}
	apiUrl := fmt.Sprintf("%s/episode/%s-%dx%d", TOONSTREAM_API_BASE, slug, season, ep)

	resp, err := utils.HttpClient.R().
		SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36").
		Get(apiUrl)

	if err != nil || !resp.IsSuccess() {
		return nil
	}

	// The API structure sometimes returns the data directly or wrapped in "data"
	var apiData map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &apiData); err != nil {
		return nil
	}

	success, ok := apiData["success"].(bool)
	if !ok || !success {
		return nil
	}

	sourcesList := make([]map[string]interface{}, 0)

	// In the Tatakai snippet, the response structure has sources and servers
	rawSources, _ := apiData["sources"].([]interface{})
	rawServers, _ := apiData["servers"].([]interface{})

	for i, s := range rawSources {
		src, sok := s.(map[string]interface{})
		if !sok {
			continue
		}

		serverName := fmt.Sprintf("Server %d", i+1)
		serverId := ""
		if i < len(rawServers) {
			if srv, ok := rawServers[i].(map[string]interface{}); ok {
				serverName = utils.ToString(srv["name"])
				serverId = strings.ToLower(utils.ToString(srv["id"]))
			}
		}

		// Use friendly name map
		if friendly, exists := TOONSTREAM_SERVER_NAMES[serverId]; exists {
			serverName = friendly
		} else if friendly, exists := TOONSTREAM_SERVER_NAMES[strings.ToLower(serverName)]; exists {
			serverName = friendly
		}

		finalUrl := utils.ToString(src["url"])
		quality := utils.ToString(src["quality"])
		if quality != "" {
			serverName = fmt.Sprintf("%s (%s)", serverName, quality)
		}

		category := "sub"
		languages, _ := apiData["languages"].([]interface{})
		for _, lang := range languages {
			l := strings.ToLower(utils.ToString(lang))
			if strings.Contains(l, "hindi") {
				category = "hindi"
				break
			}
		}

		sourcesList = append(sourcesList, map[string]interface{}{
			"name":     serverName,
			"url":      finalUrl,
			"category": category,
			"isM3U8":   strings.Contains(strings.ToLower(finalUrl), ".m3u8"),
			"isEmbed":  !strings.Contains(strings.ToLower(finalUrl), ".m3u8"),
			"type":     "iframe",
			"provider": "Toonstream",
		})
	}

	return sourcesList
}

// GetToonstreamSourcesDirect is a helper to try direct URL patterns
func GetToonstreamSourcesDirect(slug string, ep int) []map[string]interface{} {
	return GetToonstreamSources(slug, 1, ep)
}

// ScrapeToonstreamSources scrapes embeds directly from toonstream.dad
func ScrapeToonstreamSources(slug string, season int, ep int) []map[string]interface{} {
	epSlug := fmt.Sprintf("%s-%dx%d", slug, season, ep)
	url := fmt.Sprintf("%s/episode/%s/", TOONSTREAM_SITE_BASE, epSlug)

	resp, err := utils.HttpClient.R().
		SetHeaders(map[string]string{
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			"Referer":    TOONSTREAM_SITE_BASE + "/",
			"Accept":     "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
		}).
		Get(url)

	if err != nil || !resp.IsSuccess() {
		// Try without season if season is 1
		if season == 1 {
			epSlug = fmt.Sprintf("%s-%d", slug, ep)
			url = fmt.Sprintf("%s/episode/%s/", TOONSTREAM_SITE_BASE, epSlug)
			resp, err = utils.HttpClient.R().
				SetHeaders(map[string]string{
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
					"Referer":    TOONSTREAM_SITE_BASE + "/",
				}).
				Get(url)
			if err != nil || !resp.IsSuccess() {
				return nil
			}
		} else {
			return nil
		}
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(resp.String()))
	if err != nil {
		return nil
	}

	sourcesList := make([]map[string]interface{}, 0)

	// Pattern 1: Find all iframes in the video player section
	doc.Find(".video-player .video iframe").Each(func(i int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if src == "" {
			src, _ = s.Attr("data-src")
		}
		if src != "" {
			addSourceFromUrl(&sourcesList, src, i)
		}
	})

	// Pattern 2: Global iframe search for trembed
	if len(sourcesList) == 0 {
		doc.Find("iframe").Each(func(i int, s *goquery.Selection) {
			src, _ := s.Attr("src")
			if strings.Contains(src, "trembed") {
				addSourceFromUrl(&sourcesList, src, i)
			}
		})
	}

	return sourcesList
}

func addSourceFromUrl(list *[]map[string]interface{}, finalUrl string, index int) {
	serverName := fmt.Sprintf("Server %d", index+1)

	// Extract server ID if possible to get friendly name
	if strings.Contains(finalUrl, "trembed=") {
		parts := strings.Split(finalUrl, "trembed=")
		if len(parts) > 1 {
			id := strings.Split(parts[1], "&")[0]
			if friendly, exists := TOONSTREAM_SERVER_NAMES[id]; exists {
				serverName = friendly
			}
		}
	}

	*list = append(*list, map[string]interface{}{
		"name":     serverName,
		"url":      finalUrl,
		"category": "sub",
		"isM3U8":   strings.Contains(strings.ToLower(finalUrl), ".m3u8"),
		"isEmbed":  !strings.Contains(strings.ToLower(finalUrl), ".m3u8"),
		"type":     "iframe",
		"provider": "Toonstream",
	})
}
