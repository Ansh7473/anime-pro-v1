package utils

import (
	"encoding/json"
	"fmt"
)

func FetchAnilist(query string, variables map[string]interface{}) (map[string]interface{}, error) {
	body := map[string]interface{}{
		"query": query,
	}
	if variables != nil {
		body["variables"] = variables
	}

	resp, err := HttpClient.R().
		SetHeader("Content-Type", "application/json").
		SetHeader("Accept", "application/json").
		SetBody(body).
		Post("https://graphql.anilist.co")

	if err != nil {
		return nil, fmt.Errorf("network error: %w", err)
	}

	var jsonResult map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &jsonResult); err != nil {
		return nil, fmt.Errorf("json parse error: %w", err)
	}

	// AniList returns data and potentially errors. We return data if present.
	data, hasData := jsonResult["data"].(map[string]interface{})
	if !hasData {
		errs, hasErrs := jsonResult["errors"].([]interface{})
		if hasErrs && len(errs) > 0 {
			if eMap, ok := errs[0].(map[string]interface{}); ok {
				return nil, fmt.Errorf("AniList GraphQL error: %v", eMap["message"])
			}
		}
		return nil, fmt.Errorf("no data returned from AniList")
	}

	return data, nil
}

// GetAnilistId resolves a MAL ID to an AniList ID for cross-provider lookups
func GetAnilistId(malId int) (int, error) {
	query := `query($id: Int) { Media(idMal: $id, type: ANIME) { id } }`
	vars := map[string]interface{}{"id": malId}
	data, err := FetchAnilist(query, vars)
	if err != nil {
		return 0, err
	}
	
	media, ok := data["Media"].(map[string]interface{})
	if !ok || media == nil {
		return 0, fmt.Errorf("id not found in AniList")
	}
	
	idFloat, ok := media["id"].(float64)
	if !ok {
		return 0, fmt.Errorf("unexpected id format")
	}
	
	return int(idFloat), nil
}
// GetMultipleMediaMetadata fetches metadata (genres, description, format) for multiple anime IDs
func GetMultipleMediaMetadata(ids []int) (map[int]map[string]interface{}, error) {
	if len(ids) == 0 {
		return nil, nil
	}

	query := `query($ids: [Int]) {
		Page {
			media(id_in: $ids, type: ANIME) {
				id
				idMal
				title { english romaji }
				genres
				description
				format
				bannerImage
				coverImage { large }
			}
		}
	}`
	vars := map[string]interface{}{"ids": ids}
	data, err := FetchAnilist(query, vars)
	if err != nil {
		return nil, err
	}

	page, ok := data["Page"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid response structure")
	}

	mediaList, ok := page["media"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("media list not found")
	}

	result := make(map[int]map[string]interface{})
	for _, m := range mediaList {
		media := m.(map[string]interface{})
		idMal := int(media["idMal"].(float64))
		if idMal == 0 {
			idMal = int(media["id"].(float64))
		}
		result[idMal] = media
	}

	return result, nil
}
// GetAniListRecommendations fetches official recommendations for a specific anime ID
func GetAniListRecommendations(id int) ([]map[string]interface{}, error) {
	query := `query($id: Int) {
		Media(id: $id) {
			recommendations(sort: RATING_DESC, limit: 10) {
				nodes {
					mediaRecommendation {
						id
						idMal
						title { english romaji }
						genres
						coverImage { large }
						description
					}
				}
			}
		}
	}`
	vars := map[string]interface{}{"id": id}
	data, err := FetchAnilist(query, vars)
	if err != nil {
		return nil, err
	}

	media, ok := data["Media"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("media not found")
	}

	recs, ok := media["recommendations"].(map[string]interface{})
	if !ok {
		return nil, nil
	}

	nodes, ok := recs["nodes"].([]interface{})
	if !ok {
		return nil, nil
	}

	var results []map[string]interface{}
	for _, n := range nodes {
		node := n.(map[string]interface{})
		if recMedia, ok := node["mediaRecommendation"].(map[string]interface{}); ok {
			results = append(results, recMedia)
		}
	}

	return results, nil
}

// GetPopularByGenre fetches trending anime for a specific genre, excluding watched IDs
func GetPopularByGenre(genre string, excludedIDs []int) ([]map[string]interface{}, error) {
	query := `query($genre: String, $excluded: [Int]) {
		Page(page: 1, perPage: 10) {
			media(genre: $genre, type: ANIME, sort: TRENDING_DESC, id_not_in: $excluded) {
				id
				idMal
				title { english romaji }
				genres
				coverImage { large }
				description
			}
		}
	}`
	vars := map[string]interface{}{"genre": genre, "excluded": excludedIDs}
	data, err := FetchAnilist(query, vars)
	if err != nil {
		return nil, err
	}

	page, ok := data["Page"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid response structure")
	}

	mediaList, ok := page["media"].([]interface{})
	if !ok {
		return nil, nil
	}

	var results []map[string]interface{}
	for _, m := range mediaList {
		results = append(results, m.(map[string]interface{}))
	}

	return results, nil
}
