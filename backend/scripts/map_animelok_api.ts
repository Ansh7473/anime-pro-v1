/**
 * AnimeLok API Endpoint Mapper
 * Discovers and maps all available API endpoints on animelok.site
 */

const BASE_URL = "https://animelok.site";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://animelok.site/",
  "Origin": "https://animelok.site",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
};

interface EndpointResult {
  path: string;
  method: string;
  status: number;
  contentType: string | null;
  contentLength: number;
  isJson: boolean;
  isHtml: boolean;
  sample?: string;
}

const discoveredEndpoints: EndpointResult[] = [];

// Common API endpoint patterns to test
const API_PATTERNS = [
  // Root API paths
  "/api",
  "/api/",
  "/api/v1",
  "/api/v2",
  
  // KNOWN WORKING - from existing scraper code
  "/api/anime/21/episodes-range?page=0&lang=JAPANESE&pageSize=10",
  "/api/anime/21/episodes-range?page=0&lang=ENGLISH&pageSize=10",
  "/api/anime/21/episodes/1",
  "/api/anime/21/episodes/1?lang=sub",
  "/api/anime/21/episodes/1?lang=dub",
  "/api/comments",
  
  // Home/Landing
  "/api/home",
  "/api/index",
  "/api/featured",
  "/api/spotlight",
  "/api/banner",
  "/api/slider",
  "/api/carousel",
  
  // Anime related
  "/api/anime",
  "/api/animes",
  "/api/anime/list",
  "/api/anime/all",
  "/api/anime/popular",
  "/api/anime/trending",
  "/api/anime/latest",
  "/api/anime/recent",
  "/api/anime/new",
  "/api/anime/top",
  "/api/anime/top-airing",
  "/api/anime/top-rated",
  "/api/anime/most-watched",
  "/api/anime/most-popular",
  "/api/anime/completed",
  "/api/anime/ongoing",
  "/api/anime/upcoming",
  
  // Episodes
  "/api/episodes",
  "/api/episode",
  "/api/episodes/latest",
  "/api/episodes/recent",
  "/api/recent-episodes",
  "/api/latest-episodes",
  
  // Search
  "/api/search",
  "/api/search?q=naruto",
  "/api/search?keyword=naruto",
  "/api/search?query=naruto",
  "/api/filter",
  "/api/filters",
  "/api/advanced-search",
  
  // Categories/Genres
  "/api/genres",
  "/api/genre",
  "/api/categories",
  "/api/category",
  "/api/tags",
  "/api/types",
  
  // Schedule
  "/api/schedule",
  "/api/calendar",
  "/api/airing",
  "/api/airing-schedule",
  "/api/release-schedule",
  
  // Movies
  "/api/movies",
  "/api/movie",
  "/api/films",
  
  // Series/TV
  "/api/series",
  "/api/tv",
  "/api/shows",
  
  // OVA/ONA/Special
  "/api/ova",
  "/api/ona",
  "/api/special",
  "/api/specials",
  
  // Seasons
  "/api/seasons",
  "/api/season",
  "/api/season/winter",
  "/api/season/spring",
  "/api/season/summer",
  "/api/season/fall",
  "/api/season/2024",
  "/api/season/2025",
  
  // Streaming/Sources
  "/api/stream",
  "/api/sources",
  "/api/servers",
  "/api/watch",
  "/api/embed",
  "/api/player",
  "/api/video",
  
  // User related
  "/api/user",
  "/api/users",
  "/api/auth",
  "/api/login",
  "/api/register",
  "/api/profile",
  "/api/watchlist",
  "/api/favorites",
  "/api/history",
  "/api/bookmarks",
  
  // Comments/Reviews
  "/api/comments",
  "/api/reviews",
  "/api/ratings",
  
  // Random/Suggestions
  "/api/random",
  "/api/suggestions",
  "/api/recommendations",
  "/api/similar",
  "/api/related",
  
  // Stats/Info
  "/api/stats",
  "/api/statistics",
  "/api/info",
  "/api/status",
  "/api/health",
  "/api/version",
  "/api/config",
  
  // Next.js internal APIs
  "/_next/data",
  "/api/revalidate",
  "/api/preview",
  "/api/exit-preview",
  
  // Test with specific anime IDs/slugs (common patterns)
  "/api/anime/1",
  "/api/anime/100",
  "/api/anime/naruto",
  "/api/anime/one-piece",
  "/api/anime/1/episodes",
  "/api/anime/1/episodes/1",
  "/api/anime/naruto/episodes",
  "/api/anime/naruto/episodes/1",
  
  // Alternative patterns
  "/api/v1/anime",
  "/api/v1/home",
  "/api/v1/search",
  "/api/v1/genres",
  
  // GraphQL
  "/api/graphql",
  "/graphql",
  
  // Sitemap/Feed
  "/api/sitemap",
  "/api/feed",
  "/api/rss",
];

// Additional dynamic patterns to try with sample values
const DYNAMIC_PATTERNS = [
  { pattern: "/api/anime/{id}", samples: ["1", "100", "1000", "naruto", "one-piece", "attack-on-titan"] },
  { pattern: "/api/anime/{id}/episodes", samples: ["1", "100", "naruto"] },
  { pattern: "/api/anime/{id}/episodes/{ep}", samples: [["1", "1"], ["100", "1"], ["naruto", "1"]] },
  { pattern: "/api/genre/{genre}", samples: ["action", "adventure", "comedy", "drama", "fantasy", "romance", "sci-fi", "horror"] },
  { pattern: "/api/search/{query}", samples: ["naruto", "one", "attack"] },
  { pattern: "/api/watch/{id}", samples: ["1", "naruto", "naruto-1"] },
  { pattern: "/api/stream/{id}", samples: ["1", "100", "naruto"] },
  { pattern: "/api/episode/{id}", samples: ["1", "100", "1000"] },
];

async function testEndpoint(path: string, method: string = "GET"): Promise<EndpointResult | null> {
  const url = `${BASE_URL}${path}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(url, {
      method,
      headers: HEADERS,
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const isHtml = contentType.includes("text/html");
    
    let text = "";
    let sample = "";
    
    try {
      text = await response.text();
      sample = text.substring(0, 500);
    } catch {
      // Ignore read errors
    }
    
    // Check if it's a real API response or just a 404 HTML page
    const is404Page = isHtml && (
      text.includes("404") || 
      text.includes("not found") || 
      text.includes("Lost in the Digital")
    );
    
    const result: EndpointResult = {
      path,
      method,
      status: response.status,
      contentType,
      contentLength: text.length,
      isJson,
      isHtml,
      sample: is404Page ? "[404 HTML Page]" : sample,
    };
    
    return result;
  } catch (error: any) {
    if (error.name === "AbortError") {
      return {
        path,
        method,
        status: 0,
        contentType: null,
        contentLength: 0,
        isJson: false,
        isHtml: false,
        sample: "[Timeout]",
      };
    }
    return null;
  }
}

async function testDynamicEndpoints(): Promise<void> {
  console.log("\n🔄 Testing dynamic endpoint patterns...\n");
  
  for (const { pattern, samples } of DYNAMIC_PATTERNS) {
    for (const sample of samples) {
      let path: string;
      
      if (Array.isArray(sample)) {
        // Multi-parameter pattern
        path = pattern;
        for (const s of sample) {
          path = path.replace(/\{[^}]+\}/, s);
        }
      } else {
        path = pattern.replace(/\{[^}]+\}/, sample);
      }
      
      // Skip if already tested
      if (discoveredEndpoints.some(e => e.path === path)) continue;
      
      const result = await testEndpoint(path);
      if (result) {
        discoveredEndpoints.push(result);
        
        const icon = result.status >= 200 && result.status < 300 ? "✅" : 
                     result.status >= 300 && result.status < 400 ? "🔄" : 
                     result.status >= 400 && result.status < 500 ? "❌" : "⚠️";
        
        console.log(`${icon} [${result.status}] ${path} - ${result.contentType || "unknown"} (${result.contentLength} bytes)`);
        
        if (result.isJson && result.status === 200) {
          console.log(`   📦 JSON Response: ${result.sample?.substring(0, 200)}...`);
        }
      }
    }
  }
}

async function mapApiEndpoints(): Promise<void> {
  console.log("🗺️  AnimeLok API Endpoint Mapper");
  console.log("=".repeat(60));
  console.log(`\n📍 Target: ${BASE_URL}`);
  console.log(`📊 Testing ${API_PATTERNS.length} static patterns + ${DYNAMIC_PATTERNS.length} dynamic patterns\n`);
  console.log("=".repeat(60));
  
  // Test static patterns
  console.log("\n🔍 Testing static API patterns...\n");
  
  let tested = 0;
  const batchSize = 5;
  
  for (let i = 0; i < API_PATTERNS.length; i += batchSize) {
    const batch = API_PATTERNS.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(path => testEndpoint(path)));
    
    for (const result of results) {
      if (result) {
        discoveredEndpoints.push(result);
        
        const icon = result.status >= 200 && result.status < 300 ? "✅" : 
                     result.status >= 300 && result.status < 400 ? "🔄" : 
                     result.status >= 400 && result.status < 500 ? "❌" : "⚠️";
        
        console.log(`${icon} [${result.status}] ${result.path} - ${result.contentType || "unknown"} (${result.contentLength} bytes)`);
        
        // If we found a JSON response, show a preview
        if (result.isJson && result.status === 200) {
          console.log(`   📦 JSON Response: ${result.sample?.substring(0, 200)}...`);
        }
      }
      tested++;
    }
    
    // Small delay between batches to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Test dynamic patterns
  await testDynamicEndpoints();
  
  // Generate report
  console.log("\n" + "=".repeat(60));
  console.log("📊 ENDPOINT MAPPING REPORT");
  console.log("=".repeat(60));
  
  // Categorize results
  const successful = discoveredEndpoints.filter(e => e.status >= 200 && e.status < 300);
  const redirects = discoveredEndpoints.filter(e => e.status >= 300 && e.status < 400);
  const clientErrors = discoveredEndpoints.filter(e => e.status >= 400 && e.status < 500);
  const serverErrors = discoveredEndpoints.filter(e => e.status >= 500);
  const jsonEndpoints = discoveredEndpoints.filter(e => e.isJson && e.status === 200);
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total tested: ${discoveredEndpoints.length}`);
  console.log(`   ✅ Successful (2xx): ${successful.length}`);
  console.log(`   🔄 Redirects (3xx): ${redirects.length}`);
  console.log(`   ❌ Client errors (4xx): ${clientErrors.length}`);
  console.log(`   ⚠️ Server errors (5xx): ${serverErrors.length}`);
  console.log(`   📦 JSON endpoints: ${jsonEndpoints.length}`);
  
  if (successful.length > 0) {
    console.log(`\n✅ WORKING ENDPOINTS (2xx):`);
    for (const ep of successful) {
      const type = ep.isJson ? "JSON" : ep.isHtml ? "HTML" : "OTHER";
      console.log(`   [${ep.status}] ${ep.path} - ${type} (${ep.contentLength} bytes)`);
    }
  }
  
  if (jsonEndpoints.length > 0) {
    console.log(`\n📦 JSON API ENDPOINTS:`);
    for (const ep of jsonEndpoints) {
      console.log(`   ${ep.path}`);
      console.log(`      Preview: ${ep.sample?.substring(0, 150)}...`);
    }
  }
  
  if (redirects.length > 0) {
    console.log(`\n🔄 REDIRECT ENDPOINTS (3xx):`);
    for (const ep of redirects) {
      console.log(`   [${ep.status}] ${ep.path}`);
    }
  }
  
  // Output as JSON for further processing
  console.log("\n" + "=".repeat(60));
  console.log("📄 Full results saved to: animelok_api_map.json");
  
  const report = {
    timestamp: new Date().toISOString(),
    target: BASE_URL,
    summary: {
      total: discoveredEndpoints.length,
      successful: successful.length,
      redirects: redirects.length,
      clientErrors: clientErrors.length,
      serverErrors: serverErrors.length,
      jsonEndpoints: jsonEndpoints.length,
    },
    workingEndpoints: successful.map(e => ({
      path: e.path,
      type: e.isJson ? "JSON" : e.isHtml ? "HTML" : "OTHER",
      size: e.contentLength,
    })),
    jsonEndpoints: jsonEndpoints.map(e => ({
      path: e.path,
      size: e.contentLength,
      preview: e.sample?.substring(0, 500),
    })),
    allResults: discoveredEndpoints,
  };
  
  const fs = await import("fs/promises");
  await fs.writeFile("animelok_api_map.json", JSON.stringify(report, null, 2));
  
  console.log("\n✨ Mapping complete!");
}

// Run the mapper
mapApiEndpoints().catch(console.error);
