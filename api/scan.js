import axios from 'axios';
import cache from './cache';

export default async function handler(req, res) {
  try {
    const mode = req.query.mode || 'balanced';

    const mostActiveURL =
      'https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives';
    const trendingURL = 'https://query1.finance.yahoo.com/v1/finance/trending/US';

    const [mostActiveRes, trendingRes] = await Promise.all([
      axios.get(mostActiveURL),
      axios.get(trendingURL),
    ]);

    const mostActiveQuotes = mostActiveRes.data.finance?.result?.[0]?.quotes || [];
    const trendingQuotes = trendingRes.data.finance?.result?.[0]?.quotes || [];

    let symbols = [
      ...mostActiveQuotes.map((q) => q.symbol),
      ...trendingQuotes.map((q) => q.symbol),
    ];

    symbols = [...new Set(symbols)];

    symbols = symbols.filter((sym) => {
      if (!sym) return false;
      if (sym.includes('-')) return false;
      if (sym.includes('=')) return false;
      if (sym.endsWith('X')) return false;
      return true;
    });

    symbols = symbols.slice(0, 150);

    let minScore = 45;
    if (mode === 'conservative') minScore = 55;
    if (mode === 'balanced') minScore = 45;
    if (mode === 'aggressive') minScore = 35;
    if (mode === 'ultra') minScore = 25;

    const batchSize = 15;
    const results = [];

    async function analyzeSymbol(symbol) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo&includePrePost=true`;
        const response = await axios.get(url);
        const result = response.data.chart.result?.[0];
        if (!result) return null;

        const meta = result.meta;
        const quote = result.indicators?.quote?.[0];

        const closes = quote?.close || [];
        const volumes = quote?.volume || [];

        if (!closes || closes.length < 5) return null;

        const lastClose = closes[closes.length - 1];
        const prevClose = closes[closes.length - 2];

        if (!lastClose || lastClose < 3.5) return null;

        const last20 = closes.slice(-20);
        const last5 = closes.slice(-5);

        const avg20 = last20.reduce((a, b) => a + b, 0) / last20.length;
        const avg5 = last5.reduce((a, b) => a + b, 0) / last5.length;

        const lastVol = volumes[volumes.length - 1] || 0;
        const vol20 = (volumes.slice(-20).reduce((a, b) => a + b, 0) / 20) || 0;
        const volSpike = vol20 > 0 && lastVol > vol20 * 1.5;

        const upToday = lastClose > prevClose;
        const upVs20 = lastClose > avg20;
        const upVs5 = lastClose > avg5;

        const last3 = closes.slice(-3);
        const rsiRising = last3.length === 3 && last3[2] > last3[1] && last3[1] > last3[0];

        let score = 0;
        const reasons = [];

        if (upToday) { score += 10; reasons.push('Price is up today'); }
        if (upVs20) { score += 15; reasons.push('Trading above 20-day average'); }
        if (upVs5) { score += 10; reasons.push('Short-term momentum is positive'); }
        if (volSpike) { score += 20; reasons.push('Volume spike vs 20-day average'); }
        if (rsiRising) { score += 15; reasons.push('Recent candles show rising strength'); }
        if (lastClose >= 3.5 && lastClose <= 15) { score += 5; reasons.push('In the $3.50–$15 range (potential momentum zone)'); }

        if (score < minScore) return null;

        const buyLow = lastClose * 0.97;
        const buyHigh = lastClose * 0.995;
        const targetLow = lastClose * 1.05;
        const targetHigh = lastClose * 1.12;

        return {
          symbol: meta.symbol,
          price: lastClose,
          previousClose: prevClose,
          score,
          reasons,
          buyZone: { low: buyLow, high: buyHigh },
          targetZone: { low: targetLow, high: targetHigh },
        };
      } catch {
        return null;
      }
    }

    const cached = cache.getCached(req);
    if (cached) return res.json(cached);

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map((s) => analyzeSymbol(s));
      const batchResults = await Promise.all(batchPromises);
      for (const r of batchResults) if (r) results.push(r);
    }

    results.sort((a, b) => b.score - a.score);

    const out = { mode, totalScanned: symbols.length, count: results.length, results };
    cache.setCached(req, out, 60000);
    return res.json(out);
  } catch (err) {
    console.error('SCAN API ERROR:', err?.message || err);
    return res.status(500).json({ error: 'Server error' });
  }
}
