package providers

import (
	"encoding/base64"
	"fmt"
	"log"
	"net/http"
	"net/http/cookiejar"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// GetNineAnimeSources directly grabs Moon/Omega iframe URLs via goquery
// by trying to construct the 9anime URL from slug and episode number.
func GetNineAnimeSources(slug string, ep int) map[string]interface{} {
	// Try multiple URL patterns that 9anime uses
	urlPatterns := []string{
		fmt.Sprintf("https://9anime.org.lv/%s-episode-%d/", slug, ep),
		fmt.Sprintf("https://9anime.org.lv/%s-episode-%d", slug, ep),
		fmt.Sprintf("https://9anime.org.lv/watch/%s-episode-%d/", slug, ep),
		fmt.Sprintf("https://9anime.org.lv/watch/%s/%d/", slug, ep),
	}

	// Create a client with cookie jar to handle anti-bot redirects
	jar, _ := cookiejar.New(nil)
	client := &http.Client{
		Jar:     jar,
		Timeout: 15 * time.Second,
		// Follow redirects (default behavior, but explicit)
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects")
			}
			// Copy headers to redirect request
			for key, val := range via[0].Header {
				req.Header[key] = val
			}
			return nil
		},
	}

	for _, animeURL := range urlPatterns {
		log.Printf("[9anime] Trying URL: %s", animeURL)

		req, err := http.NewRequest("GET", animeURL, nil)
		if err != nil {
			log.Printf("[9anime] Error creating request for %s: %v", animeURL, err)
			continue
		}

		// Use comprehensive browser-like headers to avoid blocks
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")
		req.Header.Set("Accept-Language", "en-US,en;q=0.9")
		req.Header.Set("Accept-Encoding", "identity") // avoid gzip issues in serverless
		req.Header.Set("Connection", "keep-alive")
		req.Header.Set("Upgrade-Insecure-Requests", "1")
		req.Header.Set("Sec-Fetch-Dest", "document")
		req.Header.Set("Sec-Fetch-Mode", "navigate")
		req.Header.Set("Sec-Fetch-Site", "none")
		req.Header.Set("Sec-Fetch-User", "?1")
		req.Header.Set("Cache-Control", "max-age=0")

		resp, err := client.Do(req)
		if err != nil {
			log.Printf("[9anime] Request error for %s: %v", animeURL, err)
			continue
		}
		defer resp.Body.Close()

		log.Printf("[9anime] Response status for %s: %d", animeURL, resp.StatusCode)

		if resp.StatusCode != http.StatusOK {
			log.Printf("[9anime] Non-200 status (%d) for %s, trying next pattern...", resp.StatusCode, animeURL)
			continue
		}

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			log.Printf("[9anime] DOM parser error for %s: %v", animeURL, err)
			continue
		}

		sourcesList := make([]map[string]interface{}, 0)

		doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) {
			val, _ := s.Attr("value")
			text := strings.TrimSpace(s.Text())

			// Prioritizing Moon and Omega servers
			if val != "" && (strings.Contains(text, "Moon") || strings.Contains(text, "Omega") || strings.Contains(text, "Vidmoly")) {
				decodedBytes, decodeErr := base64.StdEncoding.DecodeString(val)
				if decodeErr == nil {
					decodedString := string(decodedBytes)

					re := regexp.MustCompile(`src="([^"]+)"`)
					matches := re.FindStringSubmatch(decodedString)
					var iframeUrl string
					if len(matches) > 1 {
						iframeUrl = matches[1]
					} else {
						iframeUrl = decodedString
					}

					if strings.HasPrefix(iframeUrl, "//") {
						iframeUrl = "https:" + iframeUrl
					}

					quality := "Auto"
					if strings.Contains(text, "HD") {
						quality = "1080p"
					}

					sourcesList = append(sourcesList, map[string]interface{}{
						"url":      iframeUrl,
						"quality":  quality,
						"isM3U8":   false, // these are iframe embeds
						"isEmbed":  true,
						"server":   text,
						"provider": "9anime",
					})
					log.Printf("[9anime] Found source: [%s] %s", text, iframeUrl)
				} else {
					log.Printf("[9anime] Base64 decode error for server %s: %v", text, decodeErr)
				}
			}
		})

		if len(sourcesList) > 0 {
			log.Printf("[9anime] SUCCESS: Found %d sources from %s", len(sourcesList), animeURL)
			return map[string]interface{}{
				"sources": sourcesList,
			}
		}

		// Log what we DID find in the HTML for debugging
		optionCount := 0
		doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) {
			optionCount++
			text := strings.TrimSpace(s.Text())
			log.Printf("[9anime] DEBUG: Found option #%d: '%s'", i, text)
		})
		if optionCount == 0 {
			// Try alternative selectors
			log.Printf("[9anime] DEBUG: No 'select.mirror option' found. Page title: %s", doc.Find("title").Text())
			// Check if we hit a Cloudflare/captcha page
			bodyText := doc.Find("body").Text()
			if strings.Contains(bodyText, "Cloudflare") || strings.Contains(bodyText, "challenge") || strings.Contains(bodyText, "captcha") {
				log.Printf("[9anime] WARNING: Cloudflare/captcha block detected for %s", animeURL)
			}
		}
	}

	log.Printf("[9anime] FAILED: No sources found for slug=%s ep=%d after trying all URL patterns", slug, ep)
	return nil
}
