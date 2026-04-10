package providers

import (
	"fmt"
	"log"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
)

const ConsumetBase = "https://consumet-api.vercel.app"

type ConsumetEpisode struct {
	ID          string `json:"id"`
	Number      int    `json:"number"`
	Title       string `json:"title"`
	Image       string `json:"image"`
	Description string `json:"description"`
	AirDate     string `json:"airDate"`
}

type ConsumetInfo struct {
	ID       string            `json:"id"`
	Title    interface{}       `json:"title"`
	Episodes []ConsumetEpisode `json:"episodes"`
}

func GetConsumetMetadata(malId int) ([]utils.EpisodeMetadata, error) {
	anilistId, err := utils.GetAnilistId(malId)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve AniList ID: %w", err)
	}

	providers := []string{"gogoanime", "zoro", "enime"}
	var episodes []utils.EpisodeMetadata

	for _, provider := range providers {
		url := fmt.Sprintf("%s/meta/anilist/info/%d?fetchEpisodes=true&provider=%s", ConsumetBase, anilistId, provider)
		log.Printf("[Consumet] Fetching %s metadata for AniList %d", provider, anilistId)

		resp, err := utils.HttpClient.R().Get(url)
		if err != nil || !resp.IsSuccess() {
			continue
		}

		var info ConsumetInfo
		if err := utils.Unmarshal(resp.Body(), &info); err != nil {
			continue
		}

		if len(info.Episodes) > 0 {
			hasImages := false
			for _, ep := range info.Episodes {
				if ep.Image != "" {
					hasImages = true
					break
				}
			}

			// Map to standard metadata
			for _, ep := range info.Episodes {
				title := ep.Title
				if title == "" {
					title = fmt.Sprintf("Episode %d", ep.Number)
				}
				episodes = append(episodes, utils.EpisodeMetadata{
					ID:          ep.ID,
					Number:      ep.Number,
					Title:       title,
					Image:       ep.Image,
					Description: ep.Description,
				})
			}

			if hasImages {
				log.Printf("[Consumet] Success with thumbnails from %s", provider)
				break
			}
			log.Printf("[Consumet] %s returned no thumbnails, trying next...", provider)
			episodes = nil // Reset and try next provider for better thumbnails
		}
	}

	return episodes, nil
}

func GetAniListStreamingEpisodes(anilistId int) ([]map[string]interface{}, error) {
	query := `
		query($id: Int) {
			Media(id: $id, type: ANIME) {
				streamingEpisodes {
					title
					thumbnail
					url
					site
				}
			}
		}
	`
	vars := map[string]interface{}{"id": anilistId}
	data, err := utils.FetchAnilist(query, vars)
	if err != nil {
		return nil, err
	}

	media, ok := data["Media"].(map[string]interface{})
	if !ok || media == nil {
		return nil, fmt.Errorf("media not found")
	}

	streaming, ok := media["streamingEpisodes"].([]interface{})
	if !ok {
		return nil, nil
	}

	res := make([]map[string]interface{}, 0)
	for _, s := range streaming {
		if m, ok := s.(map[string]interface{}); ok {
			res = append(res, m)
		}
	}

	return res, nil
}
