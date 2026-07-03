# WatchAnimez — Premium Anime Streaming Platform

<div align="center">

[![Svelte](https://img.shields.io/badge/Svelte%205-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)](https://svelte.dev)
[![Go](https://img.shields.io/badge/Go%201.21-00ADD8?style=for-the-badge&logo=go&logoColor=white)](https://go.dev)
[![Capacitor](https://img.shields.io/badge/Capacitor%206-119EFF?style=for-the-badge&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![Electron](https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white)](https://electronjs.com)

**[Live Site →](https://watchanimez.me)** · **[Report Bug](https://github.com/Ansh7473/anime-pro-v1/issues)** · **[Request Feature](https://github.com/Ansh7473/anime-pro-v1/issues)**

</div>

---

## Overview

**WatchAnimez** is a modern, open-source anime streaming platform built for speed, accessibility, and a seamless experience across web, mobile, and desktop. Featuring parallel streaming, cross-device sync, and a clean responsive design, it delivers a premium viewing experience on any device.

---

## Features

### ⚡ Fast Streaming
- **Parallel Source Loading**: Queries multiple providers simultaneously and starts playback from the fastest available source
- **Smart Auto-Selection**: Automatically picks your preferred language (Sub/Dub/Multi) from the best provider
- **Background Loading**: Additional sources load in the background without interrupting playback

### 📱 Cross-Platform Apps
- **Web**: Full-featured responsive web app built with SvelteKit
- **Android**: Native app with offline downloads and background playback
- **Windows Desktop**: Electron-based desktop app with system tray support
- **Android TV**: Leanback UI optimized for TV screens and remote control navigation

### 🎨 Modern UI
- **Clean Design**: Professional, accessible interface with smooth animations
- **Theme System**: 80+ customizable color themes
- **Responsive**: Optimized for mobile, tablet, desktop, and TV screens
- **Dark Mode**: Full dark theme with smooth transitions

### 👤 Account Management
- **Multi-Profile**: Create multiple profiles under one account with custom avatars
- **Cross-Device Sync**: Watchlist, favorites, and viewing history sync across all devices
- **Watch History**: Detailed viewing history with progress tracking
- **Personalized Recommendations**: AI-powered anime suggestions based on your taste

### 📊 Browse & Discover
- **Smart Search**: Instant search with autocomplete and poster previews
- **Categories**: Browse by trending, popular, top-rated, seasonal, upcoming, and genre
- **Release Schedule**: Weekly airing schedule with day-by-day view
- **Anime Details**: Rich detail pages with synopsis, ratings, episodes, and recommendations

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | SvelteKit (Svelte 5), Vite, CSS |
| **Backend** | Go (Gin) private, PostgreSQL, JWT Auth |
| **Mobile** | Capacitor 6 (Android), Java (Native Bridge) |
| **Desktop** | Electron JS |
| **TV** | Flutter |
| **Streaming** | HLS.js, Video.js |
| **Hosting** | Cloudflare Workers, Vercel |

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Go](https://go.dev/) 1.21+

### 1. Backend
```bash
cd backend-go
go mod download
go run main.go
```

### 2. Frontend
```bash
cd sveltekit-frontend
npm install
npm run dev
```

### 3. Mobile (Android)
1. Install [Android Studio](https://developer.android.com/studio)
2. Open the `android-app` directory
3. Build and run on your device or emulator

---

## Project Structure

```
anime-pro-v1/
├── sveltekit-frontend/   # Web frontend (SvelteKit)
├── backend-go/           # API backend (Go)
├── android-app/          # Native Android app
├── desktop-app/          # Electron desktop app
├── anime_pro_tv/         # TV app (Flutter)
└── docs/                 # Documentation
```

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** the repository
2. Create a **feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

Please make sure your code follows the existing style and includes appropriate tests.

---

## License

This project is open source. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <b>Made with ❤️ for the anime community</b><br>
  <a href="https://watchanimez.me">watchanimez.me</a>
</p>
