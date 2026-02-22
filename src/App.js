import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import PortfolioPage from "./pages/PortfolioPage";
import ScannerPage from "./pages/ScannerPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, AuthContext } from './AuthContext';

export default function App() {
  return (
    <AuthProvider>
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
            <Route path="/" element={<DashboardPage />} />

            <Route
              path="/portfolio"
              element={<PortfolioPage />}
            />

            <Route path="/scanner" element={<ScannerPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}