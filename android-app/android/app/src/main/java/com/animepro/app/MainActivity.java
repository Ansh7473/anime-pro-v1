package com.animepro.app;

import android.app.DownloadManager;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.JavascriptInterface;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private FrameLayout fullscreenContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Make status bar transparent and enable Edge-to-Edge (immersive)
        Window window = getWindow();
        window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
        window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
        window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
        window.getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Configure WebView after bridge is initialized
        getBridge().getWebView().post(() -> {
            WebView webView = getBridge().getWebView();
            WebSettings settings = webView.getSettings();

            // Enable all features needed for video players
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            settings.setAllowFileAccess(true);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // Set User-Agent to standard Chrome to avoid bot detection
            String defaultUA = settings.getUserAgentString();
            settings.setUserAgentString(defaultUA.replace("; wv", ""));

            // Expose native orientation control to JavaScript
            webView.addJavascriptInterface(new OrientationBridge(), "AndroidRotation");

            // Handle file downloads from WebView
            webView.setDownloadListener(new DownloadListener() {
                @Override
                public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                    try {
                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        
                        // Get cookies for the URL to handle authenticated downloads
                        String cookies = CookieManager.getInstance().getCookie(url);
                        request.addRequestHeader("Cookie", cookies);
                        request.addRequestHeader("User-Agent", userAgent);
                        
                        request.setDescription("Downloading file...");
                        request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype));
                        request.allowScanningByMediaScanner();
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, URLUtil.guessFileName(url, contentDisposition, mimetype));
                        
                        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            Toast.makeText(getApplicationContext(), "Download starting...", Toast.LENGTH_SHORT).show();
                        }
                    } catch (Exception e) {
                        Toast.makeText(getApplicationContext(), "Download failed: " + e.getMessage(), Toast.LENGTH_LONG).show();
                    }
                }
            });

            // Enable fullscreen video playback
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onShowCustomView(View view, CustomViewCallback callback) {
                    if (customView != null) {
                        callback.onCustomViewHidden();
                        return;
                    }
                    customView = view;
                    customViewCallback = callback;

                    // Force landscape for video fullscreen
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);

                    // Create fullscreen container
                    fullscreenContainer = new FrameLayout(MainActivity.this);
                    fullscreenContainer.setBackgroundColor(0xFF000000);
                    fullscreenContainer.addView(customView);

                    // Add to window
                    ((FrameLayout) getWindow().getDecorView())
                            .addView(fullscreenContainer,
                                    new FrameLayout.LayoutParams(
                                            FrameLayout.LayoutParams.MATCH_PARENT,
                                            FrameLayout.LayoutParams.MATCH_PARENT));

                    // Hide system UI for true fullscreen
                    getWindow().getDecorView().setSystemUiVisibility(
                            View.SYSTEM_UI_FLAG_FULLSCREEN
                                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);

                    webView.setVisibility(View.GONE);
                }

                @Override
                public void onHideCustomView() {
                    if (customView == null) return;

                    webView.setVisibility(View.VISIBLE);

                    // Remove fullscreen view
                    if (fullscreenContainer != null) {
                        ((FrameLayout) getWindow().getDecorView())
                                .removeView(fullscreenContainer);
                        fullscreenContainer = null;
                    }

                    customView = null;
                    if (customViewCallback != null) {
                        customViewCallback.onCustomViewHidden();
                        customViewCallback = null;
                    }

                    // Restore orientation to auto
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);

                    // Restore system UI
                    getWindow().getDecorView().setSystemUiVisibility(
                            View.SYSTEM_UI_FLAG_VISIBLE);
                }
            });
        });
    }

    // JavaScript interface for native orientation control from web code
    private class OrientationBridge {
        @JavascriptInterface
        public void lockLandscape() {
            runOnUiThread(() ->
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE)
            );
        }

        @JavascriptInterface
        public void lockPortrait() {
            runOnUiThread(() ->
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT)
            );
        }

        @JavascriptInterface
        public void unlock() {
            runOnUiThread(() ->
                setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED)
            );
        }
    }

    @Override
    public void onBackPressed() {
        // Handle back from fullscreen video
        if (customView != null) {
            WebView webView = getBridge().getWebView();
            webView.getWebChromeClient().onHideCustomView();
            return;
        }

        // Handle WebView back navigation
        WebView webView = getBridge().getWebView();
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
