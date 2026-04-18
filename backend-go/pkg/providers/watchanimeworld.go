package providers

import (
	"encoding/json"
	"fmt"
	"strings"
	"encoding/base64"

	"github.com/Ansh7473/anime-pro/backend-go/pkg/utils"
	"github.com/PuerkitoBio/goquery"
)

const WATCHANIMELORLD_BASE = "https://watchanimeworld.net"

// SearchWatchAnimeWorld searches for anime on WatchAnimeWorld (Internal utility)
func SearchWatchAnimeWorld(query string) []map[string]interface{} {
	url := fmt.Sprintf("%s/?s=%s", WATCHANIMELORLD_BASE, strings.ReplaceAll(query, " ", "+"))
	resp, err := utils.HttpClient.R().
		SetHeader("Referer", WATCHANIMELORLD_BASE+"/").
		Get(url)
	
	if err != nil || !resp.IsSuccess() {
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(resp.String()))
	if err != nil {
		return nil
	}

	results := make([]map[string]interface{}, 0)
	doc.Find(".post.movies").Each(func(i int, s *goquery.Selection) {
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

		results = append(results, map[string]interface{}{
			"title": title,
			"slug":  slug,
			"image": img,
		})
	})

	return results
}

// GetWatchAnimeWorldSources fetches streaming sources for a given slug and episode
func GetWatchAnimeWorldSources(titles []string, ep int) []map[string]interface{} {
	if len(titles) == 0 {
		return nil
	}

	// 1. Resolve slug (using titles[0] as primary)
	slug := ToKebab(titles[0])
	
	// 2. Fetch the episode page
	// Pattern: /episode/{slug}-{season}x{episode}/ - assume season 1 for now
	epSlug := fmt.Sprintf("%s-1x%d", slug, ep)
	epUrl := fmt.Sprintf("%s/episode/%s/", WATCHANIMELORLD_BASE, epSlug)
	
	resp, err := utils.HttpClient.R().
		SetHeader("Referer", WATCHANIMELORLD_BASE+"/").
		Get(epUrl)
	
	if err != nil || !resp.IsSuccess() {
		// Try search fallback if direct slug fails
		results := SearchWatchAnimeWorld(titles[0])
		if len(results) > 0 {
			bestSlug := utils.ToString(results[0]["slug"])
			epSlug = fmt.Sprintf("%s-1x%d", bestSlug, ep)
			epUrl = fmt.Sprintf("%s/episode/%s/", WATCHANIMELORLD_BASE, epSlug)
			resp, err = utils.HttpClient.R().
				SetHeader("Referer", WATCHANIMELORLD_BASE+"/").
				Get(epUrl)
		}
	}

	if err != nil || !resp.IsSuccess() {
		return nil
	}

	// 3. Extract player data
	// The player usually calls api/player1.php?data=[base64]
	// We scan the HTML for this pattern
	body := resp.String()
	dataKey := "player1.php?data="
	startIdx := strings.Index(body, dataKey)
	if startIdx == -1 {
		return nil
	}

	startIdx += len(dataKey)
	endIdx := strings.IndexAny(body[startIdx:], ` "'`)
	if endIdx == -1 {
		return nil
	}
	
	b64Data := body[startIdx : startIdx+endIdx]
	
	// 4. Fetch the source JSON from player1.php or decode it directly if it's just the data
	// Actually, player1.php?data=... IS the endpoint.
	// We decode the base64 part to see if it's JSON.
	decoded, err := base64.StdEncoding.DecodeString(b64Data)
	if err != nil {
		return nil
	}

	var rawSources []map[string]interface{}
	if err := json.Unmarshal(decoded, &rawSources); err != nil {
		return nil
	}

	sources := make([]map[string]interface{}, 0)
	for _, rs := range rawSources {
		lang := utils.ToString(rs["language"])
		link := utils.ToString(rs["link"])
		
		category := "sub"
		if strings.Contains(strings.ToLower(lang), "hindi") {
			category = "hindi"
		} else if strings.Contains(strings.ToLower(lang), "english") {
			category = "dub"
		}

		sources = append(sources, map[string]interface{}{
			"name":     fmt.Sprintf("WatchAnimeWorld - %s", lang),
			"url":      link,
			"category": category,
			"isM3U8":   false, // These are short.icu links usually
			"isEmbed":  true,
			"provider": "WatchAnimeWorld",
			"type":     "iframe",
		})
	}

	return sources
}
