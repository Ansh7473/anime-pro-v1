package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
	"github.com/gin-gonic/gin"
)

func transformMedia(anime map[string]interface{}) map[string]interface{} {
	if anime == nil {
		return nil
	}

	idMal := anime["idMal"]
	id := anime["id"]
	finalID := idMal
	if finalID == nil {
		finalID = id
	}

	cover, _ := anime["coverImage"].(map[string]interface{})
	title, _ := anime["title"].(map[string]interface{})

	genres := []string{}
	if g, ok := anime["genres"].([]interface{}); ok {
		for _, v := range g {
			genres = append(genres, utils.ToString(v))
		}
	}

	studios := []string{}
	if s, ok := anime["studios"].(map[string]interface{}); ok {
		if nodes, ok := s["nodes"].([]interface{}); ok {
			for _, n := range nodes {
				if node, ok := n.(map[string]interface{}); ok {
					studios = append(studios, utils.ToString(node["name"]))
				}
			}
		}
	}

	trailer := map[string]interface{}{}
	if t, ok := anime["trailer"].(map[string]interface{}); ok {
		trailer["youtube_id"] = utils.ToString(t["id"])
		trailer["url"] = "https://www.youtube.com/watch?v=" + utils.ToString(t["id"])
	}

	return map[string]interface{}{
		"id":             finalID,
		"mal_id":         finalID,
		"anilist_id":     id,
		"title":          utils.ToString(title["romaji"]),
		"title_english":  utils.ToString(title["english"]),
		"title_japanese": utils.ToString(title["native"]),
		"poster":         utils.ToString(cover["large"]),
		"image":          utils.ToString(cover["extraLarge"]),
		"synopsis":       utils.ToString(anime["description"]),
		"type":           anime["format"],
		"episodes":       anime["episodes"],
		"status":         anime["status"],
		"score":          anime["averageScore"],
		"rating":         anime["averageScore"],
		"year":           anime["seasonYear"],
		"season":         strings.ToLower(utils.ToString(anime["season"])),
		"genres":         genres,
		"duration":       anime["duration"],
		"popularity":     anime["popularity"],
		"studios":        studios,
		"trailer":        trailer,
		"bannerImage":    anime["bannerImage"],
	}
}

// AnilistHome reproduces the AniList GraphQL query fetching top trending, popular, etc.
func AnilistHome(c *gin.Context) {
	query := `
		query {
			trending: Page(page: 1, perPage: 15) {
				media(type: ANIME, sort: [TRENDING_DESC], status: RELEASING) {
					...mediaFields
				}
			}
			popular: Page(page: 1, perPage: 15) {
				media(type: ANIME, sort: [POPULARITY_DESC]) {
					...mediaFields
				}
			}
			topRated: Page(page: 1, perPage: 15) {
				media(type: ANIME, sort: [SCORE_DESC], format_in: [TV, MOVIE]) {
					...mediaFields
				}
			}
			action: Page(page: 1, perPage: 15) {
				media(type: ANIME, genre_in: ["Action"], sort: [POPULARITY_DESC]) {
					...mediaFields
				}
			}
			romance: Page(page: 1, perPage: 15) {
				media(type: ANIME, genre_in: ["Romance", "Slice of Life"], sort: [POPULARITY_DESC]) {
					...mediaFields
				}
			}
			movies: Page(page: 1, perPage: 15) {
				media(type: ANIME, format: MOVIE, sort: [POPULARITY_DESC]) {
					...mediaFields
				}
			}
		}

		fragment mediaFields on Media {
			id
			idMal
			title { romaji english native }
			coverImage { extraLarge large }
			description
			format
			status
			episodes
			averageScore
			seasonYear
			season
			genres
			popularity
			nextAiringEpisode { episode airingAt timeUntilAiring }
		}
	`

	data, err := utils.FetchAnilist(query, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch from AniList", "message": err.Error()})
		return
	}

	// Transform raw AniList response into flattened categories with mapped fields
	res := make(map[string]interface{})
	for key, val := range data {
		page, ok := val.(map[string]interface{})
		if !ok { continue }
		mediaList, ok := page["media"].([]interface{})
		if !ok { continue }

		transformedMedia := make([]map[string]interface{}, 0)
		for _, m := range mediaList {
			anime, ok := m.(map[string]interface{})
			if !ok { continue }

			transformedMedia = append(transformedMedia, transformMedia(anime))
		}
		res[key] = transformedMedia
	}

	c.JSON(http.StatusOK, gin.H{"data": res})
}



func AnilistAnime(c *gin.Context) {
	idStr := c.Param("id")
	id, _ := strconv.Atoi(idStr)

	query := `
		query($id: Int) {
			Media(idMal: $id, type: ANIME) {
				...mediaFields
			}
			Fallback: Media(id: $id, type: ANIME) {
				...mediaFields
			}
		}
		
		fragment mediaFields on Media {
			id
			idMal
			title { romaji english native }
			coverImage { extraLarge large }
			bannerImage
			description
			format
			status
			episodes
			duration
			averageScore
			seasonYear
			season
			genres
			studios(isMain: true) { nodes { name } }
			trailer { id site thumbnail }
			nextAiringEpisode { episode airingAt timeUntilAiring }
			isAdult
			streamingEpisodes { title thumbnail url site }
			relations {
				edges {
					relationType(version: 2)
					node {
						id
						idMal
						title { romaji english native }
						format
						type
						status
						coverImage { large }
					}
				}
			}
		}
	`

	data, err := utils.FetchAnilist(query, map[string]interface{}{"id": id})
	if err == nil && data != nil {
		media, ok := data["Media"].(map[string]interface{})
		if !ok || media == nil {
			media, _ = data["Fallback"].(map[string]interface{})
		}

		if media != nil {
			transformed := transformMedia(media)

			// Process relations
			relations := []map[string]interface{}{}
			if relObj, ok := media["relations"].(map[string]interface{}); ok {
				if edges, ok := relObj["edges"].([]interface{}); ok {
					for _, e := range edges {
						if edge, ok := e.(map[string]interface{}); ok {
							node, _ := edge["node"].(map[string]interface{})
							if node != nil {
								nodeTitle, _ := node["title"].(map[string]interface{})
								relations = append(relations, map[string]interface{}{
									"relation": edge["relationType"],
									"entry": []map[string]interface{}{{
										"mal_id": func() interface{} { if node["idMal"] != nil { return node["idMal"] }; return node["id"] }(),
										"name":   utils.ToString(nodeTitle["romaji"]),
										"type":   node["type"],
									}},
								})
							}
						}
					}
				}
			}
			transformed["relations"] = relations
			c.JSON(http.StatusOK, gin.H{"data": transformed})
			return
		}
	}

	// Jikan Fallback
	log.Printf("[Anilist Handler] ID %d not found in AniList, trying Jikan fallback", id)
	jikanUrl := fmt.Sprintf("https://api.jikan.moe/v4/anime/%d/full", id)
	jresp, jerr := utils.FetchWithRetries(jikanUrl, 2, 500)
	if jerr == nil && jresp.StatusCode() == http.StatusOK {
		var jdata map[string]interface{}
		if err := json.Unmarshal(jresp.Body(), &jdata); err == nil {
			if anime, ok := jdata["data"].(map[string]interface{}); ok {
				// Basic Jikan to flattened mapping
				title := utils.ToString(anime["title"])
				if tEng := utils.ToString(anime["title_english"]); tEng != "" {
					title = tEng
				}

				images, _ := anime["images"].(map[string]interface{})
				jpg, _ := images["jpg"].(map[string]interface{})

				c.JSON(http.StatusOK, gin.H{"data": map[string]interface{}{
					"id":        id,
					"mal_id":    id,
					"title":     title,
					"synopsis":  utils.ToString(anime["synopsis"]),
					"poster":    utils.ToString(jpg["large_image_url"]),
					"image":     utils.ToString(jpg["image_url"]),
					"status":    utils.ToString(anime["status"]),
					"episodes":  anime["episodes"],
					"type":      utils.ToString(anime["type"]),
					"score":     anime["score"],
					"genres":    anime["genres"],
					"relations": anime["relations"],
				}})
				return
			}
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Anime not found in AniList or Jikan"})
}

func AnilistCharacters(c *gin.Context) {
	id := c.Param("id")
	url := fmt.Sprintf("https://api.jikan.moe/v4/anime/%s/characters", id)
	resp, err := utils.FetchWithRetries(url, 2, 500)
	if err != nil || resp.StatusCode() != http.StatusOK {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	var data map[string]interface{}
	json.Unmarshal(resp.Body(), &data)
	chars, _ := data["data"].([]interface{})
	
	transformed := []map[string]interface{}{}
	for _, ch := range chars {
		cMap, ok := ch.(map[string]interface{})
		if !ok { continue }
		charNode, _ := cMap["character"].(map[string]interface{})
		images, _ := charNode["images"].(map[string]interface{})
		jpg, _ := images["jpg"].(map[string]interface{})

		transformed = append(transformed, map[string]interface{}{
			"role": cMap["role"],
			"character": map[string]interface{}{
				"mal_id": charNode["mal_id"],
				"name": charNode["name"],
				"images": map[string]interface{}{
					"jpg": map[string]interface{}{
						"image_url": jpg["image_url"],
					},
				},
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": transformed})
}

func AnilistRecommendations(c *gin.Context) {
	id := c.Param("id")
	url := fmt.Sprintf("https://api.jikan.moe/v4/anime/%s/recommendations", id)
	resp, err := utils.FetchWithRetries(url, 2, 500)
	if err != nil || resp.StatusCode() != http.StatusOK {
		c.JSON(http.StatusOK, gin.H{"data": []interface{}{}})
		return
	}

	var data map[string]interface{}
	json.Unmarshal(resp.Body(), &data)
	recs, _ := data["data"].([]interface{})

	transformed := []map[string]interface{}{}
	for _, r := range recs {
		rMap, ok := r.(map[string]interface{})
		if !ok { continue }
		node, _ := rMap["entry"].(map[string]interface{})
		images, _ := node["images"].(map[string]interface{})
		jpg, _ := images["jpg"].(map[string]interface{})

		transformed = append(transformed, map[string]interface{}{
			"id": node["mal_id"],
			"mal_id": node["mal_id"],
			"title": node["title"],
			"poster": jpg["large_image_url"],
			"image": jpg["image_url"],
		})
	}

	c.JSON(http.StatusOK, gin.H{"data": transformed})
}

func AnilistSearch(c *gin.Context) {
	q := c.Query("q")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	query := `
		query (
			$page: Int = 1
			$perPage: Int = 20
			$search: String
			$sort: [MediaSort] = [POPULARITY_DESC, SCORE_DESC]
			$format: MediaFormat
			$status: MediaStatus
			$genre: String
			$season: MediaSeason
			$seasonYear: Int
		) {
			Page(page: $page, perPage: $perPage) {
				pageInfo {
					hasNextPage
					total
					currentPage
				}
				media(
					type: ANIME
					search: $search
					sort: $sort
					format: $format
					status: $status
					genre: $genre
					season: $season
					seasonYear: $seasonYear
					isAdult: false
				) {
					id
					idMal
					title { romaji english native }
					coverImage { extraLarge large }
					description
					format
					status
					episodes
					averageScore
					seasonYear
					season
					genres
				}
			}
		}
	`

	variables := map[string]interface{}{
		"page": page,
		"perPage": limit,
	}
	if q != "" {
		variables["search"] = q
	}
	if sortP := c.Query("sort"); sortP != "" {
		variables["sort"] = []string{sortP}
	}
	if formatParam := c.Query("format"); formatParam != "" {
		variables["format"] = formatParam
	}
	if statusParam := c.Query("status"); statusParam != "" {
		variables["status"] = statusParam
	}
	if genreParam := c.Query("genre"); genreParam != "" {
		variables["genre"] = genreParam
	}
	if seasonParam := c.Query("season"); seasonParam != "" {
		variables["season"] = strings.ToUpper(seasonParam)
	}
	if seasonYearParam := c.Query("seasonYear"); seasonYearParam != "" {
		year, _ := strconv.Atoi(seasonYearParam)
		if year > 0 { variables["seasonYear"] = year }
	}

	data, err := utils.FetchAnilist(query, variables)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search AniList", "message": err.Error()})
		return
	}

	// Transform raw search results
	rawPage, ok := data["Page"].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusOK, gin.H{"data": data})
		return
	}

	mediaList, ok := rawPage["media"].([]interface{})
	if !ok {
		c.JSON(http.StatusOK, gin.H{"data": data})
		return
	}

	transformedMedia := make([]map[string]interface{}, 0)
	for _, m := range mediaList {
		anime, ok := m.(map[string]interface{})
		if !ok { continue }

		transformedMedia = append(transformedMedia, transformMedia(anime))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": transformedMedia,
		"pagination": map[string]interface{}{
			"has_next_page": rawPage["pageInfo"].(map[string]interface{})["hasNextPage"],
		},
	})
}


