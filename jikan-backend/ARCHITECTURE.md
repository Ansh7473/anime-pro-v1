# Jikan Streaming Platform Architecture

## Overview
This is a standalone anime streaming platform built around the Jikan API (MyAnimeList). The platform consists of two main components:
1. **Jikan Backend** - A proxy server for Jikan API with rate limiting and caching
2. **Jikan Frontend** - A React/TypeScript application for browsing and discovering anime

## Architecture Diagram
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Jikan         │     │   Jikan         │     │   MyAnimeList   │
│   Frontend      │────▶│   Backend       │────▶│   (Jikan API)   │
│   (React)       │     │   (Proxy)       │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│   User          │     │   Rate Limiting │
│   Browser       │     │   & Caching     │
└─────────────────┘     └─────────────────┘
```

## Component Details

### 1. Jikan Backend (`jikan-backend/`)
A standalone Node.js/TypeScript backend that acts as a proxy for the Jikan API.

#### Features:
- **Rate Limiting**: Enforces Jikan API limits (3 requests/second, 60 requests/minute)
- **CORS Support**: Configured for frontend access
- **Error Handling**: Comprehensive error handling with proper HTTP status codes
- **Health Checks**: Endpoint to monitor API availability
- **Logging**: Request logging for debugging

#### API Endpoints:
- `GET /api/v1/jikan/anime/:id` - Get anime by MAL ID (full details)
- `GET /api/v1/jikan/anime/:id/basic` - Get anime by MAL ID (basic details)
- `GET /api/v1/jikan/search?q={query}` - Search anime
- `GET /api/v1/jikan/seasonal/:year?/:season?` - Get seasonal anime
- `GET /api/v1/jikan/top` - Get top anime lists
- `GET /api/v1/jikan/anime/:id/recommendations` - Get recommendations
- `GET /api/v1/jikan/anime/:id/characters` - Get character list
- `GET /api/v1/jikan/anime/:id/episodes` - Get episode list
- `GET /api/v1/jikan/health` - Health check
- `GET /` - API documentation

#### Technical Stack:
- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (lightweight HTTP framework)
- **Build Tool**: tsx for development, tsc for production
- **Port**: 3001 (configurable via PORT environment variable)

### 2. Jikan Frontend (`jikan-frontend/`)
A React/TypeScript frontend application for browsing anime using Jikan data.

#### Planned Features:
- **Anime Discovery**: Browse top, seasonal, and recommended anime
- **Search Functionality**: Search anime by title with instant results
- **Anime Details**: View comprehensive anime information
- **Responsive Design**: Mobile-friendly interface
- **Dark/Light Theme**: User preference support

#### Technical Stack:
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: React Query for API data
- **Routing**: React Router

## Data Flow

### Search Flow:
1. User enters search query in frontend
2. Frontend calls `/api/v1/jikan/search?q={query}`
3. Backend forwards request to Jikan API with rate limiting
4. Backend returns results to frontend
5. Frontend displays anime cards with images, scores, and details

### Anime Details Flow:
1. User clicks on anime card
2. Frontend calls `/api/v1/jikan/anime/:id`
3. Backend fetches full anime details from Jikan API
4. Backend returns comprehensive data (synopsis, scores, characters, etc.)
5. Frontend displays detailed anime page

## Deployment

### Backend Deployment:
```bash
# Build
cd jikan-backend
npm run build

# Start production server
npm start

# Environment variables
PORT=3001  # Optional, defaults to 3001
```

### Frontend Deployment:
```bash
# Build
cd jikan-frontend
npm run build

# The built files can be served by any static file server
# or deployed to Vercel/Netlify
```

## Development Setup

### Backend:
```bash
cd jikan-backend
npm install
npm run dev  # Starts server on http://localhost:3001
```

### Frontend:
```bash
cd jikan-frontend
npm install
npm run dev  # Starts dev server on http://localhost:5173
```

## Configuration

### Backend Configuration:
- **Rate Limits**: Configured in `src/routes/jikan.ts`
- **CORS Origins**: Configured in `src/server.ts`
- **Port**: Configurable via PORT environment variable

### Frontend Configuration:
- **API Base URL**: Configured in API client
- **Theme**: Configurable theme settings
- **Cache Duration**: Configurable data caching

## Testing

### Backend Tests:
```bash
cd jikan-backend
npm test  # Runs Jikan API integration tests
```

### Test Coverage:
- API endpoint functionality
- Rate limiting behavior
- Error handling
- CORS configuration

## Future Enhancements

### Phase 1 (Immediate):
- [ ] Implement frontend application
- [ ] Add caching layer (Redis) for better performance
- [ ] Implement user authentication
- [ ] Add anime watchlist functionality

### Phase 2 (Short-term):
- [ ] Implement recommendation engine
- [ ] Add user reviews and ratings
- [ ] Implement anime tracking (watch status)
- [ ] Add social features (sharing, comments)

### Phase 3 (Long-term):
- [ ] Mobile app (React Native)
- [ ] Advanced search filters
- [ ] Personalized recommendations
- [ ] Integration with streaming services

## Monitoring & Maintenance

### Health Checks:
- Backend health endpoint: `GET /health`
- Jikan API status monitoring
- Rate limit usage tracking

### Logging:
- Request logging for debugging
- Error logging for monitoring
- Performance metrics

### Scaling:
- Horizontal scaling for backend instances
- CDN for frontend assets
- Database for user data (future)

## Security Considerations

1. **Rate Limiting**: Prevents abuse of Jikan API
2. **CORS Configuration**: Restricts frontend origins
3. **Input Validation**: Validates all user inputs
4. **Error Handling**: Prevents information leakage
5. **Dependency Security**: Regular dependency updates

## Performance Optimization

1. **Caching**: Implement Redis caching for frequent requests
2. **CDN**: Use CDN for static assets
3. **Lazy Loading**: Implement lazy loading for images
4. **Code Splitting**: Split frontend code for faster loading
5. **Compression**: Enable gzip/brotli compression

## License
MIT License - Free to use and modify