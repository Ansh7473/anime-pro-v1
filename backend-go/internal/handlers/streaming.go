package handlers

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/Ansh7473/anime-pro/backend-go/internal/providers"
	"github.com/Ansh7473/anime-pro/backend-go/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/go-resty/resty/v2"
)

var (
	// Simple in-memory cache for metadata to mirror Node.js implementation
	cacheMutex    sync.RWMutex
	metadataCache = make(map[string]map[string]interface{})
	slugCache     = make(map[string]string)

	// Global Origin Cache for SmartAssetProxy (fixes stripped referers)
	originCache      = make(map[string]string) // ClientIP/ID -> Last successful proxied Hostname
	originCacheMutex sync.RWMutex
)

// StreamingAnimelok handles fetching sources from Animelok with slug resolution
func StreamingAnimelok(c *gin.Context) {
	animeId := c.Query("animeId")
	epStr := c.Query("ep")
	ep, _ := strconv.Atoi(epStr)
	if ep == 0 {
		ep = 1
	}

	// 1. Resolve titles for the animeId (MAL ID)
	titles, err := providers.GetAnimeTitles(animeId)
	if err != nil || len(titles) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Title not found", "provider": "Animelok"})
		return
	}

	// 2. Generate slug candidates (pattern: title-malId, title-aniId, and title)
	malId, _ := strconv.Atoi(animeId)
	aniId, _ := utils.GetAnilistId(malId)
	baseSlug := providers.ToKebab(titles[0])

	candidates := []string{fmt.Sprintf("%s-%d", baseSlug, malId)}
	if aniId > 0 && aniId != malId {
		candidates = append(candidates, fmt.Sprintf("%s-%d", baseSlug, aniId))
	}
	candidates = append(candidates, baseSlug)

	// 3. Try candidates sequentially
	for _, slug := range candidates {
		res := providers.GetAnimelokSources(slug, ep)
		if src, ok := res["sources"].([]map[string]interface{}); ok && len(src) > 0 {
			// Return raw sources, the frontend will handle proxying if needed
			c.JSON(http.StatusOK, gin.H{
				"provider": "Animelok",
				"status":   200,
				"data":     res,
			})
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"provider": "Animelok", "status": 404, "message": "No sources found"})
}

// StreamingAnimelokSlug returns potential slug candidates for client-side fetching
func StreamingAnimelokSlug(c *gin.Context) {
	animeId := c.Query("animeId")
	titles, err := providers.GetAnimeTitles(animeId)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Title not found"})
		return
	}

	baseSlug := providers.ToKebab(titles[0])
	candidates := []string{
		fmt.Sprintf("%s-%s", baseSlug, animeId),
		baseSlug,
	}

	c.JSON(http.StatusOK, gin.H{
		"malId":          animeId,
		"slugCandidates": candidates,
		"titles":         titles,
		"apiTemplate":    "https://animelok.xyz/api/anime/{slug}/episodes/{ep}",
	})
}

// StreamingEpisodeMetadata aggregates metadata from multiple providers
func StreamingEpisodeMetadata(c *gin.Context) {
	animeId := c.Query("animeId")
	if animeId == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "animeId required"})
		return
	}

	// Check cache - but we want to bypass old cached data that might have limited episodes
	// For now, bypass cache to ensure we get all episodes
	// TODO: Implement proper cache invalidation when episode count changes

	// cacheMutex.RLock()
	// if cached, ok := metadataCache[animeId]; ok {
	// 	cacheMutex.RUnlock()
	// 	c.JSON(http.StatusOK, gin.H{"provider": "Cache", "status": 200, "data": cached})
	// 	return
	// }
	// cacheMutex.RUnlock()

	malId, _ := strconv.Atoi(animeId)
	titles, err := providers.GetAnimeTitles(animeId)
	if err != nil || len(titles) == 0 {
		c.JSON(http.StatusOK, gin.H{"provider": "None", "data": gin.H{"episodes": []interface{}{}, "totalEpisodes": 0}})
		return
	}

	var episodes []utils.EpisodeMetadata
	var providerName string

	// 3. Jikan Fallback (Best for descriptions and titles) - Fetch all pages
	if len(episodes) == 0 {
		log.Printf("[Metadata Handler] No episodes from providers, trying Jikan fallback for %s", animeId)

		// Fetch all episodes by paginating through all pages
		page := 1
		limit := 100 // Maximum allowed by Jikan API

		for {
			jikanUrl := fmt.Sprintf("https://api.jikan.moe/v4/anime/%s/episodes?page=%d&limit=%d", animeId, page, limit)
			jresp, jerr := utils.FetchWithRetries(jikanUrl, 2, 500)
			if jerr != nil || jresp.StatusCode() != http.StatusOK {
				if page == 1 {
					log.Printf("[Metadata Handler] Failed to fetch from Jikan API: %v", jerr)
				}
				break
			}

			var jdata map[string]interface{}
			if err := json.Unmarshal(jresp.Body(), &jdata); err != nil {
				if page == 1 {
					log.Printf("[Metadata Handler] Failed to parse Jikan API response: %v", err)
				}
				break
			}

			jeps, ok := jdata["data"].([]interface{})
			if !ok || len(jeps) == 0 {
				// No more episodes
				break
			}

			providerName = "Jikan"
			for _, je := range jeps {
				mapEp := je.(map[string]interface{})
				num, _ := mapEp["mal_id"].(float64)
				episodes = append(episodes, utils.EpisodeMetadata{
					Number:       int(num),
					Title:        utils.ToString(mapEp["title"]),
					IsFiller:     mapEp["filler"].(bool),
					OfficialSite: utils.ToString(mapEp["forum_url"]),
				})
			}

			// Check if there are more pages
			pagination, ok := jdata["pagination"].(map[string]interface{})
			if !ok {
				break
			}

			hasNextPage, _ := pagination["has_next_page"].(bool)
			if !hasNextPage {
				break
			}

			page++
		}

		log.Printf("[Metadata Handler] Fetched %d episodes from Jikan for %s", len(episodes), animeId)
	}

	// 4. AniList Enrichment (Official high-res thumbnails and titles)
	aniId, _ := utils.GetAnilistId(malId)
	if aniId > 0 && len(episodes) > 0 {
		streamingEps, _ := providers.GetAniListStreamingEpisodes(aniId)
		if len(streamingEps) > 0 {
			for i, ep := range episodes {
				for _, strip := range streamingEps {
					title := utils.ToString(strip["title"])
					if strings.Contains(strings.ToLower(title), fmt.Sprintf("episode %d", ep.Number)) {
						if ep.Image == "" || strings.Contains(ep.Image, "placeholder") {
							episodes[i].Image = utils.ToString(strip["thumbnail"])
						}
						if ep.Title == "" || ep.Title == fmt.Sprintf("Episode %d", ep.Number) {
							episodes[i].Title = title
						}
						break
					}
				}
			}
		}
	}

	res := gin.H{
		"episodes":      episodes,
		"totalEpisodes": len(episodes),
		"timestamp":     time.Now().Unix(),
		"provider":      providerName,
	}

	// Update cache
	if len(episodes) > 0 {
		cacheMutex.Lock()
		metadataCache[animeId] = res
		cacheMutex.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{"provider": providerName, "status": 200, "data": res})
}

func StreamingDesiDub(c *gin.Context) {
	animeId := c.Query("animeId")
	epStr := c.Query("ep")
	ep, _ := strconv.Atoi(epStr)
	if ep == 0 {
		ep = 1
	}

	titles, err := providers.GetAnimeTitles(animeId)
	if err != nil || len(titles) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Title not found"})
		return
	}

	var sources []map[string]interface{}

	// Track 1: Try DIRECT episode URL patterns first (fastest approach)
	// DesiDub URLs follow: /watch/{anime-slug}-episode-{ep}/
	for _, title := range titles {
		baseSlug := providers.ToKebab(title)
		directSources := providers.GetDesiDubSourcesDirect(baseSlug, ep)
		if len(directSources) > 0 {
			sources = directSources
			break
		}
	}

	// Track 2: Search + info scrape fallback
	if len(sources) == 0 {
		for _, title := range titles {
			results := providers.SearchDesiDub(title)
			if len(results) == 0 {
				continue
			}

			bestSlug := utils.ToString(results[0]["slug"])

			// Try direct patterns with the discovered slug
			directSources := providers.GetDesiDubSourcesDirect(bestSlug, ep)
			if len(directSources) > 0 {
				sources = directSources
				break
			}

			// Fallback: info scrape to find episode slug
			info := providers.GetDesiDubInfo(bestSlug)
			if info == nil {
				continue
			}

			rawEps, _ := info["episodes"].([]map[string]interface{})
			var epSlug string
			for _, e := range rawEps {
				numStr := utils.ToString(e["number"])
				// Flexible matching: try exact string match and integer match
				numStr = strings.TrimSpace(numStr)
				if numStr == epStr {
					epSlug = utils.ToString(e["slug"])
					break
				}
				// Try parsing as int for numeric comparison
				epNumRe := regexp.MustCompile(`(\d+)`)
				if m := epNumRe.FindString(numStr); m != "" {
					parsedNum, _ := strconv.Atoi(m)
					if parsedNum == ep {
						epSlug = utils.ToString(e["slug"])
						break
					}
				}
			}

			if epSlug != "" {
				sources = providers.GetDesiDubSources(epSlug)
				if len(sources) > 0 {
					break
				}
			}
		}
	}

	if len(sources) > 0 {
		// Return raw sources, the frontend will handle proxying if needed
		c.JSON(http.StatusOK, gin.H{
			"provider": "DesiDubAnime",
			"status":   200,
			"data":     gin.H{"sources": sources, "subtitles": []interface{}{}},
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Sources not found for any title", "provider": "DesiDubAnime"})
}

func StreamingAnimeHindiDubbed(c *gin.Context) {
	animeId := c.Query("animeId")
	epStr := c.Query("ep")

	titles, err := providers.GetAnimeTitles(animeId)
	if err != nil || len(titles) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Title not found"})
		return
	}

	var sources []map[string]interface{}
	for _, title := range titles {
		results := providers.SearchAHD(title)
		if len(results) == 0 {
			continue
		}

		// AHD provider returns sources by title/postId and episode string
		for _, res := range results {
			bestId := utils.ToString(res["id"])
			srcs := providers.GetAHDSources(bestId, epStr)
			if len(srcs) > 0 {
				sources = srcs
				break
			}
		}

		if len(sources) > 0 {
			break
		}
	}

	if len(sources) > 0 {
		// Return raw sources, the frontend will handle proxying if needed
		c.JSON(http.StatusOK, gin.H{
			"provider": "AnimeHindiDubbed-WP",
			"status":   200,
			"data":     gin.H{"sources": sources, "subtitles": []interface{}{}},
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Sources not found for any title", "provider": "AnimeHindiDubbed-WP"})
}

func StreamingSourcesAggregate(c *gin.Context) {
	animeId := c.Query("animeId")
	epStr := c.Query("ep")
	ep, _ := strconv.Atoi(epStr)
	if ep == 0 {
		ep = 1
	}

	titles, err := providers.GetAnimeTitles(animeId)
	if err != nil || len(titles) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Title not found"})
		return
	}

	allSources := make([]map[string]interface{}, 0)

	// Track 1: Animelok (Primary)
	malId, _ := strconv.Atoi(animeId)
	aniId, _ := utils.GetAnilistId(malId)

	// Generate candidate slugs from ALL titles
	var animelokFound bool
	for _, title := range titles {
		baseSlug := providers.ToKebab(title)
		candidates := []string{fmt.Sprintf("%s-%d", baseSlug, malId)}
		if aniId > 0 && aniId != malId {
			candidates = append(candidates, fmt.Sprintf("%s-%d", baseSlug, aniId))
		}
		candidates = append(candidates, baseSlug)

		for _, slug := range candidates {
			res := providers.GetAnimelokSources(slug, ep)
			if src, ok := res["sources"].([]map[string]interface{}); ok && len(src) > 0 {
				for _, s := range src {
					s["provider"] = "Animelok"
					allSources = append(allSources, s)
				}
				animelokFound = true
				break
			}
		}
		if animelokFound {
			break
		}
	}

	// Track 2: DesiDub (Hindi Dub) - Direct patterns first, then search fallback
	var desiDubFound bool
	for _, title := range titles {
		baseSlug := providers.ToKebab(title)
		directSources := providers.GetDesiDubSourcesDirect(baseSlug, ep)
		if len(directSources) > 0 {
			allSources = append(allSources, directSources...)
			desiDubFound = true
			break
		}
	}
	if !desiDubFound {
		for _, title := range titles {
			resDesi := providers.SearchDesiDub(title)
			if len(resDesi) == 0 {
				continue
			}

			bestDesiSlug := utils.ToString(resDesi[0]["slug"])

			// Try direct patterns with discovered slug
			directSources := providers.GetDesiDubSourcesDirect(bestDesiSlug, ep)
			if len(directSources) > 0 {
				allSources = append(allSources, directSources...)
				desiDubFound = true
				break
			}

			// Fallback: info scrape
			info := providers.GetDesiDubInfo(bestDesiSlug)
			if info == nil {
				continue
			}

			rawEps, _ := info["episodes"].([]map[string]interface{})
			var epSlug string
			for _, e := range rawEps {
				numStr := strings.TrimSpace(utils.ToString(e["number"]))
				if numStr == epStr {
					epSlug = utils.ToString(e["slug"])
					break
				}
				epNumRe := regexp.MustCompile(`(\d+)`)
				if m := epNumRe.FindString(numStr); m != "" {
					parsedNum, _ := strconv.Atoi(m)
					if parsedNum == ep {
						epSlug = utils.ToString(e["slug"])
						break
					}
				}
			}
			if epSlug != "" {
				srcs := providers.GetDesiDubSources(epSlug)
				if len(srcs) > 0 {
					allSources = append(allSources, srcs...)
					desiDubFound = true
					break
				}
			}
		}
	}

	// Track 3: AHD (Hindi Dub)
	var ahdFound bool
	for _, title := range titles {
		resAHD := providers.SearchAHD(title)
		if len(resAHD) == 0 {
			continue
		}

		for _, res := range resAHD {
			bestAHDId := utils.ToString(res["id"])
			srcs := providers.GetAHDSources(bestAHDId, epStr)
			if len(srcs) > 0 {
				allSources = append(allSources, srcs...)
				ahdFound = true
				break
			}
		}
		if ahdFound {
			break
		}
	}

	if len(allSources) > 0 {
		// Return raw sources, the frontend will handle proxying if needed
		c.JSON(http.StatusOK, gin.H{
			"status": 200,
			"data": gin.H{
				"sources":   allSources,
				"subtitles": []interface{}{},
			},
		})
		return
	}

	c.JSON(http.StatusNotFound, gin.H{"status": 404, "message": "No sources found"})
}

func StreamingProxy(c *gin.Context) {
	targetUrl := c.Query("url")
	if targetUrl == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url required"})
		return
	}

	scheme := "http"
	if c.Request.TLS != nil {
		scheme = "https"
	}
	backendBase := fmt.Sprintf("%s://%s", scheme, c.Request.Host)

	// Copy essential headers and ensure a valid User-Agent
	headers := map[string]string{
		"User-Agent":         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
		"Accept":             "*/*",
		"Accept-Language":    "en-US,en;q=0.9",
		"Sec-Ch-Ua":          c.GetHeader("Sec-Ch-Ua"),
		"Sec-Ch-Ua-Mobile":   c.GetHeader("Sec-Ch-Ua-Mobile"),
		"Sec-Ch-Ua-Platform": c.GetHeader("Sec-Ch-Ua-Platform"),
		"Sec-Fetch-Dest":     "video",
		"Sec-Fetch-Mode":     "cors",
		"Sec-Fetch-Site":     "cross-site",
		"X-Requested-With":   "XMLHttpRequest",
	}

	// Dynamic Sec-Fetch-Dest
	lowerTarget := strings.ToLower(targetUrl)
	if strings.Contains(lowerTarget, ".m3u8") || strings.Contains(lowerTarget, ".ts") || strings.Contains(lowerTarget, ".mp4") {
		headers["Sec-Fetch-Dest"] = "video"
	} else if strings.Contains(lowerTarget, "/embed") || strings.Contains(lowerTarget, "player") || strings.Contains(lowerTarget, ".html") {
		headers["Sec-Fetch-Dest"] = "iframe"
	} else if strings.Contains(lowerTarget, ".js") {
		headers["Sec-Fetch-Dest"] = "script"
	} else {
		headers["Sec-Fetch-Dest"] = "empty"
	}

	clUa := c.GetHeader("User-Agent")
	if clUa != "" {
		headers["User-Agent"] = clUa
	}

	// 1. Get the current referer from query or context
	referer := c.Query("referer")
	if referer == "" {
		referer = "https://animelok.xyz/"
	}

	// Provider-specific Identity Mapping (Fixes 403s on strict players)
	targetUrlParsed, _ := url.Parse(targetUrl)
	targetHost := ""
	if targetUrlParsed != nil {
		targetHost = targetUrlParsed.Host
	}

	// Dynamic override from query if present
	if r := c.Query("referer"); r != "" {
		headers["Referer"] = r
		u, _ := url.Parse(r)
		if u != nil {
			headers["Origin"] = u.Scheme + "://" + u.Host
		}
	}

	// Strictly enforce identities for specific CDNs
	if strings.Contains(targetHost, "short.icu") || strings.Contains(targetHost, "boosterx") {
		headers["Referer"] = "https://www.desidubanime.me/"
		headers["Origin"] = "https://www.desidubanime.me"
	} else if strings.Contains(targetHost, "bysewihe") || strings.Contains(targetHost, "servabyss") || strings.Contains(targetHost, "vidgroud") {
		headers["Referer"] = "https://animehindidubbed.in/"
		headers["Origin"] = "https://animehindidubbed.in"
	} else if strings.Contains(targetHost, "owocdn") || strings.Contains(targetHost, "anvod") {
		headers["Referer"] = "https://animelok.xyz/"
		headers["Origin"] = "https://animelok.xyz"
	} else if headers["Referer"] == "" {
		headers["Referer"] = referer
		u, _ := url.Parse(referer)
		if u != nil {
			headers["Origin"] = u.Scheme + "://" + u.Host
		}
	}

	// Advanced Stealth Headers for strict CDNs (Atomic Racing Logic Fallback)
	headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
	headers["Accept"] = "*/*"
	headers["Accept-Language"] = "en-US,en;q=0.9"
	headers["Sec-Fetch-Dest"] = "iframe"
	headers["Sec-Fetch-Mode"] = "navigate"
	headers["Sec-Fetch-Site"] = "cross-site"
	headers["Upgrade-Insecure-Requests"] = "1"

	// Add Range header if requested by browser for seeking
	if r := c.GetHeader("Range"); r != "" {
		headers["Range"] = r
	}

	// Helper function for the actual fetch to support retries
	fetchTarget := func(target string, ref string) (*resty.Response, error) {
		h := map[string]string{
			"User-Agent":                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
			"Accept":                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			"Accept-Language":           "en-US,en;q=0.9",
			"Referer":                   ref,
			"Sec-Fetch-Dest":            "iframe",
			"Sec-Fetch-Mode":            "navigate",
			"Sec-Fetch-Site":            "cross-site",
			"Upgrade-Insecure-Requests": "1",
		}

		// Inject Origin if possible
		u, _ := url.Parse(ref)
		if u != nil {
			h["Origin"] = u.Scheme + "://" + u.Host
		}

		// Merge in existing headers (like Range)
		for k, v := range headers {
			h[k] = v
		}

		return utils.HttpClient.R().
			SetHeaders(h).
			Get(target)
	}

	var resp *resty.Response
	var err error

	// Create a list of referers to try for problematic CDNs (anvod/anivid)
	isAnvod := strings.Contains(strings.ToLower(targetUrl), "anvod.pro") ||
		strings.Contains(strings.ToLower(targetUrl), "anivid")

	referersToTry := []string{referer}
	if isAnvod {
		if referer != "https://animelok.xyz/" {
			referersToTry = append(referersToTry, "https://animelok.xyz/")
		}
		referersToTry = append(referersToTry, "https://animelok.vip/", "https://animes.at/")
	}

	for _, ref := range referersToTry {
		for i := 0; i < 2; i++ {
			resp, err = fetchTarget(targetUrl, ref)
			if err == nil && resp.IsSuccess() {
				goto success
			}
			// Special handling for boosterx.stream 503: retry with bare headers
			if resp != nil && resp.StatusCode() == 503 && strings.Contains(lowerTarget, "boosterx") {
				log.Printf("[Proxy] BoosterX 503. Retrying with minimal headers...")
				resp, err = utils.HttpClient.R().
					SetHeader("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36").
					Get(targetUrl)
				if err == nil && resp.IsSuccess() {
					goto success
				}
			}
			if resp != nil && (resp.StatusCode() == 521 || resp.StatusCode() == 503) {
				continue
			}
			break
		}
	}

success:
	if err == nil && resp.IsSuccess() {
		// Store the hostname in originCache for SmartAssetProxy fallback
		if u, _ := url.Parse(targetUrl); u != nil {
			originCacheMutex.Lock()
			originCache[c.ClientIP()] = u.Scheme + "://" + u.Host
			originCacheMutex.Unlock()
			log.Printf("[Proxy] Cache Update: %s -> %s", c.ClientIP(), u.Host)
		}
	}

	if err != nil {
		log.Printf("[Proxy] FINAL ERROR for %s: %v", targetUrl, err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "failed to fetch resource", "status": 503})
		return
	}

	if !resp.IsSuccess() && resp.StatusCode() != 200 {
		log.Printf("[Proxy] Target FINALLY returned %d for %s", resp.StatusCode(), targetUrl)
		c.JSON(resp.StatusCode(), gin.H{"error": "Target CDN returned error", "status": resp.StatusCode()})
		return
	}

	commonHeaders := map[string]string{
		"Access-Control-Allow-Origin":  "*",
		"Cache-Control":                "public, max-age=3600",
		"X-Content-Type-Options":       "nosniff",
		"Cross-Origin-Resource-Policy": "cross-origin",
		"Timing-Allow-Origin":          "*",
	}

	// Dynamic security header stripping to allow embedding (Global)
	securityHeaders := []string{"X-Frame-Options", "Content-Security-Policy", "Cross-Origin-Embedder-Policy", "X-Content-Security-Policy"}
	for _, h := range securityHeaders {
		c.Header(h, "")      // Clear current header
		c.Header("X-"+h, "") // Some sites use X- prefix
	}
	// Force allow framing
	c.Header("X-Frame-Options", "ALLOWALL")

	for k, v := range commonHeaders {
		c.Header(k, v)
	}

	// 403/521/503 Bypass Logic for specific CDN domains
	isBlocked := resp.StatusCode() == 403 || resp.StatusCode() == 521 || resp.StatusCode() == 503
	if isBlocked && (strings.Contains(lowerTarget, "short.icu") || strings.Contains(lowerTarget, "owocdn") ||
		strings.Contains(lowerTarget, "anvod") || strings.Contains(lowerTarget, "o7stream") ||
		strings.Contains(lowerTarget, "boosterx") || strings.Contains(lowerTarget, "bysewihe") ||
		strings.Contains(lowerTarget, "mixdrop") || strings.Contains(lowerTarget, "streamtape")) {
		log.Printf("[Proxy] Blocked (%d) for %s. Retrying in STEALTH MODE...", resp.StatusCode(), lowerTarget)
		// Stealth mode: Strip Referer/Origin entirely, Use core Chrome headers
		headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
		headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7"
		headers["Accept-Language"] = "en-US,en;q=0.9"
		headers["Sec-Fetch-Dest"] = "iframe"
		headers["Sec-Fetch-Mode"] = "navigate"
		headers["Sec-Fetch-Site"] = "cross-site"
		headers["Upgrade-Insecure-Requests"] = "1"

		// Priority Identity
		headers["Referer"] = referer
		u, _ := url.Parse(referer)
		if u != nil {
			headers["Origin"] = u.Scheme + "://" + u.Host
		}

		resp, err = utils.HttpClient.R().
			SetHeaders(headers).
			Get(targetUrl)

		if err != nil || (!resp.IsSuccess() && resp.StatusCode() != 200) {
			log.Printf("[Proxy] Stealth retry failed (%d) for %s", resp.StatusCode(), lowerTarget)
			c.JSON(resp.StatusCode(), gin.H{"error": "Target CDN block", "status": resp.StatusCode()})
			return
		}
	}

	contentType := resp.Header().Get("Content-Type")
	isM3U8 := strings.Contains(strings.ToLower(targetUrl), ".m3u8") ||
		strings.Contains(strings.ToLower(targetUrl), "/m3u8") ||
		strings.Contains(strings.ToLower(targetUrl), "master.m3u8") ||
		strings.Contains(strings.ToLower(targetUrl), "uwu.m3u8")

	if isM3U8 {
		body := string(resp.Body())
		lines := strings.Split(body, "\n")
		var rewrittenLines []string

		// Get base URL for relative segment paths
		u, _ := url.Parse(targetUrl)
		base := u.Scheme + "://" + u.Host + strings.Join(strings.Split(u.Path, "/")[:len(strings.Split(u.Path, "/"))-1], "/") + "/"

		for _, line := range lines {
			line = strings.TrimSpace(line)
			if line == "" {
				continue
			}
			if strings.HasPrefix(line, "#") {
				// Handle tags that might contain URLs (like URI="...")
				if strings.Contains(line, "URI=") {
					re := regexp.MustCompile(`URI="([^"]+)"`)
					line = re.ReplaceAllStringFunc(line, func(match string) string {
						submatch := re.FindStringSubmatch(match)
						if len(submatch) > 1 {
							absUrl := submatch[1]
							if !strings.HasPrefix(absUrl, "http") {
								absUrl = base + absUrl
							}
							return fmt.Sprintf(`URI="%s/api/v1/streaming/proxy?url=%s&referer=%s"`, backendBase, url.QueryEscape(absUrl), url.QueryEscape(referer))
						}
						return match
					})
				}
				rewrittenLines = append(rewrittenLines, line)
			} else {
				// This is a segment/manifest URL
				absUrl := line
				if !strings.HasPrefix(absUrl, "http") {
					if strings.HasPrefix(absUrl, "/") {
						absUrl = u.Scheme + "://" + u.Host + absUrl
					} else {
						absUrl = base + absUrl
					}
				}
				rewrittenLines = append(rewrittenLines, fmt.Sprintf("%s/api/v1/streaming/proxy?url=%s&referer=%s", backendBase, url.QueryEscape(absUrl), url.QueryEscape(referer)))
			}
		}
		c.Data(http.StatusOK, "application/vnd.apple.mpegurl", []byte(strings.Join(rewrittenLines, "\n")))
		return
	}

	// Handle HTML and CSS rewriting to fix relative asset 404s
	isHTML := strings.Contains(strings.ToLower(contentType), "text/html")
	isCSS := strings.Contains(strings.ToLower(contentType), "text/css")

	if isHTML || isCSS {
		body := string(resp.Body())
		u, _ := url.Parse(targetUrl)
		origin := u.Scheme + "://" + u.Host

		if isHTML {
			// Inject getResponseData polyfill and Base Tag
			polyfill := `
				<script>
					window.getResponseData = window.getResponseData || function(d){ return d; };
					console.log("[Proxy] Injected getResponseData polyfill");
				</script>
				<base href="` + u.Scheme + `://` + u.Host + u.Path + `">
			`
			if strings.Contains(body, "<head>") {
				body = strings.Replace(body, "<head>", "<head>"+polyfill, 1)
			} else {
				body = polyfill + body
			}
		}

		// Also do regex rewriting for attributes that skip the base tag (like absolute paths starting with /)
		reAssets := regexp.MustCompile(`(?i)(href|src|poster|data-src)\s*[:=]\s*["']?(/[a-zA-Z0-9._\-/%#?&=]+)["']?`)
		body = reAssets.ReplaceAllStringFunc(body, func(match string) string {
			groups := reAssets.FindStringSubmatch(match)
			if len(groups) > 2 {
				attrWithSep := groups[1]
				path := groups[2]
				if strings.HasPrefix(path, "/") && !strings.HasPrefix(path, "//") && !strings.Contains(path, "http") {
					absUrl := origin + path
					return fmt.Sprintf(`%s="%s/api/v1/streaming/proxy?url=%s&referer=%s"`, attrWithSep, backendBase, url.QueryEscape(absUrl), url.QueryEscape(referer))
				}
			}
			return match
		})

		// Fix ReferenceError: getResponseData by ensuring common DesiDub/Player globals exist
		if strings.Contains(lowerTarget, "desidub") && isHTML {
			body += `<script>window.getResponseData = window.getResponseData || function(){};</script>`
		}

		c.Header("Content-Type", contentType)
		c.String(resp.StatusCode(), body)
		return
	}

	if contentType == "" || strings.Contains(contentType, "octet-stream") {
		if strings.HasSuffix(strings.ToLower(targetUrl), ".ts") || strings.Contains(strings.ToLower(targetUrl), "segment") {
			contentType = "video/MP2T"
		} else {
			contentType = "application/octet-stream"
		}
	}

	// Just proxy the raw data (like .ts segments)
	// Proxy important headers back to the browser
	proxyHeaders := []string{"Content-Length", "Content-Range", "Accept-Ranges", "Content-Type", "Last-Modified", "ETag"}
	for _, h := range proxyHeaders {
		if v := resp.Header().Get(h); v != "" {
			c.Header(h, v)
		}
	}
	c.Data(resp.StatusCode(), contentType, resp.Body())
}

// SmartAssetProxy handles 404s by checking the Referer and trying to fix relative paths
func SmartAssetProxy(c *gin.Context) {
	referer := c.GetHeader("Referer")
	path := c.Request.URL.Path

	// Skip if it's already an API route or no referer
	if referer == "" || strings.HasPrefix(path, "/api/v1") || path == "/" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found", "path": path})
		return
	}

	// Filter common metadata/asset patterns to avoid infinite loops on real 404s
	isAsset := strings.Contains(path, ".") || strings.Contains(path, "assets") || strings.Contains(path, "static") || strings.Contains(path, "wp-")
	if !isAsset {
		c.JSON(http.StatusNotFound, gin.H{"error": "Resource not found", "path": path})
		return
	}

	// Extract the original target URL from our proxy referer
	// Referer looks like: http://localhost:3001/api/v1/streaming/proxy?url=https://target.com/embed/page
	refUrl, err := url.Parse(referer)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid referer"})
		return
	}

	targetParam := refUrl.Query().Get("url")
	if targetParam == "" {
		// Handle cases where referer is pointing to a different proxied endpoint or just the player
		if idx := strings.LastIndex(referer, "url="); idx != -1 {
			targetParam, _ = url.QueryUnescape(referer[idx+4:])
			if endIdx := strings.Index(targetParam, "&"); endIdx != -1 {
				targetParam = targetParam[:endIdx]
			}
		}
	}

	// LAST DITCH: Origin Cache fallback
	if targetParam == "" {
		originCacheMutex.RLock()
		lastOrigin := originCache[c.ClientIP()]
		originCacheMutex.RUnlock()
		if lastOrigin != "" {
			targetParam = lastOrigin + path
			log.Printf("[SmartProxy] CACHE HIT for missing target: %s -> %s", c.ClientIP(), targetParam)
		}
	}

	if targetParam == "" {
		// Check common provider origins if targetParam is still empty
		if strings.Contains(path, "wp-") || strings.Contains(path, "animehindidubbed") {
			targetParam = "https://animehindidubbed.wpcomstaging.com" + path
		} else if strings.Contains(path, "anvod") {
			targetParam = "https://af03.anvod.pro" + path
		} else {
			log.Printf("[SmartProxy] Could not find target in referer: %s", referer)
			c.JSON(http.StatusNotFound, gin.H{"error": "No target URL in referer"})
			return
		}
	}

	targetUrl, err := url.Parse(targetParam)
	if err != nil || targetUrl.Host == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid target URL"})
		return
	}

	// Reconstruct the absolute path for the missing asset
	var assetUrl string
	if strings.HasPrefix(path, "http") {
		assetUrl = path // Already absolute
	} else if strings.Count(targetUrl.Path, "/") > 1 {
		// Target has a subpath (e.g. /v/abc), and asset is relative
		dir := targetUrl.Path[:strings.LastIndex(targetUrl.Path, "/")+1]
		assetUrl = fmt.Sprintf("%s://%s%s%s", targetUrl.Scheme, targetUrl.Host, dir, strings.TrimPrefix(path, "/"))
	} else {
		// Use root-relative resolution
		assetUrl = fmt.Sprintf("%s://%s%s", targetUrl.Scheme, targetUrl.Host, path)
	}

	log.Printf("[SmartProxy] Fixing 404 for path: %s (Target: %s) -> %s", path, targetUrl.Host, assetUrl)

	// Internally redirect to our proxy
	c.Request.URL.RawQuery = fmt.Sprintf("url=%s&referer=%s", url.QueryEscape(assetUrl), url.QueryEscape(targetParam))
	StreamingProxy(c)
}

// Provider direct routes (Legacy support)
func ProviderAnimelokSearch(c *gin.Context) {
	q := c.Query("q")
	res := providers.SearchAnimelok(q)
	c.JSON(http.StatusOK, gin.H{"results": res})
}

func ProviderAnimelokMetadata(c *gin.Context) {
	slug := c.Param("slug")
	res := providers.GetAnimelokMetadata(slug)
	c.JSON(http.StatusOK, res)
}

func ProviderAnimelokSources(c *gin.Context) {
	id := c.Param("id")
	epStr := c.Query("ep")
	ep, _ := strconv.Atoi(epStr)
	res := providers.GetAnimelokSources(id, ep)
	c.JSON(http.StatusOK, res)
}

// Provider direct routes
func ProviderDesidubSearch(c *gin.Context) {
	q := c.Query("q")
	res := providers.SearchDesiDub(q)
	c.JSON(http.StatusOK, res)
}

func ProviderDesidubInfo(c *gin.Context) {
	slug := c.Param("slug")
	res := providers.GetDesiDubInfo(slug)
	c.JSON(http.StatusOK, res)
}

func ProviderDesidubSources(c *gin.Context) {
	id := c.Param("id")
	res := providers.GetDesiDubSources(id)
	c.JSON(http.StatusOK, res)
}

func ProviderAHDSearch(c *gin.Context) {
	q := c.Query("q")
	res := providers.SearchAHD(q)
	c.JSON(http.StatusOK, res)
}

func ProviderAHDInfo(c *gin.Context) {
	id := c.Param("id")
	res := providers.GetAHDInfo(id)
	c.JSON(http.StatusOK, res)
}

func ProviderAHDSources(c *gin.Context) {
	id := c.Param("id")
	ep := c.Query("ep")
	res := providers.GetAHDSources(id, ep)
	c.JSON(http.StatusOK, res)
}

func ProviderAHDWPSearch(c *gin.Context)   { ProviderAHDSearch(c) }
func ProviderAHDWPLatest(c *gin.Context)   { c.JSON(http.StatusOK, []interface{}{}) }
func ProviderAHDWPEpisodes(c *gin.Context) { ProviderAHDInfo(c) }
func ProviderAHDWPServers(c *gin.Context)  { ProviderAHDInfo(c) }
func ProviderAHDWPSources(c *gin.Context)  { ProviderAHDSources(c) }
