import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import ScannerPage from "./pages/ScannerPage";

export default function App() {
  // GLOBAL PORTFOLIO STATE
  const [portfolio, setPortfolio] = useState([]);

  // ----------------------------------------------------
  // LOAD PORTFOLIO FROM LOCALSTORAGE ON STARTUP
  // ----------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem("portfolio");
    console.log("LOADED FROM LOCALSTORAGE:", saved);

    if (saved) {
      try {
        setPortfolio(JSON.parse(saved));
      } catch (err) {
        console.error("JSON PARSE ERROR:", err);
      }
    }
  }, []);

  // ----------------------------------------------------
  // SAVE PORTFOLIO TO LOCALSTORAGE WHENEVER IT CHANGES
  // ----------------------------------------------------
  useEffect(() => {
    console.log("SAVING PORTFOLIO TO LOCALSTORAGE:", portfolio);
    localStorage.setItem("portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  return (
    <Router>
      <Sidebar />

      <div
        style={{
          marginLeft: "250px",
          padding: "20px",
          width: "calc(100% - 250px)",
          boxSizing: "border-box",
        }}
      >
        <Routes>
          <Route path="/" element={<DashboardPage portfolio={portfolio} />} />

          <Route
            path="/portfolio"
            element={
              <PortfolioPage
                portfolio={portfolio}
                setPortfolio={setPortfolio}
              />
            }
          />

          <Route path="/scanner" element={<ScannerPage />} />
        </Routes>
      </div>
    </Router>
  );
}