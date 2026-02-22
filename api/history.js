import axios from 'axios';
import cache from './cache';

export default async function handler(req, res) {
  try {
    const ticker = req.query.ticker;
    const range = req.query.range || '1mo';

    if (!ticker) return res.status(400).json({ error: 'Missing ticker' });

    const interval =
      range === '1d' ? '5m' :
      range === '5d' ? '30m' :
      range === '1w' ? '1h' :
      '1d';

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`;

    const cached = cache.getCached(req);
    if (cached) return res.json(cached);

    const response = await axios.get(url);
    const result = response.data.chart.result?.[0];

    if (!result) return res.json([]);

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const history = timestamps.map((t, i) => ({
      date: new Date(t * 1000),
      close: closes[i],
    }));

    cache.setCached(req, history, 60000);
    return res.json(history);
  } catch (err) {
    console.error('History error:', err?.message || err);
    return res.status(500).json([]);
  }
}
