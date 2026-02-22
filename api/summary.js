import axios from 'axios';
import cache from './cache';

export default async function handler(req, res) {
  try {
    const ticker = req.query.ticker;

    if (!ticker) {
      return res.status(400).json({ error: 'Missing ticker' });
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d&includePrePost=true`;

    const cached = cache.getCached(req);
    if (cached) return res.json(cached);

    const response = await axios.get(url);

    const result = response.data.chart.result?.[0];
    if (!result) {
      return res.json({ error: 'Invalid ticker' });
    }

    const meta = result.meta;
    const out = {
      symbol: meta.symbol,
      shortName: meta.shortName || meta.symbol,
      regularMarketPrice: meta.regularMarketPrice ?? 0,
      previousClose:
        meta.chartPreviousClose ??
        meta.regularMarketPrice ??
        0,
      currency: meta.currency || 'USD',
    };
    cache.setCached(req, out, 30000);
    return res.json(out);
  } catch (err) {
    console.error('SUMMARY API ERROR:', err?.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
}
