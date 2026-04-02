package providers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strings"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
	"github.com/PuerkitoBio/goquery"
)

const AHDBase = "https://animehindidubbed.in/wp-json/wp/v2"
const AHDStaging = "https://animehindidubbed.in"

// WP-specific headers to mimic browser
var ahdHeaders = map[string]string{
	"User-Agent":         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	"Accept":             "application/json, text/plain, */*",
	"Accept-Language":    "en-US,en;q=0.9",
	"Cache-Control":      "no-cache",
	"Sec-Ch-Ua":          `"Chromium";"v="125", "Not.A/Brand";"v="24"`,
	"Sec-Ch-Ua-Mobile":   "?0",
	"Sec-Ch-Ua-Platform": `"Windows"`,
	"Sec-Fetch-Dest":     "empty",
	"Sec-Fetch-Mode":     "cors",
	"Sec-Fetch-Site":     "same-origin",
}

func SearchAHD(query string) []map[string]interface{} {
	searchUrl := fmt.Sprintf("%s/posts?search=%s&per_page=10", AHDBase, url.QueryEscape(query))
	log.Printf("[AHD] Searching: %s", searchUrl)

	resp, err := utils.HttpClient.R().SetHeaders(ahdHeaders).Get(searchUrl)
	if err != nil || !resp.IsSuccess() {
		log.Printf("[AHD] Search failed: %v", err)
		return []map[string]interface{}{}
	}

	var posts []map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &posts); err != nil {
		log.Printf("[AHD] JSON parse error: %v", err)
		return []map[string]interface{}{}
	}

	log.Printf("[AHD] Found %d results", len(posts))

	results := []map[string]interface{}{}
	for _, post := range posts {
		titleObj, _ := post["title"].(map[string]interface{})
		title := utils.ToString(titleObj["rendered"])
		link := utils.ToString(post["link"])
		slug := utils.ToString(post["slug"])
		id := fmt.Sprintf("%v", post["id"])

		_ = link // slug from WP API is more reliable

		contentObj, _ := post["content"].(map[string]interface{})
		content := utils.ToString(contentObj["rendered"])
		doc, _ := goquery.NewDocumentFromReader(strings.NewReader(content))
		image := doc.Find("img").First().AttrOr("src", "")

		if title != "" && id != "" {
			results = append(results, map[string]interface{}{
				"id":    id,
				"title": title,
				"slug":  slug,
				"image": image,
			})
		}
	}

	return results
}

// cleanJSObject converts a JavaScript object literal to valid JSON
// Handles: unquoted keys, single quotes, trailing commas, comments
func cleanJSObject(jsObj string) string {
	res := jsObj

	// Remove single-line comments
	res = regexp.MustCompile(`//.*$`).ReplaceAllString(res, "")

	// Remove multi-line comments
	res = regexp.MustCompile(`/\*[\s\S]*?\*/`).ReplaceAllString(res, "")

	// Convert single quotes to double quotes (careful approach)
	// First protect already double-quoted strings, then replace singles
	res = strings.ReplaceAll(res, "'", "\"")

	// Quote unquoted keys: match {key: or ,key: patterns
	res = regexp.MustCompile(`([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:`).ReplaceAllString(res, `$1"$2":`)

	// Remove trailing commas before } or ]
	res = regexp.MustCompile(`,(\s*[}\]])`).ReplaceAllString(res, "$1")

	return res
}

// extractServerVideosFromHTML extracts the serverVideos JS object from rendered HTML content
func extractServerVideosFromHTML(htmlContent string) map[string][]map[string]interface{} {
	// Try multiple regex patterns for the serverVideos object
	patterns := []string{
		`(?s)const\s+serverVideos\s*=\s*(\{[\s\S]*?\})\s*;`,
		`(?s)var\s+serverVideos\s*=\s*(\{[\s\S]*?\})\s*;`,
		`(?s)let\s+serverVideos\s*=\s*(\{[\s\S]*?\})\s*;`,
		`(?s)serverVideos\s*=\s*(\{[\s\S]*?\})\s*;`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		match := re.FindStringSubmatch(htmlContent)
		if len(match) > 1 {
			jsObj := match[1]
			log.Printf("[AHD] Found serverVideos, length: %d", len(jsObj))

			// Clean the JS object to make it valid JSON
			cleaned := cleanJSObject(jsObj)

			var videoData map[string][]map[string]interface{}
			if err := json.Unmarshal([]byte(cleaned), &videoData); err != nil {
				log.Printf("[AHD] JSON parse attempt 1 failed: %v", err)

				// Try a more aggressive cleaning - extract key-value pairs manually
				videoData = extractServerVideosManual(jsObj)
				if videoData != nil {
					return videoData
				}

				log.Printf("[AHD] All parse attempts failed for serverVideos")
				continue
			}

			log.Printf("[AHD] Successfully parsed serverVideos, servers: %v", getKeys(videoData))
			return videoData
		}
	}

	return nil
}

// extractServerVideosManual manually parses the JS object when JSON parsing fails
func extractServerVideosManual(jsObj string) map[string][]map[string]interface{} {
	result := map[string][]map[string]interface{}{}

	// Find server blocks: "serverName": [{...}, {...}]
	// Pattern: key followed by array of objects
	serverPattern := regexp.MustCompile(`["']?(\w+)["']?\s*:\s*\[`)
	matches := serverPattern.FindAllStringSubmatchIndex(jsObj, -1)

	for _, match := range matches {
		if len(match) < 4 {
			continue
		}
		serverName := jsObj[match[2]:match[3]]
		arrayStart := match[1] - 1 // position of [

		// Find the matching ]
		depth := 0
		arrayEnd := -1
		for i := arrayStart; i < len(jsObj); i++ {
			if jsObj[i] == '[' {
				depth++
			} else if jsObj[i] == ']' {
				depth--
				if depth == 0 {
					arrayEnd = i + 1
					break
				}
			}
		}

		if arrayEnd == -1 {
			continue
		}

		arrayStr := jsObj[arrayStart:arrayEnd]

		// Extract individual objects from array
		objPattern := regexp.MustCompile(`\{\s*(?:name|"name"|'name')\s*:\s*["']([^"']+)["']\s*,\s*(?:url|"url"|'url')\s*:\s*["']([^"']+)["']\s*\}`)
		objMatches := objPattern.FindAllStringSubmatch(arrayStr, -1)

		episodes := []map[string]interface{}{}
		for _, om := range objMatches {
			if len(om) > 2 {
				episodes = append(episodes, map[string]interface{}{
					"name": om[1],
					"url":  om[2],
				})
			}
		}

		// Also try url first, name second
		if len(episodes) == 0 {
			objPattern2 := regexp.MustCompile(`\{\s*(?:url|"url"|'url')\s*:\s*["']([^"']+)["']\s*,\s*(?:name|"name"|'name')\s*:\s*["']([^"']+)["']\s*\}`)
			objMatches2 := objPattern2.FindAllStringSubmatch(arrayStr, -1)
			for _, om := range objMatches2 {
				if len(om) > 2 {
					episodes = append(episodes, map[string]interface{}{
						"url":  om[1],
						"name": om[2],
					})
				}
			}
		}

		if len(episodes) > 0 {
			result[serverName] = episodes
			log.Printf("[AHD] Manual parse: server '%s' has %d episodes", serverName, len(episodes))
		}
	}

	if len(result) > 0 {
		return result
	}
	return nil
}

func getKeys(m map[string][]map[string]interface{}) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}

func GetAHDInfo(id string) map[string]interface{} {
	infoUrl := fmt.Sprintf("%s/posts/%s", AHDBase, id)
	log.Printf("[AHD] Getting info for post ID: %s", id)

	resp, err := utils.HttpClient.R().SetHeaders(ahdHeaders).Get(infoUrl)
	if err != nil || !resp.IsSuccess() {
		log.Printf("[AHD] Failed to get post: %v", err)
		return nil
	}

	var data map[string]interface{}
	if err := json.Unmarshal(resp.Body(), &data); err != nil {
		return nil
	}

	titleObj, _ := data["title"].(map[string]interface{})
	title := utils.ToString(titleObj["rendered"])
	log.Printf("[AHD] Post title: %s", title)

	contentObj, _ := data["content"].(map[string]interface{})
	content := utils.ToString(contentObj["rendered"])
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(content))

	synopsis := strings.TrimSpace(doc.Find("p").First().Text())
	image := doc.Find("img").First().AttrOr("src", "")

	// Extract serverVideos from script tags in the content
	serverVideos := extractServerVideosFromHTML(content)

	if serverVideos == nil {
		log.Printf("[AHD] No serverVideos found in content.rendered")
		return nil
	}

	// Flatten all episodes from all servers (keeping server info)
	episodes := []map[string]interface{}{}
	for server, eps := range serverVideos {
		log.Printf("[AHD] Server '%s' has %d episodes", server, len(eps))
		for _, ep := range eps {
			episodes = append(episodes, map[string]interface{}{
				"name":   utils.ToString(ep["name"]),
				"url":    utils.ToString(ep["url"]),
				"server": server,
			})
		}
	}

	log.Printf("[AHD] Total episodes: %d", len(episodes))

	return map[string]interface{}{
		"id":       id,
		"title":    title,
		"synopsis": synopsis,
		"image":    image,
		"link":     utils.ToString(data["link"]),
		"episodes": episodes,
		"servers":  getKeys(serverVideos),
	}
}

// GetAHDSources finds all sources for a specific episode number across all servers
func GetAHDSources(id string, episodeName string) []map[string]interface{} {
	log.Printf("[AHD] Getting sources for post ID: %s, episode: %s", id, episodeName)

	info := GetAHDInfo(id)
	if info == nil {
		log.Printf("[AHD] No info found for post")
		return []map[string]interface{}{}
	}

	rawEps, _ := info["episodes"].([]map[string]interface{})
	sources := []map[string]interface{}{}

	// Pre-compute padded episode number
	epNumPadded := episodeName
	if len(episodeName) == 1 {
		epNumPadded = "0" + episodeName
	}

	for _, ep := range rawEps {
		name := strings.ToLower(utils.ToString(ep["name"]))

		// Flexible episode matching (mirrors the Node.js implementation)
		isMatch := false

		// Pattern 1: "episode N" or "episode NN"
		if strings.Contains(name, "episode "+episodeName) || strings.Contains(name, "episode "+epNumPadded) {
			isMatch = true
		}
		// Pattern 2: "ep N" or "ep NN"
		if !isMatch && (strings.Contains(name, "ep "+episodeName) || strings.Contains(name, "ep "+epNumPadded)) {
			isMatch = true
		}
		// Pattern 3: "eN" or "eNN" (like "e1" or "e01")
		if !isMatch {
			re := regexp.MustCompile(`(?:^|[^0-9])e(\d+)(?:[^0-9]|$)`)
			if m := re.FindStringSubmatch(name); len(m) > 1 {
				isMatch = m[1] == episodeName || m[1] == epNumPadded
			}
		}
		// Pattern 4: "s1eN" or "s01eN" or "s1e0N" or "s01e0N"
		if !isMatch {
			re := regexp.MustCompile(`s\d+e(\d+)`)
			if m := re.FindStringSubmatch(name); len(m) > 1 {
				isMatch = m[1] == episodeName || m[1] == epNumPadded
			}
		}
		// Pattern 5: Exact regex extraction (strict "episode X" / "ep X")
		if !isMatch {
			re := regexp.MustCompile(`(?:episode|ep)\s*(\d+)`)
			if m := re.FindStringSubmatch(name); len(m) > 1 {
				isMatch = m[1] == episodeName
			}
		}
		// Pattern 6: Number in name like "- 006 -" (common in filenames)
		if !isMatch {
			re := regexp.MustCompile(`[-_\s]0*(\d+)[-_\s]`)
			if m := re.FindStringSubmatch(name); len(m) > 1 {
				isMatch = m[1] == episodeName
			}
		}

		if isMatch {
			server := utils.ToString(ep["server"])
			epUrl := utils.ToString(ep["url"])

			// Skip listeamed.net (unreliable)
			if strings.Contains(epUrl, "listeamed.net") {
				continue
			}

			// Determine language based on server
			language := "hindi"
			quality := "720p"

			serverLower := strings.ToLower(server)
			if serverLower == "bysewihe" {
				language = "multi"
				quality = "1080p"
			} else if serverLower == "servabyss" || serverLower == "vidgroud" {
				language = "multi"
			}

			// Check name for "multi" keyword
			if strings.Contains(name, "multi") {
				language = "multi"
			}

			// Determine display server name
			displayServer := serverLower
			switch serverLower {
			case "bysewihe":
				displayServer = "filemoon"
			case "servabyss":
				displayServer = "abyss"
			case "vidgroud":
				displayServer = "vidground"
			case "streamtape":
				displayServer = "streamtape"
			case "mixdrop":
				displayServer = "mixdrop"
			case "dood":
				displayServer = "doodstream"
			}

			isM3U8 := strings.Contains(strings.ToLower(epUrl), ".m3u8") || strings.Contains(strings.ToLower(epUrl), ".mp4")
			isEmbed := !isM3U8

			sources = append(sources, map[string]interface{}{
				"url":      epUrl,
				"name":     displayServer,
				"type":     "iframe",
				"isM3U8":   isM3U8,
				"isEmbed":  isEmbed,
				"quality":  quality,
				"server":   displayServer,
				"provider": "AnimeHindiDubbed-WP",
				"language": language,
			})
		}
	}

	log.Printf("[AHD] Found %d sources for episode %s", len(sources), episodeName)
	return sources
}
