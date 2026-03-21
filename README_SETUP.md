# PoE Cluster Jewel Price Searcher

A modern React/TypeScript web application for searching and filtering Path of Exile cluster jewels with real-time pricing data from the official PoE Trade API.

## Features

✨ **Real-time Price Data** — Fetches current cluster jewel prices from the Path of Exile Trade API  
🔍 **Advanced Filtering** — Filter by cluster type, price range, item level, and available stats  
📊 **Sortable Results** — Sort results by price, item level, or name  
⚡ **Fast & Responsive** — Built with React, TypeScript, and Tailwind CSS  
🔐 **CORS-Free** — Uses Node.js Express proxy to avoid browser CORS restrictions  
💾 **Zustand State Management** — Lightweight and performant state management  

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend Proxy**: Express.js (Node.js)
- **HTTP Client**: Axios
- **Build Tool**: Create React App + React Scripts

## Project Structure

```
PoeClusterSearch/
├── src/
│   ├── components/           # React components
│   │   ├── ClusterJewelSearch.tsx
│   │   ├── FilterPanel.tsx
│   │   └── ResultsTable.tsx
│   ├── services/            # API service layer
│   │   └── api.ts           # Axios client for PoE API
│   ├── store/               # Zustand store
│   │   └── clusterJewelStore.ts
│   ├── types/               # TypeScript type definitions
│   │   └── poe-api.ts
│   ├── App.tsx              # Main app component
│   └── index.css            # Tailwind directives
├── server/                  # Express proxy server
│   ├── server.ts
│   └── package.json
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
└── package.json             # Root dependencies
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm 8+

### 1. Install Dependencies

```bash
npm install
cd server && npm install && cd ..
```

Or use the convenience script:
```bash
npm run dev:setup
```

### 2. Start the Application

**Option A: Run frontend and backend separately (recommended for development)**

Terminal 1 - Start the Express proxy server:
```bash
npm run server:dev
```

Terminal 2 - Start the React development server:
```bash
npm start
```

**Option B: Run both together (requires `concurrently`, install with `npm install -g concurrently`)**
```bash
npm run dev
```

The React app will open at `http://localhost:3000`  
The proxy server runs at `http://localhost:3001`

## Usage

1. **Search**: Click the "🔍 Search Cluster Jewels" button to fetch items
2. **Set Results Limit**: Choose how many items to fetch (1-100)
3. **Filter**: Use the sidebar to filter by:
   - Cluster Type
   - Price Range (Chaos)
   - Item Level (ilvl)
4. **Sort**: Click column headers (Price, iLvl) to sort results
5. **View Details**: See seller, online status, and listing date

## API Endpoints

### Express Proxy Server

**Health Check**
```
GET http://localhost:3001/health
```

**Search Cluster Jewels**
```
POST http://localhost:3001/api/search
Content-Type: application/json

{
  "query": { /* PoE search query */ },
  "league": "Mirage"  // optional, defaults to Mirage
}
```

**Fetch Item Details**
```
GET http://localhost:3001/api/fetch/{itemIds}?query={queryId}
```

## Search Query Reference

The app uses a predefined search query optimized for cluster jewels:

```json
{
  "query": {
    "status": { "option": "any" },
    "stats": [ /* stat filters */ ],
    "filters": {
      "misc_filters": {
        "ilvl": { "min": 75, "max": 83 }
      },
      "type_filters": {
        "category": { "option": "jewel.cluster" }
      },
      "trade_filters": {
        "fee": { "min": 1, "max": null }
      }
    }
  },
  "sort": { "price": "asc" }
}
```

For custom queries, see the [PoE Trade API documentation](https://github.com/wgnodejsstudy/nodejs/issues/7).

## Rate Limiting

⚠️ **Note**: The Path of Exile API has strict rate limits (~60 requests/minute). The proxy implements basic rate limiting:

- Remote IP-based tracking
- Non-blocking requests when limit is exceeded (HTTP 429)
- Automatic request log cleanup

## Troubleshooting

### "Failed to search PoE Trade API"
1. Ensure proxy server is running on port 3001
2. Check internet connection and PoE API status
3. Verify proxy server logs for details

### Tailwind CSS not loading
1. Clear browser cache (Ctrl+Shift+Delete)
2. Rebuild: `npm run build`
3. Restart dev server: `npm start`

### CORS errors in console
1. Ensure proxy server is running
2. Check frontend is calling `http://localhost:3001/api/*`
3. Verify CORS middleware is enabled in server

### TypeScript errors
```bash
# Type-check the project
npx tsc --noEmit
```

## Building for Production

```bash
npm run build
```

Creates an optimized build in `build/` directory.

**Important**: The Express proxy server must run on a backend (e.g., Node.js hosting, Vercel serverless function, or local server).

## Environment Variables

Optional configuration:

```bash
# For proxy server
PORT=3001

# For React frontend
REACT_APP_API_URL=http://localhost:3001/api
```

## License

This project is provided as-is for educational purposes. Path of Exile is © Grinding Gear Games.

## Contributing

Feel free to submit issues and enhancement requests!

## Resources

- [Path of Exile Trade API](https://github.com/wgnodejsstudy/nodejs/issues/7)
- [React Documentation](https://react.dev)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Express Documentation](https://expressjs.com)

---

**Happy Searching! 🎮**
