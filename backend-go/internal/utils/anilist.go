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

