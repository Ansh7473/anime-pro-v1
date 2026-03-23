/**
 * AnimeLok Website/API Endpoint Checker
 * Tests all patterns used by https://animelok.site
 * 
 * AnimeLok is primarily an SSR site - it doesn't have a public REST API.
 * This script tests the HTML pages and any internal API endpoints.
 * 
 * Run with: npx tsx scripts/check_animelok_api.ts
 */

const BASE_URL = "https://animelok.site";
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface EndpointResult {
    endpoint: string;
    type: "page" | "api" | "ajax";
    status: "success" | "error" | "timeout";
    statusCode?: number;
    responseType?: string;
    dataPreview?: string;
    error?: string;
    duration: number;
}

const results: EndpointResult[] = [];

async function testEndpoint(path: string, type: "page" | "api" | "ajax" = "page"): Promise<EndpointResult> {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();
    
    console.log(`\n🔍 Testing [${type.toUpperCase()}]: ${path}`);
    
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        
        const headers: Record<string, string> = {
            "User-Agent": USER_AGENT,
            "Referer": `${BASE_URL}/`,
            "Origin": BASE_URL,
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": type === "page" ? "document" : "empty",
            "Sec-Fetch-Mode": type === "page" ? "navigate" : "cors",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
        };
        
        if (type === "api" || type === "ajax") {
            headers["Accept"] = "application/json, text/plain, */*";
            headers["X-Requested-With"] = "XMLHttpRequest";
            headers["Content-Type"] = "application/json";
        } else {
            headers["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8";
        }
        
        const response = await fetch(url, {
            headers,
            signal: controller.signal,
            credentials: "include",
        });
        
        clearTimeout(timeout);
        const duration = Date.now() - start;
        
        const contentType = response.headers.get("content-type") || "unknown";
        let text = await response.text();
        
        let dataPreview = "";
        
        // Check if it's JSON
        if (contentType.includes("json") || text.trim().startsWith("{") || text.trim().startsWith("[")) {
            try {
                // Handle dirty JSON prefix (B0AdSERP pattern)
                let jsonText = text;
                if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) {
                    const firstBrace = text.indexOf('{');
                    const firstBracket = text.indexOf('[');
                    const startIdx = Math.min(
                        firstBrace === -1 ? Infinity : firstBrace,
                        firstBracket === -1 ? Infinity : firstBracket
                    );
                    if (startIdx !== Infinity) {
                        jsonText = text.substring(startIdx);
                    }
                }
                const json = JSON.parse(jsonText);
                if (Array.isArray(json)) {
                    dataPreview = `JSON Array[${json.length}]`;
                    if (json[0]) dataPreview += ` - Keys: ${Object.keys(json[0]).slice(0, 5).join(", ")}`;
                } else if (typeof json === "object") {
                    const keys = Object.keys(json);
                    dataPreview = `JSON Object{${keys.slice(0, 8).join(", ")}${keys.length > 8 ? "..." : ""}}`;
                }
            } catch {
                dataPreview = `Raw: ${text.substring(0, 80)}...`;
            }
        } else if (contentType.includes("html")) {
            // Extract title from HTML
            const titleMatch = text.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "No title";
            
            // Count anime links
            const animeLinks = (text.match(/href="\/anime\//g) || []).length;
            const watchLinks = (text.match(/href="\/watch\//g) || []).length;
            
            dataPreview = `HTML: "${title}" (${animeLinks} anime links, ${watchLinks} watch links)`;
        } else {
            dataPreview = `${contentType}: ${text.length} bytes`;
        }
        
        const result: EndpointResult = {
            endpoint: path,
            type,
            status: response.ok ? "success" : "error",
            statusCode: response.status,
            responseType: contentType.split(";")[0],
            dataPreview,
            duration,
        };
        
        if (response.ok) {
            console.log(`   ✅ ${response.status} - ${duration}ms`);
            console.log(`   📦 ${dataPreview}`);
        } else {
            console.log(`   ❌ ${response.status} - ${duration}ms`);
        }
        
        return result;
    } catch (error: any) {
        const duration = Date.now() - start;
        const isTimeout = error.name === "AbortError";
        
        console.log(`   ⚠️ ${isTimeout ? "TIMEOUT" : "ERROR"}: ${error.message}`);
        
        return {
            endpoint: path,
            type,
            status: isTimeout ? "timeout" : "error",
            error: error.message,
            duration,
        };
    }
}

async function main() {
    console.log("╔════════════════════════════════════════════════════════════╗");
    console.log("║           AnimeLok Endpoint Checker                        ║");
    console.log("║           https://animelok.site                            ║");
    console.log("╚════════════════════════════════════════════════════════════╝");
    
    // Test SSR Pages (HTML)
    console.log("\n\n📄 TESTING HTML PAGES");
    console.log("═══════════════════════════════════════════════════════════════");
    
    const pages = [
        "/",
        "/home",
        "/search?keyword=naruto",
        "/search?keyword=one+piece",
        "/schedule",
        "/anime/naruto-20",
        "/anime/one-piece-21", 
        "/anime/solo-leveling-178516",
        "/anime/jujutsu-kaisen-113415",
        "/watch/naruto-20",
        "/watch/one-piece-21?ep=1",
        "/watch/solo-leveling-178516?ep=1",
        "/genres",
        "/genre/action",
        "/movies",
        "/recently-updated",
        "/popular",
        "/trending",
    ];
    
    for (const page of pages) {
        const result = await testEndpoint(page, "page");
        results.push(result);
        await new Promise(r => setTimeout(r, 500));
    }
    
    // Test potential AJAX/API endpoints
    console.log("\n\n🔌 TESTING AJAX/API ENDPOINTS");
    console.log("═══════════════════════════════════════════════════════════════");
    
    const apiEndpoints = [
        // Common API patterns
        "/api",
        "/api/",
        "/api/v1",
        "/api/v2",
        "/api/search?keyword=naruto",
        "/api/search?q=naruto",
        "/api/anime/naruto-20",
        "/api/anime/20",
        "/api/episodes/naruto-20",
        "/api/episodes/20",
        "/api/sources",
        "/api/sources/naruto-20",
        "/api/watch/naruto-20",
        "/api/stream/naruto-20",
        "/api/home",
        "/api/trending",
        "/api/schedule",
        
        // Next.js patterns
        "/_next/data",
        "/_next/static",
        
        // GraphQL/TRPC
        "/graphql",
        "/trpc",
        
        // Alternative API paths
        "/ajax",
        "/ajax/search",
        "/ajax/anime",
        "/data",
        "/data/anime",
        "/json",
        "/json/anime",
        
        // With specific IDs
        "/api/info/20",
        "/api/info/naruto-20",
        "/api/details/naruto-20",
        "/api/player/naruto-20",
        "/api/embed/naruto-20",
        
        // Anilist ID patterns
        "/api/anilist/20",
        "/api/mal/20",
    ];
    
    for (const endpoint of apiEndpoints) {
        const result = await testEndpoint(endpoint, "api");
        results.push(result);
        await new Promise(r => setTimeout(r, 300));
    }
    
    // Summary
    console.log("\n\n═══════════════════════════════════════════════════════════════");
    console.log("                         SUMMARY                                ");
    console.log("═══════════════════════════════════════════════════════════════\n");
    
    const successful = results.filter(r => r.status === "success");
    const failed = results.filter(r => r.status === "error");
    const timeouts = results.filter(r => r.status === "timeout");
    
    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log(`⏱️ Timeouts: ${timeouts.length}`);
    
    if (successful.length > 0) {
        console.log("\n📗 Working Endpoints:");
        console.log("─────────────────────");
        
        const pages = successful.filter(r => r.type === "page");
        const apis = successful.filter(r => r.type !== "page");
        
        if (pages.length > 0) {
            console.log("\n  📄 HTML Pages:");
            for (const r of pages) {
                console.log(`     ${r.statusCode} ${r.endpoint} (${r.duration}ms)`);
                if (r.dataPreview) console.log(`        └─ ${r.dataPreview}`);
            }
        }
        
        if (apis.length > 0) {
            console.log("\n  🔌 API/AJAX Endpoints:");
            for (const r of apis) {
                console.log(`     ${r.statusCode} ${r.endpoint} (${r.duration}ms)`);
                if (r.dataPreview) console.log(`        └─ ${r.dataPreview}`);
            }
        }
    }
    
    if (failed.length > 0) {
        console.log("\n📕 Failed/404 Endpoints:");
        console.log("────────────────────────");
        for (const r of failed) {
            console.log(`  ${r.statusCode || "ERR"} ${r.endpoint}`);
        }
    }
    
    // Output structured findings
    console.log("\n\n📊 Structured Results:");
    console.log(JSON.stringify({
        working: successful.map(r => ({ endpoint: r.endpoint, type: r.type, preview: r.dataPreview })),
        failed: failed.map(r => ({ endpoint: r.endpoint, status: r.statusCode })),
        summary: {
            total: results.length,
            success: successful.length,
            failed: failed.length,
            timeout: timeouts.length
        }
    }, null, 2));
}

main().catch(console.error);
