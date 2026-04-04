package providers

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

// GetNineAnimeSources directly grabs Moon/Omega iframe URLs via goquery 
// by trying to construct the 9anime URL from slug and episode number.
func GetNineAnimeSources(slug string, ep int) map[string]interface{} {
	// Construct the URL. Example format: https://9anime.org.lv/one-piece-episode-1155/
	animeURL := fmt.Sprintf("https://9anime.org.lv/%s-episode-%d/", slug, ep)

	req, err := http.NewRequest("GET", animeURL, nil)
	if err != nil {
		return nil
	}
	
	// Use standard headers to avoid blocks
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// Possibly try different slug patterns, e.g., omitting "episode-" depending on URL format...
		return nil
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil
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
			}
		}
	})

	if len(sourcesList) > 0 {
		return map[string]interface{}{
			"sources": sourcesList,
		}
	}

	return nil
}
