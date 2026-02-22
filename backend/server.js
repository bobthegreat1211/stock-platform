import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------
// SUMMARY ROUTE (Portfolio + Scanner)
// ---------------------------------------------
app.get("/api/summary", async (req, res) => {
  try {
    const ticker = req.query.ticker;

    if (!ticker) {
      return res.json({ error: "Missing ticker" });
    }

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d&includePrePost=true`;
    const response = await axios.get(url);

    const result = response.data.chart.result?.[0];
    if (!result) {
      return res.json({ error: "Invalid ticker" });
    }

    const meta = result.meta;

    return res.json({
      symbol: meta.symbol,
      shortName: meta.shortName || meta.symbol,
      regularMarketPrice: meta.regularMarketPrice ?? 0,
      previousClose:
        meta.chartPreviousClose ??
        meta.regularMarketPrice ??
        0,
      currency: meta.currency || "USD",
    });
  } catch (err) {
    console.error("SUMMARY API ERROR:", err.message);
    return res.json({ error: "Server error" });
  }
});

// ---------------------------------------------
// HISTORY ROUTE (Scanner)
// ---------------------------------------------
app.get("/api/history", async (req, res) => {
  try {
    const ticker = req.query.ticker;
    const range = req.query.range || "1mo"; // default 1 month

    // Choose interval based on range
    const interval =
      range === "1d" ? "5m" :
      range === "5d" ? "30m" :
      range === "1w" ? "1h" :
      range === "1mo" ? "1d" :
      range === "6mo" ? "1d" :
      range === "1y" ? "1d" :
      range === "ytd" ? "1d" :
      "1d";

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`;

    const response = await axios.get(url);
    const result = response.data.chart.result?.[0];

    if (!result) return res.json([]);

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const history = timestamps.map((t, i) => ({
      date: new Date(t * 1000),
      close: closes[i],
    }));

    res.json(history);
  } catch (err) {
    console.error("History error:", err.message);
    res.json([]);
  }
});
// ---------------------------------------------
// MARKET INDEX ROUTE (S&P 500, NASDAQ, DOW)
// ---------------------------------------------
app.get("/api/index", async (req, res) => {
  try {
    const symbol = req.query.symbol;
    if (!symbol) return res.json({ error: "Missing index symbol" });

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d&includePrePost=true`;
    const response = await axios.get(url);

    const result = response.data.chart.result?.[0];
    if (!result) return res.json({ error: "Invalid index symbol" });

    const meta = result.meta;

    return res.json({
      symbol: meta.symbol,
      price: meta.regularMarketPrice ?? 0,
      previousClose:
        meta.chartPreviousClose ??
        meta.regularMarketPrice ??
        0,
      currency: meta.currency || "USD",
    });
  } catch (err) {
    console.error("INDEX API ERROR:", err.message);
    return res.json({ error: "Server error" });
  }
});

// ---------------------------------------------
// TRENDING STOCKS (FILTERED, SIMPLE)
// ---------------------------------------------
app.get("/api/trending", async (req, res) => {
  try {
    const trendingURL =
      "https://query1.finance.yahoo.com/v1/finance/trending/US";
    const trendingRes = await axios.get(trendingURL);

    const quotes =
      trendingRes.data.finance?.result?.[0]?.quotes || [];

    let tickers = quotes.map((q) => q.symbol);

    tickers = tickers.filter((sym) => {
      if (!sym) return false;
      if (sym.includes("-")) return false; // crypto
      if (sym.includes("=")) return false; // forex
      if (sym.endsWith("X")) return false; // mutual funds
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

    return res.json(results);
  } catch (err) {
    console.error("TRENDING API ERROR:", err.message);
    return res.json({ error: "Server error" });
  }
});

// ---------------------------------------------
// AI-STYLE SCAN ROUTE (POOL + PATTERN + BUY/SELL SUGGESTION)
// ---------------------------------------------
app.get("/api/scan", async (req, res) => {
  try {
    const mode = req.query.mode || "balanced";

    // 1) Build a pool from Yahoo "most active" + "trending"
    const mostActiveURL =
      "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=most_actives";
    const trendingURL =
      "https://query1.finance.yahoo.com/v1/finance/trending/US";

    const [mostActiveRes, trendingRes] = await Promise.all([
      axios.get(mostActiveURL),
      axios.get(trendingURL),
    ]);

    const mostActiveQuotes =
      mostActiveRes.data.finance?.result?.[0]?.quotes || [];
    const trendingQuotes =
      trendingRes.data.finance?.result?.[0]?.quotes || [];

    let symbols = [
      ...mostActiveQuotes.map((q) => q.symbol),
      ...trendingQuotes.map((q) => q.symbol),
    ];

    // Dedupe
    symbols = [...new Set(symbols)];

    // Filter out obvious non-stocks
    symbols = symbols.filter((sym) => {
      if (!sym) return false;
      if (sym.includes("-")) return false; // crypto
      if (sym.includes("=")) return false; // forex
      if (sym.endsWith("X")) return false; // mutual funds
      return true;
    });

    // Limit pool size (still feels like "market scan")
    symbols = symbols.slice(0, 150);

    // Mode-based score threshold
    let minScore = 45;
    if (mode === "conservative") minScore = 55;
    if (mode === "balanced") minScore = 45;
    if (mode === "aggressive") minScore = 35;
    if (mode === "ultra") minScore = 25;

    const batchSize = 15;
    const results = [];

    async function analyzeSymbol(symbol) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo&includePrePost=true`;
        const response = await axios.get(url);
        const result = response.data.chart.result?.[0];
        if (!result) return null;

        const meta = result.meta;
        const quote = result.indicators.quote[0];

        const closes = quote.close;
        const volumes = quote.volume;

        if (!closes || closes.length < 5) return null;

        const lastClose = closes[closes.length - 1];
        const prevClose = closes[closes.length - 2];

        if (!lastClose || lastClose < 3.5) return null; // price floor

        const last20 = closes.slice(-20);
        const last5 = closes.slice(-5);

        const avg20 =
          last20.reduce((a, b) => a + b, 0) / last20.length;
        const avg5 =
          last5.reduce((a, b) => a + b, 0) / last5.length;

        const lastVol = volumes[volumes.length - 1];
        const vol20 =
          volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const volSpike = lastVol > vol20 * 1.5;

        const upToday = lastClose > prevClose;
        const upVs20 = lastClose > avg20;
        const upVs5 = lastClose > avg5;

        const last3 = closes.slice(-3);
        const rsiRising =
          last3.length === 3 &&
          last3[2] > last3[1] &&
          last3[1] > last3[0];

        let score = 0;
        const reasons = [];

        if (upToday) {
          score += 10;
          reasons.push("Price is up today");
        }
        if (upVs20) {
          score += 15;
          reasons.push("Trading above 20-day average");
        }
        if (upVs5) {
          score += 10;
          reasons.push("Short-term momentum is positive");
        }
        if (volSpike) {
          score += 20;
          reasons.push("Volume spike vs 20-day average");
        }
        if (rsiRising) {
          score += 15;
          reasons.push("Recent candles show rising strength");
        }

        if (lastClose >= 3.5 && lastClose <= 15) {
          score += 5;
          reasons.push("In the $3.50–$15 range (potential momentum zone)");
        }

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
          buyZone: {
            low: buyLow,
            high: buyHigh,
          },
          targetZone: {
            low: targetLow,
            high: targetHigh,
          },
        };
      } catch {
        return null;
      }
    }

    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map((s) => analyzeSymbol(s));
      const batchResults = await Promise.all(batchPromises);
      for (const r of batchResults) {
        if (r) results.push(r);
      }
    }

    results.sort((a, b) => b.score - a.score);

    return res.json({
      mode,
      totalScanned: symbols.length,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("SCAN API ERROR:", err.message);
    return res.json({ error: "Server error" });
  }
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
app.listen(5000, () => {
  console.log("Backend running on http://localhost:5000");
});