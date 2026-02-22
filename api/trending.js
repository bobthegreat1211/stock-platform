import axios from 'axios';
import cache from './cache';

export default async function handler(req, res) {
  try {
    const trendingURL = 'https://query1.finance.yahoo.com/v1/finance/trending/US';
    const trendingRes = await axios.get(trendingURL);

    const quotes = trendingRes.data.finance?.result?.[0]?.quotes || [];

    let tickers = quotes.map((q) => q.symbol);

    tickers = tickers.filter((sym) => {
      if (!sym) return false;
      if (sym.includes('-')) return false;
      if (sym.includes('=')) return false;
      if (sym.endsWith('X')) return false;
      return true;
    });

    tickers = tickers.slice(0, 10);

    const results = [];

    for (const t of tickers) {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=5d&includePrePost=true`;
      const response = await axios.get(url);
      const result = response.data.chart.result?.[0];

      if (!result) continue;

      const meta = result.meta;

      if (!meta.regularMarketPrice || meta.regularMarketPrice < 3.5) continue;

      results.push({
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        previousClose: meta.chartPreviousClose,
        change: meta.regularMarketPrice - meta.chartPreviousClose,
      });
    }

    results.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    cache.setCached(req, results, 30000);
    return res.json(results);
  } catch (err) {
    console.error('TRENDING API ERROR:', err?.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
}
