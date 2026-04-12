package providers

import (
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// GetNineAnimeSources grabs Moon/Omega iframe URLs from 9anime via corsproxy.io.
func GetNineAnimeSources(slug string, ep int) map[string]interface{} {
	apiKeys := []string{
		"987d90d7",
		"4b4669d3",
		"97b53241",
		"19e6a473",
		"97d01bcc",
	}
	
	// Randomly pick a key for rotation
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	apiKey := apiKeys[r.Intn(len(apiKeys))]
	urlPatterns := []string{
		fmt.Sprintf("https://9anime.org.lv/%s-episode-%d/", slug, ep),
		fmt.Sprintf("https://9anime.org.lv/%s-episode-%d", slug, ep),
	}

	diags := make([]string, 0)
	client := &http.Client{Timeout: 30 * time.Second}

	for _, animeURL := range urlPatterns {
		proxyURL := fmt.Sprintf("https://corsproxy.io/?key=%s&url=%s", apiKey, url.QueryEscape(animeURL))
		log.Printf("[9anime] Trying Proxy: %s", proxyURL)

		req, err := http.NewRequest("GET", proxyURL, nil)
		if err != nil {
			diags = append(diags, fmt.Sprintf("req_err: %v", err))
			continue
		}

		// Use the exact Chrome 125 headers provided by the user
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
		req.Header.Set("Accept-Language", "en-US,en;q=0.9")
		req.Header.Set("Sec-Ch-Ua", `"Chromium";v="125", "Not.A/Brand";v="24"`)
		req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
		req.Header.Set("Sec-Ch-Ua-Platform", `"Windows"`)
		req.Header.Set("Sec-Fetch-Dest", "document")
		req.Header.Set("Sec-Fetch-Mode", "navigate")
		req.Header.Set("Sec-Fetch-Site", "same-origin")
		req.Header.Set("Sec-Fetch-User", "?1")
		req.Header.Set("Upgrade-Insecure-Requests", "1")
		req.Header.Set("Priority", "u=0, i")

		resp, err := client.Do(req)
		if err != nil {
			diags = append(diags, fmt.Sprintf("proxy_err(%s): %v", animeURL, err))
			continue
		}
		defer resp.Body.Close()

		diags = append(diags, fmt.Sprintf("%s => %d", animeURL, resp.StatusCode))
		log.Printf("[9anime] %s => HTTP %d", animeURL, resp.StatusCode)

		if resp.StatusCode != 200 {
			bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
			preview := string(bodyBytes)
			if len(preview) > 200 {
				preview = preview[:200]
			}
			diags = append(diags, fmt.Sprintf("proxy_body: %s", preview))
			continue
		}

		doc, err := goquery.NewDocumentFromReader(resp.Body)
		if err != nil {
			diags = append(diags, fmt.Sprintf("DOM_err: %v", err))
			continue
		}

		sourcesList := make([]map[string]interface{}, 0)
		doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) {
			val, _ := s.Attr("value")
			text := strings.TrimSpace(s.Text())
			if val != "" && (strings.Contains(text, "Moon") || strings.Contains(text, "Omega") || strings.Contains(text, "Vidmoly")) {
				decoded, decErr := base64.StdEncoding.DecodeString(val)
				if decErr == nil {
					re := regexp.MustCompile(`src="([^"]+)"`)
					matches := re.FindStringSubmatch(string(decoded))
					var iframeUrl string
					if len(matches) > 1 {
						iframeUrl = matches[1]
					} else {
						iframeUrl = string(decoded)
					}
					if strings.HasPrefix(iframeUrl, "//") {
						iframeUrl = "https:" + iframeUrl
					}
					quality := "Auto"
					if strings.Contains(text, "HD") {
						quality = "1080p"
					}
					sourcesList = append(sourcesList, map[string]interface{}{
						"url": iframeUrl, "quality": quality,
						"isM3U8": false, "isEmbed": true,
						"server": text, "provider": "9anime",
					})
				}
			}
		})

		if len(sourcesList) > 0 {
			return map[string]interface{}{"sources": sourcesList}
		}

		// Diagnostics
		pageTitle := doc.Find("title").Text()
		optCount := 0
		doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) { optCount++ })
		diags = append(diags, fmt.Sprintf("title='%s' opts=%d", pageTitle, optCount))

		bodyText := doc.Find("body").Text()
		if strings.Contains(bodyText, "Cloudflare") || strings.Contains(bodyText, "challenge") {
			diags = append(diags, "BLOCKED:cloudflare_detected_via_proxy")
		}
	}

	return map[string]interface{}{"_diagnostics": diags}
}
