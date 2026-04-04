package providers

import (
	"bufio"
	"context"
	"crypto/tls"
	"encoding/base64"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	utls "github.com/refraction-networking/utls"
)

// chromeTLSDialer creates a connection that mimics Chrome's TLS fingerprint
// This defeats JA3 fingerprinting that blocks Go's default TLS stack
func chromeTLSDialer(ctx context.Context, network, addr string) (net.Conn, error) {
	// Parse host from addr
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		host = addr
	}

	// Establish raw TCP connection
	dialer := net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.DialContext(ctx, network, addr)
	if err != nil {
		return nil, err
	}

	// Wrap with uTLS using Chrome's fingerprint
	tlsConn := utls.UClient(conn, &utls.Config{
		ServerName:         host,
		InsecureSkipVerify: false,
	}, utls.HelloChrome_Auto)

	if err := tlsConn.Handshake(); err != nil {
		conn.Close()
		return nil, err
	}

	return tlsConn, nil
}

// createChromeHTTPClient creates an HTTP client with Chrome TLS fingerprint
func createChromeHTTPClient() *http.Client {
	jar, _ := cookiejar.New(nil)

	transport := &http.Transport{
		DialTLSContext: chromeTLSDialer,
		// Fallback for non-TLS (shouldn't be used for HTTPS, but needed for interface)
		DialContext: (&net.Dialer{
			Timeout:   10 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		MaxIdleConns:        100,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false,
		},
		// Disable HTTP/2 to better mimic standard browser behavior on some sites
		ForceAttemptHTTP2: false,
	}

	return &http.Client{
		Jar:       jar,
		Timeout:   15 * time.Second,
		Transport: transport,
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
}

// fetchWithChromeTLS makes an HTTP GET request mimicking Chrome's TLS fingerprint
func fetchWithChromeTLS(targetURL string) (*http.Response, error) {
	// Parse the URL to get the host for the TLS handshake
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %v", err)
	}

	host := parsedURL.Hostname()
	port := parsedURL.Port()
	if port == "" {
		if parsedURL.Scheme == "https" {
			port = "443"
		} else {
			port = "80"
		}
	}
	addr := net.JoinHostPort(host, port)

	// Establish raw TCP connection
	dialer := net.Dialer{Timeout: 10 * time.Second}
	conn, err := dialer.Dial("tcp", addr)
	if err != nil {
		return nil, fmt.Errorf("TCP dial error: %v", err)
	}

	// Wrap with uTLS using Chrome Auto fingerprint
	tlsConn := utls.UClient(conn, &utls.Config{
		ServerName: host,
	}, utls.HelloChrome_Auto)

	if err := tlsConn.Handshake(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("TLS handshake error: %v", err)
	}

	// Build the HTTP request manually
	reqPath := parsedURL.RequestURI()
	httpReq := fmt.Sprintf("GET %s HTTP/1.1\r\n", reqPath)
	httpReq += fmt.Sprintf("Host: %s\r\n", host)
	httpReq += "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36\r\n"
	httpReq += "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7\r\n"
	httpReq += "Accept-Language: en-US,en;q=0.9\r\n"
	httpReq += "Accept-Encoding: identity\r\n"
	httpReq += "Sec-Ch-Ua: \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"\r\n"
	httpReq += "Sec-Ch-Ua-Mobile: ?0\r\n"
	httpReq += "Sec-Ch-Ua-Platform: \"Windows\"\r\n"
	httpReq += "Sec-Fetch-Dest: document\r\n"
	httpReq += "Sec-Fetch-Mode: navigate\r\n"
	httpReq += "Sec-Fetch-Site: same-origin\r\n"
	httpReq += "Sec-Fetch-User: ?1\r\n"
	httpReq += "Upgrade-Insecure-Requests: 1\r\n"
	httpReq += fmt.Sprintf("Referer: https://%s/\r\n", host)
	httpReq += "Priority: u=0, i\r\n"
	httpReq += "Connection: keep-alive\r\n"
	httpReq += "\r\n"

	_, err = tlsConn.Write([]byte(httpReq))
	if err != nil {
		tlsConn.Close()
		return nil, fmt.Errorf("write error: %v", err)
	}

	// Read the response
	resp, err := http.ReadResponse(bufio.NewReader(tlsConn), nil)
	if err != nil {
		tlsConn.Close()
		return nil, fmt.Errorf("read response error: %v", err)
	}

	return resp, nil
}

// GetNineAnimeSources directly grabs Moon/Omega iframe URLs via goquery
// by trying to construct the 9anime URL from slug and episode number.
// Uses Chrome TLS fingerprinting to bypass JA3-based bot detection.
func GetNineAnimeSources(slug string, ep int) map[string]interface{} {
	// Try multiple URL patterns that 9anime uses
	urlPatterns := []string{
		fmt.Sprintf("https://9anime.org.lv/%s-episode-%d/", slug, ep),
		fmt.Sprintf("https://9anime.org.lv/%s-episode-%d", slug, ep),
	}

	for _, animeURL := range urlPatterns {
		log.Printf("[9anime] Trying URL with Chrome TLS: %s", animeURL)

		// Method 1: Use low-level Chrome TLS fingerprint
		resp, err := fetchWithChromeTLS(animeURL)
		if err != nil {
			log.Printf("[9anime] Chrome TLS request error for %s: %v", animeURL, err)

			// Method 2: Fallback to transport-level Chrome TLS client
			log.Printf("[9anime] Falling back to transport-level Chrome client for %s", animeURL)
			client := createChromeHTTPClient()
			req, reqErr := http.NewRequest("GET", animeURL, nil)
			if reqErr != nil {
				log.Printf("[9anime] Error creating fallback request: %v", reqErr)
				continue
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36")
			req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
			req.Header.Set("Accept-Language", "en-US,en;q=0.9")
			req.Header.Set("Accept-Encoding", "identity")
			req.Header.Set("Sec-Ch-Ua", `"Chromium";v="125", "Not.A/Brand";v="24"`)
			req.Header.Set("Sec-Ch-Ua-Mobile", "?0")
			req.Header.Set("Sec-Ch-Ua-Platform", `"Windows"`)
			req.Header.Set("Sec-Fetch-Dest", "document")
			req.Header.Set("Sec-Fetch-Mode", "navigate")
			req.Header.Set("Sec-Fetch-Site", "same-origin")
			req.Header.Set("Sec-Fetch-User", "?1")
			req.Header.Set("Upgrade-Insecure-Requests", "1")
			req.Header.Set("Referer", "https://9anime.org.lv/")
			req.Header.Set("Priority", "u=0, i")

			resp, err = client.Do(req)
			if err != nil {
				log.Printf("[9anime] Fallback request also failed for %s: %v", animeURL, err)
				continue
			}
		}
		defer resp.Body.Close()

		log.Printf("[9anime] Response status for %s: %d", animeURL, resp.StatusCode)

		// Handle redirects manually for the raw TLS approach
		if resp.StatusCode == 301 || resp.StatusCode == 302 || resp.StatusCode == 307 || resp.StatusCode == 308 {
			location := resp.Header.Get("Location")
			if location != "" {
				log.Printf("[9anime] Redirect to: %s", location)
				// Follow the redirect with Chrome TLS
				resp.Body.Close()
				resp, err = fetchWithChromeTLS(location)
				if err != nil {
					log.Printf("[9anime] Redirect fetch error: %v", err)
					continue
				}
				defer resp.Body.Close()
				log.Printf("[9anime] Redirect response status: %d", resp.StatusCode)
			}
		}

		if resp.StatusCode != http.StatusOK {
			// Read a snippet of the body for debugging
			bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 500))
			log.Printf("[9anime] Non-200 status (%d) for %s. Body preview: %s", resp.StatusCode, animeURL, string(bodyBytes))
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
						"isM3U8":   false,
						"isEmbed":  true,
						"server":   text,
						"provider": "9anime",
					})
					log.Printf("[9anime] Found source: [%s] %s", text, iframeUrl)
				} else {
					log.Printf("[9anime] Base64 decode error for %s: %v", text, decodeErr)
				}
			}
		})

		if len(sourcesList) > 0 {
			log.Printf("[9anime] SUCCESS: Found %d sources from %s", len(sourcesList), animeURL)
			return map[string]interface{}{
				"sources": sourcesList,
			}
		}

		// Debug: log what the page contains
		pageTitle := doc.Find("title").Text()
		log.Printf("[9anime] DEBUG: Page title='%s'", pageTitle)

		optionCount := 0
		doc.Find("select.mirror option").Each(func(i int, s *goquery.Selection) {
			optionCount++
			text := strings.TrimSpace(s.Text())
			log.Printf("[9anime] DEBUG: Option #%d: '%s'", i, text)
		})

		if optionCount == 0 {
			bodyText := doc.Find("body").Text()
			if strings.Contains(bodyText, "Cloudflare") || strings.Contains(bodyText, "challenge") || strings.Contains(bodyText, "captcha") {
				log.Printf("[9anime] WARNING: Cloudflare/captcha block detected for %s", animeURL)
			} else if strings.Contains(bodyText, "404") || strings.Contains(bodyText, "Not Found") {
				log.Printf("[9anime] Page returned 404 content for %s", animeURL)
			}
		}
	}

	log.Printf("[9anime] FAILED: No sources found for slug=%s ep=%d", slug, ep)
	return nil
}
