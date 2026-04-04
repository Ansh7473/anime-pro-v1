package main

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"regexp"
	"strings"

	"github.com/PuerkitoBio/goquery"
)

func main() {
	animeURL := "https://9anime.org.lv/one-piece-episode-1155/"
	fmt.Printf("Fetching: %s\n", animeURL)

	req, err := http.NewRequest("GET", animeURL, nil)
	if err != nil {
		fmt.Printf("Error creating request: %v\n", err)
		return
	}
	// Simulate a real browser to avoid 403s
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("Request error: %v\n", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Printf("HTTP Error: %v\n", resp.Status)
		return
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		fmt.Printf("DOM parser error: %v\n", err)
		return
	}

	foundServers := make(map[string]string)

	doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) {
		val, _ := s.Attr("value")
		text := strings.TrimSpace(s.Text())
		
		if val != "" && (strings.Contains(text, "Moon") || strings.Contains(text, "Omega") || strings.Contains(text, "Vidmoly")) {
			decodedBytes, decodeErr := base64.StdEncoding.DecodeString(val)
			if decodeErr == nil {
				decodedString := string(decodedBytes)
				// Extract src="url"
				re := regexp.MustCompile(`src="([^"]+)"`)
				matches := re.FindStringSubmatch(decodedString)
				if len(matches) > 1 {
					foundServers[text] = matches[1]
				} else {
					foundServers[text] = decodedString // fallback if no src found
				}
			} else {
				fmt.Printf("Error decoding base64 for %s: %v\n", text, decodeErr)
			}
		}
	})

	for name, url := range foundServers {
		if strings.HasPrefix(url, "//") {
			url = "https:" + url
		}
		fmt.Printf("Found [%s]: %s\n", name, url)
	}

	if len(foundServers) == 0 {
		fmt.Println("No Moon or Omega servers found.")
	}
}
