package providers

import (
	"fmt"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
	"github.com/PuerkitoBio/goquery"
)

const TOONSTREAM_BASE = "https://toonstream.dad"

type ToonstreamResult struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	Slug  string `json:"slug"`
	Image string `json:"image"`
}

// SearchToonstream searches for anime on Toonstream
func SearchToonstream(query string) []ToonstreamResult {
	url := fmt.Sprintf("%s/?s=%s", TOONSTREAM_BASE, utils.ToUrlQuery(query))
	resp, err := utils.HttpClient.R().
		SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36").
		SetHeader("Referer", TOONSTREAM_BASE+"/").
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

// GetToonstreamSources fetches streaming sources for a given slug, season, and episode
func GetToonstreamSources(slug string, season int, ep int) []map[string]interface{} {
	// Pattern: /episode/{slug}-{season}x{episode}/
	// Sometimes it's just {slug}-{episode} if season is 1, but Toonstream seems to use SxE format
	url := fmt.Sprintf("%s/episode/%s-%dx%d/", TOONSTREAM_BASE, slug, season, ep)
	
	// Fallback for slugs that already contain the season/episode info or different formats
	// But based on documentation, this is the primary pattern.
	
	sources := scrapeToonstreamEpisode(url)
	if len(sources) == 0 && season == 1 {
		// Try without season if 1
		urlAlt := fmt.Sprintf("%s/episode/%s-1x%d/", TOONSTREAM_BASE, slug, ep)
		if urlAlt != url {
			sources = scrapeToonstreamEpisode(urlAlt)
		}
	}
	
	return sources
}

func scrapeToonstreamEpisode(url string) []map[string]interface{} {
	resp, err := utils.HttpClient.R().
		SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36").
		SetHeader("Referer", TOONSTREAM_BASE+"/").
		Get(url)

	if err != nil || !resp.IsSuccess() {
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(resp.String()))
	if err != nil {
		return nil
	}

	sources := make([]map[string]interface{}, 0)

	// Toonstream uses tr-movie theme or similar which has an iframe or server list
	// Based on scraped_api_endpoints.md:
	// https://toonstream.dad/?trembed={embed_id}&trid={term_id}&trtype={type_id}
	
	// Let's find all server buttons/links
	// Common selectors for this theme: .dooplay_player_option or similar
	doc.Find(".video-player .video iframe").Each(func(i int, s *goquery.Selection) {
		src, _ := s.Attr("src")
		if src == "" {
			src, _ = s.Attr("data-src")
		}
		
		if src != "" {
			sources = append(sources, map[string]interface{}{
				"name": "Default Server",
				"url":  src,
				"category": "sub", // Default
				"isM3U8":   strings.Contains(src, ".m3u8"),
				"isEmbed":  !strings.Contains(src, ".m3u8"),
				"type":     "iframe",
				"provider": "Toonstream",
			})
		}
	})

	// Check for multiple servers in the UI
	// Usually they are in a list with data-id or similar
	doc.Find("#playeroptionsul li").Each(func(i int, s *goquery.Selection) {
		name := strings.TrimSpace(s.Find(".title").Text())
		embedId, _ := s.Attr("data-n")
		termId, _ := s.Attr("data-post")
		typeId, _ := s.Attr("data-type")

		if embedId != "" && termId != "" {
			serverUrl := fmt.Sprintf("%s/?trembed=%s&trid=%s&trtype=%s", TOONSTREAM_BASE, embedId, termId, typeId)
			
			category := "sub"
			if strings.Contains(strings.ToLower(name), "hindi") {
				category = "hindi"
			} else if strings.Contains(strings.ToLower(name), "dub") {
				category = "dub"
			}

			sources = append(sources, map[string]interface{}{
				"name":     name,
				"url":      serverUrl,
				"category": category,
				"isM3U8":   false,
				"isEmbed":  true,
				"type":     "iframe",
				"provider": "Toonstream",
			})
		}
	})

	return sources
}

// GetToonstreamSourcesDirect is a helper to try direct URL patterns
func GetToonstreamSourcesDirect(slug string, ep int) []map[string]interface{} {
	// Try common season 1 pattern
	return GetToonstreamSources(slug, 1, ep)
}
