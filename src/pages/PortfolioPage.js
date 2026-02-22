import React, { useState } from "react";
import fetchWithFallback from "../utils/apiClient";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PortfolioPage({ portfolio, setPortfolio }) {
  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [error, setError] = useState("");

  const fmt = (num) =>
    num?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  async function fetchStockForPortfolio(ticker) {
    try {
      const res = await fetchWithFallback(
        `/api/summary?ticker=${ticker}`
      );
      const data = await res.json();

      if (!data || data.error) {
        setError("Invalid ticker symbol");
        return null;
      }

      return {
        symbol: data.symbol,
        name: data.shortName,
        currentPrice: data.regularMarketPrice,
        previousClose: data.previousClose,
        currency: data.currency,
      };
    } catch (err) {
      console.error("PORTFOLIO ADD ERROR:", err);
      setError("Error adding stock");
      return null;
    }
  }

  async function handleAddStock() {
    setError("");

    if (!ticker.trim() || !shares || !buyPrice) {
      setError("Fill out all fields");
      return;
    }

    const stockData = await fetchStockForPortfolio(ticker);
    if (!stockData) return;

    const newShares = Number(shares);
    const newBuyPrice = Number(buyPrice);

    const existing = portfolio.find((s) => s.symbol === stockData.symbol);

    let updatedPortfolio;

    if (existing) {
      const totalOldCost = existing.shares * existing.buyPrice;
      const totalNewCost = newShares * newBuyPrice;
      const combinedShares = existing.shares + newShares;

      const weightedBuyPrice = (totalOldCost + totalNewCost) / combinedShares;

      const updatedStock = {
        ...existing,
        shares: combinedShares,
        buyPrice: weightedBuyPrice,
        totalValue: combinedShares * stockData.currentPrice,
        lifetimeGainLoss:
          (stockData.currentPrice - weightedBuyPrice) * combinedShares,
        dailyGainLoss:
          (stockData.currentPrice - stockData.previousClose) * combinedShares,
      };

      updatedPortfolio = portfolio.map((s) =>
        s.symbol === existing.symbol ? updatedStock : s
      );
    } else {
      const newStock = {
        ...stockData,
        shares: newShares,
        buyPrice: newBuyPrice,
        totalValue: newShares * stockData.currentPrice,
        lifetimeGainLoss:
          (stockData.currentPrice - newBuyPrice) * newShares,
        dailyGainLoss:
          (stockData.currentPrice - stockData.previousClose) * newShares,
      };

      updatedPortfolio = [...portfolio, newStock];
    }

    setPortfolio(updatedPortfolio);

    setTicker("");
    setShares("");
    setBuyPrice("");
  }

  const pieData = {
    labels: portfolio.map((s) => s.symbol),
    datasets: [
      {
        data: portfolio.map((s) => s.totalValue),
        backgroundColor: [
          "#4a90e2",
          "#2ecc71",
          "#e67e22",
          "#9b59b6",
          "#1abc9c",
          "#e74c3c",
        ],
        hoverOffset: 10,
      },
    ],
  };

  return (
    <div style={{ padding: "20px" }}>
      <div className="header-bar">Portfolio</div>

      <div style={{ padding: "20px", marginTop: "20px" }}>
        <div className="card">
          <h2 className="section-title">Add Stock</h2>

          <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Ticker (AAPL)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              style={{ width: "150px" }}
            />

            <input
              type="number"
              placeholder="Shares"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              style={{ width: "150px" }}
            />

            <input
              type="number"
              placeholder="Buy Price"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              style={{ width: "150px" }}
            />

            <button onClick={handleAddStock}>Add</button>
          </div>

          {error && <p style={{ color: "red", marginTop: "10px" }}>{error}</p>}
        </div>

        {portfolio.length > 0 && (
          <div className="card">
            <h2 className="section-title">Portfolio Allocation</h2>
            <div style={{ width: "350px" }}>
              <Pie data={pieData} />
            </div>
          </div>
        )}

        <div className="card">
          <h2 className="section-title">Holdings</h2>

          {portfolio.length === 0 && (
            <p style={{ color: "#555" }}>No stocks added yet.</p>
          )}

          {portfolio.map((stock, index) => (
            <div
              key={index}
              style={{
                padding: "15px 0",
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <strong style={{ fontSize: "18px" }}>{stock.symbol}</strong>
                <div style={{ color: "#555", fontSize: "14px" }}>
                  {stock.name}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 600 }}>
                  ${fmt(stock.totalValue)}
                </div>

                <div
                  style={{
                    color: stock.dailyGainLoss >= 0 ? "#2ecc71" : "#e74c3c",
                    fontSize: "14px",
                  }}
                >
                  {stock.dailyGainLoss >= 0 ? "+" : ""}
                  ${fmt(stock.dailyGainLoss)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}