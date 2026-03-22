import express from 'express';
import cors from 'cors';
import axios from 'axios';
import {
  getClusterBaseAnalysisJob,
  getClusterBases,
  startClusterBaseAnalysis,
} from './clusterJewelService';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const requestLog: Record<string, number[]> = {};
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

  requestLog[ip] = requestLog[ip].filter((time) => time > oneMinuteAgo);

  if (requestLog[ip].length >= MAX_REQUESTS_PER_MINUTE) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  requestLog[ip].push(now);
  next();
};

app.use(rateLimitMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/cluster-jewels/bases', async (req, res) => {
  try {
    const result = await getClusterBases();
    res.json({
      league: 'Mirage',
      result,
    });
  } catch (error) {
    handleApiError(res, error, 'Failed to load cluster jewel base data', 'BASES');
  }
});

app.post('/api/cluster-jewels/analyze', async (req, res) => {
  const baseId = Number(req.body?.baseId);
  const comboSize = Number(req.body?.comboSize);
  const sampleSize = Number(req.body?.sampleSize ?? 10);

  if (!Number.isInteger(baseId) || baseId <= 0) {
    return res.status(400).json({ error: 'A valid baseId is required.' });
  }

  if (comboSize !== 2 && comboSize !== 3) {
    return res.status(400).json({ error: 'comboSize must be 2 or 3.' });
  }

  if (!Number.isInteger(sampleSize) || sampleSize < 1 || sampleSize > 10) {
    return res.status(400).json({ error: 'sampleSize must be an integer between 1 and 10.' });
  }

  try {
    console.log(
      `[ANALYZE] League: Mirage, Base ID: ${baseId}, Combo Size: ${comboSize}, Sample Size: ${sampleSize}`
    );
    const job = await startClusterBaseAnalysis(baseId, comboSize, sampleSize);
    res.status(job.status === 'completed' ? 200 : 202).json(job);
  } catch (error) {
    handleApiError(res, error, 'Failed to analyze cluster jewel combinations', 'ANALYZE');
  }
});

app.get('/api/cluster-jewels/analyze/:jobId', (req, res) => {
  const job = getClusterBaseAnalysisJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Analysis job not found.' });
  }

  res.json(job);
});

app.post('/api/search', async (req, res) => {
  try {
    const { league = 'Mirage', ...body } = req.body ?? {};
    const payload = body.query || body.sort ? body : { query: body };

    console.log(`[SEARCH] League: ${league}`);

    const response = await axios.post(
      `https://www.pathofexile.com/api/trade/search/${league}`,
      payload,
      {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    handleApiError(res, error, 'Failed to search PoE Trade API', 'SEARCH');
  }
});

app.get('/api/fetch/:ids', async (req, res) => {
  try {
    const { ids } = req.params;
    const { query } = req.query as { query: string };

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    console.log(`[FETCH] IDs: ${ids.substring(0, 50)}..., Query: ${query}`);

    const response = await axios.get(`https://www.pathofexile.com/api/trade/fetch/${ids}`, {
      params: { query },
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    res.json(response.data);
  } catch (error) {
    handleApiError(res, error, 'Failed to fetch items from PoE Trade API', 'FETCH');
  }
});

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

function handleApiError(
  res: express.Response,
  error: unknown,
  message: string,
  label: string
) {
  if (axios.isAxiosError(error)) {
    console.error(`[${label} ERROR]`, error.response?.status, error.response?.data || error.message);
    return res.status(error.response?.status || 500).json({
      error: message,
      details: error.response?.data || error.message,
    });
  }

  console.error(`[${label} ERROR]`, error instanceof Error ? error.message : error);
  return res.status(500).json({
    error: message,
    details: error instanceof Error ? error.message : 'Unknown error',
  });
}

app.listen(PORT, () => {
  console.log(`[START] PoE Cluster Search Proxy Server running on http://localhost:${PORT}`);
  console.log(`[INFO] Health check: http://localhost:${PORT}/health`);
  console.log(`[INFO] Bases endpoint: GET http://localhost:${PORT}/api/cluster-jewels/bases`);
  console.log(`[INFO] Analyze endpoint: POST http://localhost:${PORT}/api/cluster-jewels/analyze`);
  console.log(`[INFO] Search endpoint: POST http://localhost:${PORT}/api/search`);
  console.log(`[INFO] Fetch endpoint: GET http://localhost:${PORT}/api/fetch/{ids}?query={queryId}`);
});
