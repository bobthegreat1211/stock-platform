import React from "react";
import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div
      style={{
        width: "250px",
        minWidth: "250px",
        height: "100vh",
        background: "#0d1117",
        color: "white",
        position: "fixed",
        left: 0,
        top: 0,
        padding: "25px",
        boxSizing: "border-box",
        borderRight: "1px solid #222",
      }}
    >
      <h2 style={{ marginBottom: "40px", fontWeight: 600 }}>Stock Platform</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <Link to="/" className="sidebar-link">
          Dashboard
        </Link>
        <Link to="/portfolio" className="sidebar-link">
          Portfolio
        </Link>
        <Link to="/scanner" className="sidebar-link">
          Scanner
        </Link>
      </nav>
    </div>
  );
}