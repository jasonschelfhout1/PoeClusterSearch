import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting simple implementation
const requestLog: { [key: string]: number[] } = {};
const MAX_REQUESTS_PER_MINUTE = 60;

const rateLimitMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const oneMinuteAgo = now - 60000;

  if (!requestLog[ip]) {
    requestLog[ip] = [];
  }

  // Clean up old requests
  requestLog[ip] = requestLog[ip].filter((time) => time > oneMinuteAgo);

  if (requestLog[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  requestLog[ip].push(now);
  next();
};

app.use(rateLimitMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * POST /api/search
 * Proxies search requests to PoE Trade API
 */
app.post('/api/search', async (req, res) => {
  try {
    const league = req.body.league || 'Mirage';
    const query = req.body.query || req.body;

    console.log(`[SEARCH] League: ${league}, Query ID: ${query.id}`);

    const response = await axios.post(
      `https://www.pathofexile.com/api/trade/search/${league}`,
      query,
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[SEARCH ERROR]', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: 'Failed to search PoE Trade API',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/fetch/:ids
 * Proxies item fetch requests to PoE Trade API
 */
app.get('/api/fetch/:ids', async (req, res) => {
  try {
    const { ids } = req.params;
    const { query } = req.query as { query: string };

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    console.log(`[FETCH] IDs: ${ids.substring(0, 50)}..., Query: ${query}`);

    const response = await axios.get(
      `https://www.pathofexile.com/api/trade/fetch/${ids}`,
      {
        params: { query },
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('[FETCH ERROR]', error instanceof Error ? error.message : error);
    res.status(500).json({
      error: 'Failed to fetch items from PoE Trade API',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('[ERROR]', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 PoE Cluster Search Proxy Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 Search endpoint: POST http://localhost:${PORT}/api/search`);
  console.log(`📦 Fetch endpoint: GET http://localhost:${PORT}/api/fetch/{ids}?query={queryId}`);
});
