import React, { useEffect, useState } from "react";

export default function DashboardPage({ portfolio }) {
  // -----------------------------
  // PORTFOLIO METRICS
  // -----------------------------
  const totalValue = portfolio.reduce((sum, s) => sum + s.totalValue, 0);
  const totalDaily = portfolio.reduce((sum, s) => sum + s.dailyGainLoss, 0);
  const totalLifetime = portfolio.reduce(
    (sum, s) => sum + s.lifetimeGainLoss,
    0
  );

  // -----------------------------
  // INDEX + AI STOCK FINDER DATA
  // -----------------------------
  const [indexes, setIndexes] = useState({
    sp500: null,
    nasdaq: null,
    dow: null,
  });

  const [trending, setTrending] = useState([]);
  const [popup, setPopup] = useState(null);
  const [popupHistory, setPopupHistory] = useState([]);
  const [popupLoading, setPopupLoading] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  const fmt = (num) =>
    num?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  useEffect(() => {
    async function loadIndexes() {
      const fetchIndex = async (symbol) => {
        const res = await fetch(
          `/api/index?symbol=${symbol}`
        );
        return await res.json();
      };

      const sp500 = await fetchIndex("^GSPC");
      const nasdaq = await fetchIndex("^IXIC");
      const dow = await fetchIndex("^DJI");

      setIndexes({ sp500, nasdaq, dow });
    }

    async function loadTrending() {
      const res = await fetch(
        "/api/scan?mode=balanced"
      );
      const data = await res.json();
      setTrending(data.results || []);
    }

    loadIndexes();
    loadTrending();
  }, []);

  // Load history when popup opens
  useEffect(() => {
    if (!popup) {
      setPopupHistory([]);
      return;
    }

    async function loadHistory() {
      try {
        setPopupLoading(true);
        const res = await fetch(
          `/api/history?ticker=${popup.symbol}`
        );
        const data = await res.json();
        setPopupHistory(data || []);
      } catch {
        setPopupHistory([]);
      } finally {
        setPopupLoading(false);
      }
    }

    loadHistory();
  }, [popup]);

  // Build smooth curve path for chart
  const buildSmoothPath = (history, width = 320, height = 120) => {
    if (!history || history.length === 0) return "";

    const closes = history.map((h) => h.close).filter((c) => c != null);
    if (closes.length === 0) return "";

    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;

    const stepX = width / (closes.length - 1);

    const points = closes.map((c, i) => {
      const x = i * stepX;
      const y = height - ((c - min) / range) * height;
      return { x, y };
    });

    let path = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const cpX = (points[i - 1].x + points[i].x) / 2;
      path += ` Q ${cpX},${points[i - 1].y} ${points[i].x},${points[i].y}`;
    }

    return path;
  };

  const getRiskLabel = (score) => {
    if (score >= 75) return "Medium";
    if (score >= 55) return "Medium-High";
    return "High";
  };

  const getConfidencePercent = (score) => {
    const capped = Math.max(0, Math.min(score || 0, 100));
    return capped;
  };

  // Simple AI alerts: high-confidence setups
  const alerts = trending.filter((t) => (t.score || 0) >= 70);

  return (
    <div
      style={{
        padding: "20px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1200px" }}>
        <div className="header-bar">Dashboard</div>

        <div style={{ padding: "20px", marginTop: "20px" }}>
          {/* STATS BAR */}
          <div
            className="stats-bar"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "15px",
            }}
          >
            <div className="stat-box" style={{ flex: "1 1 200px" }}>
              <div className="stat-label">Total Portfolio Value</div>
              <div className="stat-value">${fmt(totalValue)}</div>
            </div>

            <div className="stat-box" style={{ flex: "1 1 200px" }}>
              <div className="stat-label">Today's Gain/Loss</div>
              <div
                className="stat-value"
                style={{ color: totalDaily >= 0 ? "#2ecc71" : "#e74c3c" }}
              >
                {totalDaily >= 0 ? "+" : ""}${fmt(totalDaily)}
              </div>
            </div>

            <div className="stat-box" style={{ flex: "1 1 200px" }}>
              <div className="stat-label">Lifetime Gain/Loss</div>
              <div
                className="stat-value"
                style={{ color: totalLifetime >= 0 ? "#2ecc71" : "#e74c3c" }}
              >
                {totalLifetime >= 0 ? "+" : ""}${fmt(totalLifetime)}
              </div>
            </div>
          </div>

          {/* MARKET + ALERTS ROW */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            {/* MARKET OVERVIEW */}
            <div className="card" style={{ flex: "2 1 260px" }}>
              <h2 className="section-title">Market Overview</h2>

              <div
                style={{
                  display: "flex",
                  gap: "20px",
                  marginTop: "15px",
                  flexWrap: "wrap",
                }}
              >
                <div className="stat-box" style={{ flex: "1 1 120px" }}>
                  <div className="stat-label">S&P 500</div>
                  <div className="stat-value">
                    {indexes.sp500 ? fmt(indexes.sp500.price) : "Loading..."}
                  </div>
                </div>

                <div className="stat-box" style={{ flex: "1 1 120px" }}>
                  <div className="stat-label">NASDAQ</div>
                  <div className="stat-value">
                    {indexes.nasdaq ? fmt(indexes.nasdaq.price) : "Loading..."}
                  </div>
                </div>

                <div className="stat-box" style={{ flex: "1 1 120px" }}>
                  <div className="stat-label">Dow Jones</div>
                  <div className="stat-value">
                    {indexes.dow ? fmt(indexes.dow.price) : "Loading..."}
                  </div>
                </div>
              </div>
            </div>

            {/* AI ALERTS */}
            <div className="card" style={{ flex: "1 1 220px" }}>
              <h2 className="section-title">AI Alerts</h2>
              {alerts.length === 0 && (
                <p style={{ color: "#777", fontSize: "14px" }}>
                  No high‑confidence alerts right now.
                </p>
              )}
              {alerts.length > 0 && (
                <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
                  {alerts.map((a, i) => (
                    <li
                      key={i}
                      style={{
                        marginBottom: "8px",
                        cursor: "pointer",
                        color: "#f1c40f",
                      }}
                      onClick={() => setPopup(a)}
                    >
                      <strong>{a.symbol}</strong> — {getConfidencePercent(a.score)}% confidence
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* AI STOCK FINDER */}
          <div className="card" style={{ marginTop: "20px" }}>
            <h2 className="section-title">AI Stock Finder</h2>

            {trending.length === 0 && (
              <p style={{ color: "#777" }}>Scanning for setups...</p>
            )}

            <ul style={{ marginTop: "10px", paddingLeft: "20px" }}>
              {trending.map((t, i) => (
                <li
                  key={i}
                  style={{ marginBottom: "12px", cursor: "pointer" }}
                  onClick={() => setPopup(t)}
                >
                  <strong>{t.symbol}</strong> — ${fmt(t.price)}
                  <br />
                  <span style={{ color: "#4da3ff", fontSize: "13px" }}>
                    Buy Zone: ${fmt(t.buyZone.low)} – ${fmt(t.buyZone.high)}
                  </span>
                  <br />
                  <span style={{ color: "#2ecc71", fontSize: "13px" }}>
                    Target: ${fmt(t.targetZone.low)} – ${fmt(t.targetZone.high)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* POPUP ANALYSIS */}
        {popup && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              padding: "10px",
            }}
            onClick={() => setPopup(null)}
          >
            <div
              style={{
                background: "#0d1117",
                padding: "20px",
                borderRadius: "10px",
                width: "100%",
                maxWidth: "420px",
                border: "1px solid #333",
                boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
                color: "white",
                maxHeight: "90vh",
                overflowY: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{ marginBottom: "5px" }}>{popup.symbol} Analysis</h2>
              <p style={{ color: "#ccc", marginBottom: "15px" }}>
                AI‑detected setup based on momentum, volume, and recent price
                action.
              </p>

              {/* PRICE + RISK/CONFIDENCE */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "15px",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: "#ccc" }}>
                    Current Price
                  </div>
                  <div style={{ fontSize: "18px" }}>${fmt(popup.price)}</div>
                </div>

                <div>
                  <div style={{ fontSize: "13px", color: "#ccc" }}>
                    Risk Level
                  </div>
                  <div style={{ fontSize: "16px" }}>
                    {getRiskLabel(popup.score || 50)}
                  </div>
                </div>

                <div style={{ width: "140px" }}>
                  <div style={{ fontSize: "13px", color: "#ccc" }}>
                    Confidence
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#111827",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${getConfidencePercent(popup.score || 50)}%`,
                        height: "100%",
                        background:
                          popup.score >= 75
                            ? "#2ecc71"
                            : popup.score >= 55
                            ? "#f1c40f"
                            : "#e67e22",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#aaa",
                      marginTop: "3px",
                      textAlign: "right",
                    }}
                  >
                    {getConfidencePercent(popup.score || 50)}%
                  </div>
                </div>
              </div>

              {/* BUY / SELL ZONES */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "15px",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontSize: "13px", color: "#ccc" }}>
                    Buy Zone
                  </div>
                  <div>
                    ${fmt(popup.buyZone.low)} – ${fmt(popup.buyZone.high)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "13px", color: "#ccc" }}>
                    Sell Target
                  </div>
                  <div>
                    ${fmt(popup.targetZone.low)} – ${fmt(popup.targetZone.high)}
                  </div>
                </div>
              </div>

              {/* CHART */}
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "13px", color: "#ccc" }}>
                  Last 30 days price action
                </div>

                {popupLoading && (
                  <p style={{ color: "#777", fontSize: "13px" }}>
                    Loading chart...
                  </p>
                )}

                {!popupLoading && popupHistory.length > 0 && (
                  <svg
                    width="100%"
                    height="120"
                    viewBox="0 0 320 120"
                    style={{
                      background: "#050816",
                      borderRadius: "6px",
                      border: "1px solid #1f2933",
                      marginTop: "8px",
                    }}
                    onMouseLeave={() => setHoverIndex(null)}
                  >
                    {/* Smooth line */}
                    <path
                      d={buildSmoothPath(popupHistory, 320, 120)}
                      fill="none"
                      stroke="#4da3ff"
                      strokeWidth="2"
                    />

                    {/* Hover elements */}
                    {hoverIndex !== null && (
                      <>
                        {/* Vertical line */}
                        <line
                          x1={
                            (hoverIndex / (popupHistory.length - 1 || 1)) * 320
                          }
                          y1="0"
                          x2={
                            (hoverIndex / (popupHistory.length - 1 || 1)) * 320
                          }
                          y2="120"
                          stroke="#888"
                          strokeDasharray="4"
                        />

                        {/* Hover dot */}
                        <circle
                          cx={
                            (hoverIndex / (popupHistory.length - 1 || 1)) * 320
                          }
                          cy={
                            120 -
                            ((popupHistory[hoverIndex].close -
                              Math.min(
                                ...popupHistory.map((h) => h.close)
                              )) /
                              (Math.max(
                                ...popupHistory.map((h) => h.close)
                              ) -
                                Math.min(
                                  ...popupHistory.map((h) => h.close)
                                ) ||
                                1)) *
                              120
                          }
                          r="4"
                          fill="#4da3ff"
                        />

                        {/* Tooltip */}
                        <rect
                          x={
                            (hoverIndex /
                              (popupHistory.length - 1 || 1)) *
                              320 -
                            40
                          }
                          y="5"
                          width="80"
                          height="22"
                          fill="#111"
                          stroke="#4da3ff"
                          rx="4"
                        />
                        <text
                          x={
                            (hoverIndex /
                              (popupHistory.length - 1 || 1)) *
                            320
                          }
                          y="20"
                          fill="white"
                          fontSize="12"
                          textAnchor="middle"
                        >
                          ${fmt(popupHistory[hoverIndex].close)}
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
                          (x / 320) * (popupHistory.length - 1 || 1)
                        );
                        setHoverIndex(
                          Math.max(
                            0,
                            Math.min(index, popupHistory.length - 1)
                          )
                        );
                      }}
                    />
                  </svg>
                )}

                {!popupLoading && popupHistory.length === 0 && (
                  <p style={{ color: "#777", fontSize: "13px" }}>
                    No chart data available.
                  </p>
                )}
              </div>

              {/* SUMMARY */}
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "13px", color: "#ccc" }}>Summary</div>
                <p style={{ fontSize: "14px", color: "#eee" }}>
                  This stock was flagged by the AI Stock Finder because it shows
                  a combination of positive momentum, volume activity, and price
                  behavior that may precede a move higher. The suggested buy
                  zone is where the risk/reward is more favorable, and the
                  target zone represents a reasonable short‑term profit area
                  based on recent volatility.
                </p>
              </div>

              {/* REASONS */}
              <div style={{ marginBottom: "15px" }}>
                <div style={{ fontSize: "13px", color: "#ccc" }}>
                  Why this stock was selected
                </div>
                <ul style={{ paddingLeft: "20px", color: "#eee" }}>
                  {popup.reasons.map((r, i) => (
                    <li key={i} style={{ marginBottom: "4px" }}>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>

              {/* DISCLAIMER */}
              <p
                style={{
                  marginTop: "5px",
                  fontSize: "11px",
                  color: "#666",
                }}
              >
                This is not financial advice. Use this as a starting point and
                always do your own research.
              </p>

              <button
                onClick={() => setPopup(null)}
                style={{
                  width: "100%",
                  marginTop: "15px",
                  padding: "10px",
                  background: "#4da3ff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}