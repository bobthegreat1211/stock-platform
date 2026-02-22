import React, { useState, useEffect, useRef } from "react";

export default function ScannerPage() {
  const [ticker, setTicker] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Chart states
  const [range, setRange] = useState("1mo");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Responsive chart width
  const [chartWidth, setChartWidth] = useState(300);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const resize = () => {
      setChartWidth(chartRef.current.offsetWidth);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => window.removeEventListener("resize", resize);
  }, []);

  // Fetch summary
  async function fetchSummary(ticker) {
    try {
      const res = await fetch(`/api/summary?ticker=${ticker}`);
      const data = await res.json();
      if (!data || data.error) return null;
      return data;
    } catch (err) {
      console.error("SUMMARY ERROR:", err);
      return null;
    }
  }

  // Fetch history
  async function fetchHistory(ticker, range) {
    try {
      const res = await fetch(
        `/api/history?ticker=${ticker}&range=${range}`
      );
      const data = await res.json();
      if (!Array.isArray(data)) return null;
      return data;
    } catch (err) {
      console.error("HISTORY ERROR:", err);
      return null;
    }
  }

  // Simple analysis
  function analyze(history) {
    if (!history || history.length < 2) return null;

    const closes = history.map((d) => d.close);
    const last = closes[closes.length - 1];
    const prev = closes[closes.length - 2];

    return {
      lastClose: last,
      previousClose: prev,
      trend: last > prev ? "UP" : "DOWN",
    };
  }

  // Handle analyze button
  async function handleAnalyze() {
    setError("");
    setResult(null);

    if (!ticker.trim()) {
      setError("Enter a ticker symbol");
      return;
    }

    setLoading(true);

    const summary = await fetchSummary(ticker);
    const historyData = await fetchHistory(ticker, range);

    if (!summary || !historyData) {
      setError("Error analyzing stock");
      setLoading(false);
      return;
    }

    const analysis = analyze(historyData);

    setResult({
      summary,
      analysis,
      history: historyData,
    });

    setHistory(historyData);
    setLoading(false);
  }

// Reload history when range changes
useEffect(() => {
  if (!result) return;

  async function reload() {
    setLoadingHistory(true);
    const data = await fetchHistory(result.summary.symbol, range);
    setHistory(data || []);
    setLoadingHistory(false);
  }

  reload();
}, [result, range]);

  // Smooth curve builder with padding + smoothing
  const buildSmoothPath = (history, width, height) => {
    if (!history || history.length === 0) return "";

    const closes = history.map((h) => h.close).filter((c) => c != null);
    if (closes.length === 0) return "";

    // Add padding so the line never touches top/bottom
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const paddedMin = min - (max - min) * 0.1;
    const paddedMax = max + (max - min) * 0.1;
    const range = paddedMax - paddedMin || 1;

    const stepX = width / (closes.length - 1);

    let points = closes.map((c, i) => {
      const x = i * stepX;
      const y = height - ((c - paddedMin) / range) * height;
      return { x, y };
    });

    // Extra smoothing for small datasets
    if (points.length <= 10) {
      const smoothed = [];
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midX = (p0.x + p1.x) / 2;
        const midY = (p0.y + p1.y) / 2;
        smoothed.push(p0, { x: midX, y: midY });
      }
      smoothed.push(points[points.length - 1]);
      points = smoothed;
    }

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      path += ` Q ${cpX},${points[i - 1].y} ${points[i].x},${points[i].y}`;
    }

    return path;
  };

  return (
    <div style={{ padding: "20px" }}>
      {/* HEADER BAR */}
      <div className="header-bar">Stock Scanner</div>

      <div style={{ padding: "20px", marginTop: "20px" }}>
        
        {/* INPUT CARD */}
        <div className="card">
          <h2 className="section-title">Analyze a Stock</h2>

          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Enter ticker (AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              style={{ width: "200px" }}
            />

            <button onClick={handleAnalyze}>
              Analyze
            </button>
          </div>

          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
          {loading && <p style={{ marginTop: "10px" }}>Analyzing...</p>}
        </div>

        {/* RESULTS CARD */}
        {result && (
          <div className="card">
            <h2 className="section-title">{result.summary.shortName}</h2>

            {/* PRICE SECTION */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "18px", fontWeight: 600 }}>
                Current Price: ${result.summary.regularMarketPrice}
              </div>
              <div style={{ color: "#555", marginTop: "5px" }}>
                Previous Close: ${result.summary.previousClose}
              </div>
            </div>

            {/* TREND SECTION */}
            <div
              style={{
                padding: "15px",
                borderRadius: "10px",
                background: result.analysis.trend === "UP" ? "#e8f9f0" : "#fdecea",
                marginBottom: "20px",
              }}
            >
              <strong style={{ fontSize: "18px" }}>
                Trend:{" "}
                <span
                  style={{
                    color: result.analysis.trend === "UP" ? "#2ecc71" : "#e74c3c",
                  }}
                >
                  {result.analysis.trend}
                </span>
              </strong>

              <div style={{ marginTop: "8px", color: "#555" }}>
                Last Close: ${result.analysis.lastClose}
                <br />
                Previous Close: ${result.analysis.previousClose}
              </div>
            </div>

            {/* CHART SECTION */}
            <div
              style={{
                padding: "20px",
                borderRadius: "12px",
                background: "#f5f7fa",
              }}
            >
              <h3 style={{ marginBottom: "10px" }}>Historical Chart</h3>

              {/* TIME RANGE BUTTONS */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                {[
                  ["1D", "1d"],
                  ["5D", "5d"],
                  ["1W", "1w"],
                  ["1M", "1mo"],
                  ["6M", "6mo"],
                  ["1Y", "1y"],
                  ["YTD", "ytd"],
                ].map(([label, value]) => (
                  <button
                    key={value}
                    onClick={() => setRange(value)}
                    style={{
                      padding: "6px 12px",
                      background: range === value ? "#4da3ff" : "#e2e8f0",
                      border: range === value ? "1px solid #4da3ff" : "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: range === value ? "white" : "#1e293b",
                      fontWeight: range === value ? "600" : "500",
                      transition: "0.15s ease",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* CHART */}
              {loadingHistory && (
                <p style={{ color: "#777" }}>Loading chart...</p>
              )}

              {!loadingHistory && history.length > 0 && (
                <div ref={chartRef} style={{ width: "100%" }}>
                  <svg
                    width={chartWidth}
                    height="160"
                    viewBox={`0 0 ${chartWidth} 160`}
                    style={{
                      background: "white",
                      borderRadius: "6px",
                      border: "1px solid #ccc",
                    }}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    {/* Gradient fill */}
                    <defs>
                      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4da3ff" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#4da3ff" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path
                      d={
                        buildSmoothPath(history, chartWidth, 120) +
                        ` L ${chartWidth} 160 L 0 160 Z`
                      }
                      fill="url(#chartFill)"
                    />

                    {/* Smooth line */}
                    <path
                      d={buildSmoothPath(history, chartWidth, 120)}
                      fill="none"
                      stroke="#4da3ff"
                      strokeWidth="3"
                    />

                    {/* Hover elements */}
                    {hoverIndex !== null && (
                      <>
                        {/* Vertical line */}
                        <line
                          x1={(hoverIndex / (history.length - 1)) * chartWidth}
                          y1="0"
                          x2={(hoverIndex / (history.length - 1)) * chartWidth}
                          y2="160"
                          stroke="#888"
                          strokeDasharray="4"
                        />

                        {/* Dot */}
                        <circle
                          cx={(hoverIndex / (history.length - 1)) * chartWidth}
                          cy={
                            120 -
                            ((history[hoverIndex].close -
                              Math.min(...history.map((h) => h.close))) /
                              (Math.max(...history.map((h) => h.close)) -
                                Math.min(...history.map((h) => h.close)))) *
                              120
                          }
                          r="5"
                          fill="#4da3ff"
                          stroke="white"
                          strokeWidth="2"
                        />

                        {/* Tooltip */}
                        <rect
                          x={(hoverIndex / (history.length - 1)) * chartWidth - 45}
                          y="5"
                          width="90"
                          height="30"
                          fill="#111"
                          stroke="#4da3ff"
                          rx="4"
                        />
                        <text
                          x={(hoverIndex / (history.length - 1)) * chartWidth}
                          y="25"
                          fill="white"
                          fontSize="12"
                          textAnchor="middle"
                        >
                          ${history[hoverIndex].close.toFixed(2)}
                        </text>
                      </>
                    )}

                    {/* Mouse tracking */}
                    <rect
                      width="100%"
                      height="100%"
                      fill="transparent"
                      onMouseMove={(e) => {
                        const rect = e.target.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const index = Math.round(
                          (x / chartWidth) * (history.length - 1)
                        );
                        setHoverIndex(
                          Math.max(0, Math.min(index, history.length - 1))
                        );
                      }}
                    />
                  </svg>
                </div>
              )}

              {!loadingHistory && history.length === 0 && (
                <p style={{ color: "#777" }}>No chart data available.</p>
              )}
            </div>

            {/* ANALYSIS REMOVED */}

          </div>
        )}
      </div>
    </div>
  );
}