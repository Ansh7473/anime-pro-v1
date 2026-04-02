package providers

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
)

const ANIMELOK_BASE = "https://animelok.xyz"

// SearchAnimelok performs a search on Animelok
func SearchAnimelok(query string) []map[string]interface{} {
	url := fmt.Sprintf("%s/api/anime/search?q=%s", ANIMELOK_BASE, utils.ToUrlQuery(query))
	resp, err := utils.HttpClient.R().
		SetHeader("Referer", ANIMELOK_BASE+"/").
		Get(url)
	
	if err != nil || !resp.IsSuccess() {
		return nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &data); err != nil {
		return nil
	}

	// Animelok API sometimes returns "results", sometimes "anime"
	results, _ := data["results"].([]interface{})
	if results == nil {
		results, _ = data["anime"].([]interface{})
	}

	transformed := make([]map[string]interface{}, 0)
	for _, item := range results {
		if m, ok := item.(map[string]interface{}); ok {
			transformed = append(transformed, m)
		}
	}
	return transformed
}

// GetAnimelokMetadataByMalId resolves slugs and fetches metadata with fallback
func GetAnimelokMetadataByMalId(malId int, titles []string) []map[string]interface{} {
	if len(titles) == 0 {
		return nil
	}

	// 1. Resolve IDs
	aniId, _ := utils.GetAnilistId(malId)
	
	baseSlug := strings.ToLower(titles[0])
	baseSlug = strings.ReplaceAll(baseSlug, " ", "-")
	// Clean slug
	reg := strings.NewReplacer("(", "", ")", "", ":", "", "!", "", "?", "", ".", "")
	baseSlug = reg.Replace(baseSlug)

	candidates := []string{
		fmt.Sprintf("%s-%d", baseSlug, malId),
	}
	if aniId > 0 && aniId != malId {
		candidates = append(candidates, fmt.Sprintf("%s-%d", baseSlug, aniId))
	}
	candidates = append(candidates, baseSlug)

	// Try candidates
	for _, slug := range candidates {
		eps := GetAnimelokMetadata(slug)
		if len(eps) > 0 {
			return eps
		}
	}

	// 2. Search Fallback
	searchResults := SearchAnimelok(titles[0])
	for _, res := range searchResults {
		slug := utils.ToString(res["slug"])
		if slug == "" {
			slug = utils.ToString(res["id"])
		}
		if slug != "" {
			eps := GetAnimelokMetadata(slug)
			if len(eps) > 0 {
				return eps
			}
		}
	}

	return nil
}


// GetAnimelokMetadata fetches all episodes for a given slug
func GetAnimelokMetadata(slug string) []map[string]interface{} {
	allEpisodes := make([]map[string]interface{}, 0)
	pageSize := 250

	for page := 0; page < 10; page++ {
		url := fmt.Sprintf("%s/api/anime/%s/episodes-range?page=%d&pageSize=%d", ANIMELOK_BASE, slug, page, pageSize)
		resp, err := utils.HttpClient.R().
			SetHeader("Referer", ANIMELOK_BASE+"/").
			Get(url)
		
		if err != nil || !resp.IsSuccess() {
			break
		}

		var data map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &data); err != nil {
			break
		}

		eps, ok := data["episodes"].([]interface{})
		if !ok || len(eps) == 0 {
			break
		}

		for _, item := range eps {
			if ep, ok := item.(map[string]interface{}); ok {
				imageUrl := utils.ToString(ep["img"])
				if imageUrl != "" && !strings.HasPrefix(imageUrl, "http") {
					imageUrl = ANIMELOK_BASE + imageUrl
				}
				allEpisodes = append(allEpisodes, map[string]interface{}{
					"number": ep["number"],
					"title": ep["name"],
					"image": imageUrl,
					"description": ep["description"],
					"isFiller": ep["isFiller"],
				})
			}
		}

		if len(eps) < pageSize {
			break
		}
	}
	return allEpisodes
}

// GetAnimelokSources fetches streaming sources and subtitles for a given slug and episode
func GetAnimelokSources(slug string, ep int) map[string]interface{} {
	url := fmt.Sprintf("%s/api/anime/%s/episodes/%d", ANIMELOK_BASE, slug, ep)
	resp, err := utils.HttpClient.R().
		SetHeader("Referer", ANIMELOK_BASE+"/").
		Get(url)
	
	if err != nil || !resp.IsSuccess() {
		return map[string]interface{}{"sources": []interface{}{}, "subtitles": []interface{}{}}
	}

	var data map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &data); err != nil {
		return map[string]interface{}{"sources": []interface{}{}, "subtitles": []interface{}{}}
	}

	episodeData, ok := data["episode"].(map[string]interface{})
	if !ok {
		return map[string]interface{}{"sources": []interface{}{}, "subtitles": []interface{}{}}
	}

	servers, _ := episodeData["servers"].([]interface{})
	sources := make([]map[string]interface{}, 0)
	for _, item := range servers {
		if s, ok := item.(map[string]interface{}); ok {
			name := strings.ToLower(utils.ToString(s["name"]))
			tip := strings.ToLower(utils.ToString(s["tip"]))
			
			// Detect category and language
			category := "sub"
			if strings.Contains(name, "hindi") || strings.Contains(tip, "hindi") {
				category = "hindi"
			} else if strings.Contains(tip, "dub") {
				category = "dub"
			}

			finalUrl := utils.ToString(s["url"])
			// Handle JSON-encoded URLs occasionally returned by some providers
			if strings.HasPrefix(finalUrl, "[") && strings.HasSuffix(finalUrl, "]") {
				var parsed []map[string]interface{}
				if err := json.Unmarshal([]byte(finalUrl), &parsed); err == nil && len(parsed) > 0 {
					finalUrl = utils.ToString(parsed[0]["url"])
				}
			}

			isM3U8 := strings.Contains(strings.ToLower(finalUrl), ".m3u8") || strings.Contains(strings.ToLower(finalUrl), "/m3u8")
			isEmbed := !isM3U8

			sources = append(sources, map[string]interface{}{
				"name":     utils.ToString(s["name"]) + " " + utils.ToString(s["tip"]),
				"url":      finalUrl,
				"category": category,
				"isM3U8":   isM3U8,
				"isEmbed":  isEmbed,
				"type":     "iframe",
				"provider": "Animelok",
			})
		}
	}

	subs, _ := episodeData["subtitles"].([]interface{})
	subtitles := make([]map[string]interface{}, 0)
	for _, item := range subs {
		if s, ok := item.(map[string]interface{}); ok {
			subtitles = append(subtitles, map[string]interface{}{
				"language": s["name"],
				"url": s["url"],
			})
		}
	}

	return map[string]interface{}{
		"sources": sources,
		"subtitles": subtitles,
	}
}
