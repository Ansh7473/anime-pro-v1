package providers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"

	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
	"github.com/PuerkitoBio/goquery"
)

const DesiDubBase = "https://www.desidubanime.me"
const DesiDubStaging = "https://www.desidubanime.me"

func decodeB64(str string) string {
	decoded, err := base64.StdEncoding.DecodeString(str)
	if err != nil {
		decoded, err = base64.RawStdEncoding.DecodeString(str)
		if err != nil {
			return ""
		}
	}
	return string(decoded)
}

// generateDesiDubSlugCandidates generates likely slug patterns from a query
func generateDesiDubSlugCandidates(query string) []string {
	words := strings.Fields(strings.ToLower(strings.TrimSpace(query)))
	if len(words) == 0 {
		return nil
	}

	candidates := []string{}
	base := strings.Join(words, "-")

	// Clean special characters
	re := regexp.MustCompile(`[^a-z0-9-]`)
	base = re.ReplaceAllString(base, "")
	base = regexp.MustCompile(`-{2,}`).ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")

	candidates = append(candidates, base)
	candidates = append(candidates, base+"-season-1")
	candidates = append(candidates, base+"-dub")
	candidates = append(candidates, base+"-hindi")
	candidates = append(candidates, base+"-hindi-dubbed")
	candidates = append(candidates, base+"-punjabi-dubbed")
	candidates = append(candidates, base+"-multi")
	candidates = append(candidates, base+"-all-episodes")

	if len(words) > 1 {
		// e.g. "One Piece" -> "one-piece"
		candidates = append(candidates, strings.Join(words, "-"))
		// e.g. "One Piece Red" -> "one-piece-red"
	}
	
	if len(words) > 2 {
		candidates = append(candidates, strings.Join(words[:len(words)-1], "-"))
		candidates = append(candidates, strings.Join(words[:2], "-"))
	}

	// Deduplicate and clean
	seen := map[string]bool{}
	unique := []string{}
	for _, c := range candidates {
		c = re.ReplaceAllString(c, "")
		c = regexp.MustCompile(`-{2,}`).ReplaceAllString(c, "-")
		c = strings.Trim(c, "-")
		if !seen[c] && c != "" {
			seen[c] = true
			unique = append(unique, c)
		}
	}
	return unique
}

var (
	desiSearchCache = make(map[string][]map[string]interface{})
	desiSearchMutex sync.RWMutex
)

// SearchDesiDub finds anime on DesiDub dynamically using slug patterns and search fallback
func SearchDesiDub(query string) []map[string]interface{} {
	normalizedQuery := strings.ToLower(strings.TrimSpace(query))
	log.Printf("[DesiDub] Searching for: %s", normalizedQuery)

	desiSearchMutex.RLock()
	if cached, ok := desiSearchCache[normalizedQuery]; ok {
		desiSearchMutex.RUnlock()
		return cached
	}
	desiSearchMutex.RUnlock()

	// 1. Try generated slug candidates directly (most reliable approach)
	slugCandidates := generateDesiDubSlugCandidates(normalizedQuery)
	log.Printf("[DesiDub] Trying slug candidates: %v", slugCandidates)

	for _, slug := range slugCandidates {
		pageUrl := fmt.Sprintf("%s/anime/%s/", DesiDubBase, slug)
		resp, err := utils.HttpClient.R().Get(pageUrl)
		if err == nil && resp.IsSuccess() {
			doc, _ := goquery.NewDocumentFromReader(strings.NewReader(string(resp.Body())))
			title := strings.TrimSpace(doc.Find(".data h1, h1, .title").First().Text())
			if title != "" {
				firstWord := strings.Split(normalizedQuery, " ")[0]
				if strings.Contains(strings.ToLower(title), firstWord) {
					image := doc.Find(".poster img, img").First().AttrOr("src", "")
					log.Printf("[DesiDub] Found anime via slug: %s -> %s", slug, title)
					results := []map[string]interface{}{
						{"title": title, "slug": slug, "image": image},
					}
					desiSearchMutex.Lock()
					desiSearchCache[normalizedQuery] = results
					desiSearchMutex.Unlock()
					return results
				}
			}
		}
	}

	// 2. Try /search/ page
	searchUrl := fmt.Sprintf("%s/search/%s/", DesiDubBase, url.PathEscape(query))
	log.Printf("[DesiDub] Trying search URL: %s", searchUrl)
	resp, err := utils.HttpClient.R().Get(searchUrl)
	if err == nil && resp.IsSuccess() {
		results := parseAnimeLinks(string(resp.Body()), normalizedQuery)
		if len(results) > 0 {
			desiSearchMutex.Lock()
			desiSearchCache[normalizedQuery] = results
			desiSearchMutex.Unlock()
			return results
		}
	}

	// 3. Last resort: /?s= search
	oldSearchUrl := fmt.Sprintf("%s/?s=%s", DesiDubBase, url.QueryEscape(query))
	log.Printf("[DesiDub] Trying old search: %s", oldSearchUrl)
	resp, err = utils.HttpClient.R().Get(oldSearchUrl)
	if err == nil && resp.IsSuccess() {
		results := parseAnimeLinks(string(resp.Body()), normalizedQuery)
		if len(results) > 0 {
			desiSearchMutex.Lock()
			desiSearchCache[normalizedQuery] = results
			desiSearchMutex.Unlock()
			return results
		}
	}

	log.Printf("[DesiDub] No results found for: %s", query)
	results := []map[string]interface{}{}
	
	desiSearchMutex.Lock()
	desiSearchCache[normalizedQuery] = results
	desiSearchMutex.Unlock()
	return results
}

// parseAnimeLinks extracts anime links from HTML
func parseAnimeLinks(html, normalizedQuery string) []map[string]interface{} {
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(html))
	results := []map[string]interface{}{}

	doc.Find(`a[href*="/anime/"]`).Each(func(i int, s *goquery.Selection) {
		href, _ := s.Attr("href")
		text := strings.TrimSpace(s.Text())
		parts := strings.Split(href, "/anime/")
		if len(parts) > 1 {
			slug := strings.Split(parts[1], "/")[0]
			slug = strings.TrimRight(slug, "/")
			if slug != "" && text != "" && len(text) > 3 {
				isDup := false
				for _, r := range results {
					if utils.ToString(r["slug"]) == slug {
						isDup = true
						break
					}
				}
				if !isDup {
					results = append(results, map[string]interface{}{
						"title": text, "slug": slug, "image": nil,
					})
				}
			}
		}
	})

	if len(results) > 5 {
		results = results[:5]
	}
	return results
}

// GetDesiDubSourcesDirect tries to get sources by guessing the watch URL pattern directly
// Pattern: /watch/{anime-slug}-episode-{ep}/
func GetDesiDubSourcesDirect(slug string, ep int) []map[string]interface{} {
	patterns := []string{
		fmt.Sprintf("%s-episode-%d", slug, ep),
		fmt.Sprintf("%s-season-1-episode-%d", slug, ep),
	}

	for _, pattern := range patterns {
		log.Printf("[DesiDub] Trying direct pattern: %s", pattern)
		sources := GetDesiDubSources(pattern)
		if len(sources) > 0 {
			return sources
		}
	}
	return nil
}

func GetDesiDubInfo(slug string) map[string]interface{} {
	infoUrl := fmt.Sprintf("%s/anime/%s/", DesiDubBase, slug)
	log.Printf("[DesiDub] Getting info: %s", infoUrl)

	resp, err := utils.HttpClient.R().Get(infoUrl)
	if err != nil || !resp.IsSuccess() {
		return nil
	}

	html := string(resp.Body())
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil
	}

	episodes := []map[string]interface{}{}

	// 1. Try AJAX API first
	animeId := extractAnimeId(html)
	if animeId != "" {
		log.Printf("[DesiDub] Found anime ID: %s, trying AJAX API", animeId)
		ajaxUrl := fmt.Sprintf("%s/wp-admin/admin-ajax.php?action=get_episodes&anime_id=%s&page=1&order=desc", DesiDubBase, animeId)
		ajaxResp, ajaxErr := utils.HttpClient.R().
			SetHeader("Referer", infoUrl).
			Get(ajaxUrl)
		if ajaxErr == nil && ajaxResp.IsSuccess() {
			var ajaxData map[string]interface{}
			if json.Unmarshal(ajaxResp.Body(), &ajaxData) == nil {
				if success, ok := ajaxData["success"].(bool); ok && success {
					if data, ok := ajaxData["data"].(map[string]interface{}); ok {
						if eps, ok := data["episodes"].([]interface{}); ok {
							for _, epRaw := range eps {
								ep, ok := epRaw.(map[string]interface{})
								if !ok {
									continue
								}
								epNum := utils.ToString(ep["meta_number"])
								if epNum == "" {
									numStr := utils.ToString(ep["number"])
									epNum = strings.ReplaceAll(numStr, "Episode ", "")
								}
								epUrl := utils.ToString(ep["url"])
								var epSlug string
								parts := strings.Split(epUrl, "/watch/")
								if len(parts) > 1 {
									epSlug = strings.Split(parts[1], "/")[0]
								}
								if epSlug != "" && epNum != "" {
									episodes = append(episodes, map[string]interface{}{
										"number": epNum,
										"slug":   epSlug,
									})
								}
							}
							log.Printf("[DesiDub] Found %d episodes via AJAX", len(episodes))
						}
					}
				}
			}
		}
	}

	// 2. Fallback to HTML scraping
	if len(episodes) == 0 {
		selectors := []string{".episodios li", ".episode-list li", ".episodes li", `a[href*="/watch/"]`}
		for _, sel := range selectors {
			items := doc.Find(sel)
			if items.Length() == 0 {
				continue
			}

			items.Each(func(i int, s *goquery.Selection) {
				href := ""
				if a := s.Find("a"); a.Length() > 0 {
					href, _ = a.Attr("href")
				} else {
					href, _ = s.Attr("href")
				}

				epNum := strings.TrimSpace(s.Find(".episodionum, .episode-number").Text())
				if epNum == "" {
					re := regexp.MustCompile(`(?i)Episode\s*(\d+)`)
					if m := re.FindStringSubmatch(s.Text()); len(m) > 1 {
						epNum = m[1]
					}
				}
				if epNum == "" {
					re := regexp.MustCompile(`(\d+)`)
					if m := re.FindStringSubmatch(s.Find("a").Text()); len(m) > 1 {
						epNum = m[1]
					}
				}

				if href != "" {
					parts := strings.Split(href, "/watch/")
					if len(parts) > 1 {
						epSlug := strings.Split(parts[1], "/")[0]
						if epSlug != "" && epNum != "" {
							episodes = append(episodes, map[string]interface{}{
								"number": epNum,
								"slug":   epSlug,
							})
						}
					}
				}
			})

			if len(episodes) > 0 {
				break
			}
		}
	}

	return map[string]interface{}{
		"title":    strings.TrimSpace(doc.Find(".data h1, h1, .title").First().Text()),
		"synopsis": strings.TrimSpace(doc.Find(".wp-content p").First().Text()),
		"image":    doc.Find(".poster img").First().AttrOr("src", ""),
		"episodes": episodes,
	}
}

// extractAnimeId gets the internal anime ID from page HTML
func extractAnimeId(html string) string {
	patterns := []string{
		`data-anime-id=["']?(\d+)["']?`,
		`anime_id["']?\s*:\s*["']?(\d+)["']?`,
		`postid["']?\s*:\s*["']?(\d+)["']?`,
	}
	for _, p := range patterns {
		re := regexp.MustCompile(p)
		if m := re.FindStringSubmatch(html); len(m) > 1 {
			return m[1]
		}
	}
	return ""
}

func GetDesiDubSources(id string) []map[string]interface{} {
	watchUrl := fmt.Sprintf("%s/watch/%s/", DesiDubBase, id)
	log.Printf("[DesiDub] Getting sources: %s", watchUrl)

	resp, err := utils.HttpClient.R().Get(watchUrl)
	if err != nil || !resp.IsSuccess() {
		return []map[string]interface{}{}
	}

	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(resp.Body())))
	if err != nil {
		return []map[string]interface{}{}
	}

	sources := []map[string]interface{}{}
	iframeRegex := regexp.MustCompile(`src=['"]([^'"]+)['"]`)

	embedSelectors := []string{
		"span[data-embed-id]",
		"[data-embed]",
		"iframe[data-embed-id]",
		"iframe[src]",
	}

	for _, sel := range embedSelectors {
		doc.Find(sel).Each(func(i int, s *goquery.Selection) {
			embedData, _ := s.Attr("data-embed-id")
			if embedData == "" {
				embedData, _ = s.Attr("data-embed")
			}

			if embedData != "" {
				parts := strings.Split(embedData, ":")
				if len(parts) < 2 {
					return
				}

				serverName := decodeB64(parts[0])
				finalUrl := decodeB64(parts[1])
				if finalUrl == "" || serverName == "" {
					return
				}

				if strings.Contains(finalUrl, "<iframe") {
					match := iframeRegex.FindStringSubmatch(finalUrl)
					if len(match) > 1 {
						finalUrl = match[1]
					}
				}

				if finalUrl != "" && !strings.Contains(finalUrl, "googletagmanager") {
					lowerName := strings.ToLower(serverName)
					isDub := strings.Contains(lowerName, "dub") || strings.Contains(lowerName, "hindi") ||
						strings.Contains(lowerName, "mirror") || strings.Contains(lowerName, "stream")
					isMulti := strings.Contains(lowerName, "multi") || strings.Contains(lowerName, "abyss") ||
						strings.Contains(lowerName, "vmoly")

					cleanName := regexp.MustCompile(`(?i)(dub|multi)$`).ReplaceAllString(serverName, "")
					cleanName = strings.TrimSpace(cleanName)
					if cleanName == "" {
						cleanName = serverName
					}

					category := "hindi"
					language := "Hindi"
					if isMulti {
						category = "multi"
						language = "Multi"
					} else if !isDub {
						category = "sub"
						language = "Japanese"
					}

					if strings.HasPrefix(finalUrl, "//") {
						finalUrl = "https:" + finalUrl
					}
					if !strings.HasPrefix(finalUrl, "http") {
						return
					}

					sources = append(sources, map[string]interface{}{
						"name":     cleanName,
						"url":      finalUrl,
						"category": category,
						"language": language,
						"isM3U8":   strings.Contains(strings.ToLower(finalUrl), ".m3u8"),
						"isEmbed":  !strings.Contains(strings.ToLower(finalUrl), ".m3u8"),
						"provider": "DesiDubAnime",
						"priority": getPriority(cleanName),
					})
				}
			} else {
				src, _ := s.Attr("src")
				if src == "" { src, _ = s.Attr("data-src") }
				if src != "" && strings.HasPrefix(src, "http") && 
					!strings.Contains(src, "googletagmanager") && !strings.Contains(src, "analytics") {
					
					srcLower := strings.ToLower(src)
					name := "Mirror"
					if strings.Contains(srcLower, "vmoli") {
						name = "vmoli"
					} else if strings.Contains(srcLower, "p2p") {
						name = "streamp2p"
					} else if strings.Contains(srcLower, "abyss") {
						name = "abyss"
					}
					
					sources = append(sources, map[string]interface{}{
						"name":     name,
						"url":      src,
						"category": "hindi",
						"language": "Hindi",
						"isM3U8":   strings.Contains(srcLower, ".m3u8"),
						"isEmbed":  !strings.Contains(srcLower, ".m3u8"),
						"provider": "DesiDubAnime",
						"priority": getPriority(name),
					})
				}
			}
		})

		if len(sources) > 0 {
			log.Printf("[DesiDub] Found %d sources with selector: %s", len(sources), sel)
			break
		}
	}

	// Sort sources by priority (vmoli, streamp2p, multi should be at the top)
	sort.Slice(sources, func(i, j int) bool {
		pI := 0
		if val, err := strconv.Atoi(fmt.Sprintf("%v", sources[i]["priority"])); err == nil { pI = val }
		pJ := 0
		if val, err := strconv.Atoi(fmt.Sprintf("%v", sources[j]["priority"])); err == nil { pJ = val }
		return pI > pJ
	})

	return sources
}

func getPriority(name string) int {
	name = strings.ToLower(name)
	if strings.Contains(name, "vmoli") { return 100 }
	if strings.Contains(name, "p2p") { return 90 }
	if strings.Contains(name, "multi") { return 80 }
	if strings.Contains(name, "abyss") { return 70 }
	if strings.Contains(name, "hindi") { return 60 }
	return 10
}
