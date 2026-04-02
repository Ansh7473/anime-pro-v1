package providers

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
)


var (
	titleCache = make(map[string][]string)
	cacheMutex sync.RWMutex
)

// GetAnimeTitles resolves a MAL ID to a list of searchable titles (English, Romaji, Native)
func GetAnimeTitles(malId string) ([]string, error) {
	cacheMutex.RLock()
	if titles, ok := titleCache[malId]; ok {
		cacheMutex.RUnlock()
		return titles, nil
	}
	cacheMutex.RUnlock()

	var titles []string

	// 1. Try Jikan first for comprehensive titles
	url := fmt.Sprintf("https://api.jikan.moe/v4/anime/%s", malId)
	resp, err := utils.HttpClient.R().Get(url)
	if err == nil && resp.IsSuccess() {
		var data map[string]interface{}
		if err := json.Unmarshal(resp.Body(), &data); err == nil {

			if d, ok := data["data"].(map[string]interface{}); ok {
				if t, ok := d["title_english"].(string); ok && t != "" {
					titles = append(titles, t)
				}
				if t, ok := d["title"].(string); ok && t != "" {
					titles = append(titles, t)
				}
				if ts, ok := d["titles"].([]interface{}); ok {
					for _, item := range ts {
						if tObj, ok := item.(map[string]interface{}); ok {
							if t, ok := tObj["title"].(string); ok && t != "" {
								titles = append(titles, t)
							}
						}
					}
				}
			}
		}
	}

	// 2. Fallback to AniList if Jikan failed or provided zero titles
	if len(titles) == 0 {
		idInt, _ := strconv.Atoi(malId)
		query := `query($id: Int) { 
			Media(idMal: $id, type: ANIME) { title { romaji english native } } 
		}`
		data, err := utils.FetchAnilist(query, map[string]interface{}{"id": idInt})
		if err == nil {
			if media, ok := data["Media"].(map[string]interface{}); ok {
				if t, ok := media["title"].(map[string]interface{}); ok {
					if eng, ok := t["english"].(string); ok && eng != "" {
						titles = append(titles, eng)
					}
					if rom, ok := t["romaji"].(string); ok && rom != "" {
						titles = append(titles, rom)
					}
					if nat, ok := t["native"].(string); ok && nat != "" {
						titles = append(titles, nat)
					}
				}
			}
		}
	}

	if len(titles) > 0 {
		uniqueTitles := make([]string, 0)
		seen := make(map[string]bool)
		for _, t := range titles {
			t = strings.TrimSpace(t)
			if t != "" && !seen[strings.ToLower(t)] {
				seen[strings.ToLower(t)] = true
				uniqueTitles = append(uniqueTitles, t)
			}
		}
		
		cacheMutex.Lock()
		titleCache[malId] = uniqueTitles
		cacheMutex.Unlock()
		return uniqueTitles, nil
	}

	return nil, fmt.Errorf("no titles found for MAL ID %s", malId)
}

// ToKebab converts a string to kebab-case for slug patterns
func ToKebab(s string) string {
	s = strings.ToLower(s)
	// Replace non-alphanumeric with hyphen
	var res strings.Builder
	lastWasHyphen := false
	for _, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			res.WriteRune(r)
			lastWasHyphen = false
		} else if !lastWasHyphen {
			res.WriteRune('-')
			lastWasHyphen = true
		}
	}
	return strings.Trim(res.String(), "-")
}
