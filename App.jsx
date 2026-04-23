// App.jsx
// ─────────────────────────────────────────────────────────────
// This is the ROOT component — the top of the family tree.
// Every other component lives inside this one.
//
// KEY REACT CONCEPT: COMPONENTS
//   A component is a function that returns HTML-like JSX.
//   You build complex UIs by combining small components together.
//   Think of components like LEGO bricks.
//
//   App.jsx is the base plate.
//   ScoreCard, CategoryBars, SitesList are the bricks on top.
//
// KEY REACT CONCEPT: STATE (useState)
//   State is data that can change over time.
//   When state changes → React automatically re-draws the component.
//   It's like a variable, but smarter — React watches it.
//
// KEY REACT CONCEPT: EFFECTS (useEffect)
//   An effect is code that runs AFTER the component draws.
//   We use it here to read from chrome.storage after the popup opens.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import ScoreCard from "./components/ScoreCard";
import CategoryBars from "./components/CategoryBars";
import SitesList from "./components/SitesList";

// ── HELPER: format seconds → "1h 23m" ────────────────────────
// We define this here and pass it to child components as needed.
// Keeping it in one place means if you change the format,
// it updates everywhere automatically.
export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

// ── COLOUR MAP: category → colours ───────────────────────────
export const COLOURS = {
  Work: { main: "#639922", bg: "#EAF3DE", text: "#27500A" },
  Learning: { main: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
  Distraction: { main: "#D85A30", bg: "#FAECE7", text: "#712B13" },
  Uncategorized: { main: "#888780", bg: "#F1EFE8", text: "#444441" },
};

// ══════════════════════════════════════════════════════════════
// THE APP COMPONENT
// ══════════════════════════════════════════════════════════════

export default function App() {
  // ── STATE ─────────────────────────────────────────────────
  // useState(null) creates a state variable starting as null.
  // Returns two things:
  //   data        = the current value
  //   setData     = a function to update it
  //
  // When setData() is called, React re-renders the component
  // with the new value. That's how the popup updates itself.

  const [data, setData] = useState(null); // raw storage data
  const [loading, setLoading] = useState(true); // are we still loading?

  // ── EFFECT: read storage when popup opens ─────────────────
  // useEffect(() => { ... }, []) runs ONCE after the first render.
  // The empty array [] at the end means "only run once on mount".
  //
  // "Mount" = when the component appears on screen for the first time.

  useEffect(() => {
    async function loadData() {
      const today = new Date().toISOString().split("T")[0];
      const key = `data_${today}`;

      // chrome.storage.local is available in extension popups
      const result = await chrome.storage.local.get(key);
      const todayData = result[key] || {};

      setData(todayData); // update state → triggers re-render
      setLoading(false); // done loading
    }

    loadData();
  }, []); // ← empty array = run once on mount

  // ── PROCESS DATA ──────────────────────────────────────────
  // We compute grouped + totalSeconds from the raw data.
  // This runs every time data changes (React re-runs the function).

  const grouped = {};
  let totalSeconds = 0;

  if (data) {
    for (const domain of Object.keys(data)) {
      const entry = data[domain];
      grouped[entry.category] = (grouped[entry.category] || 0) + entry.seconds;
      totalSeconds += entry.seconds;
    }
  }

  // ── RENDER ────────────────────────────────────────────────
  // This is what the component draws on screen.
  // JSX looks like HTML but it's actually JavaScript.
  //
  // Rules of JSX:
  //   1. Every element must be closed: <div></div> or <br />
  //   2. Use className instead of class (class is a JS keyword)
  //   3. JavaScript goes inside curly braces: {variable}
  //   4. You can only return ONE root element
  //      (wrap siblings in <> ... </> if needed — called a Fragment)

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          padding: "24px 16px",
          textAlign: "center",
          color: "#aaa",
          fontSize: "12px",
        }}
      >
        Loading your data...
      </div>
    );
  }

  // Empty state — no data yet
  if (!data || Object.keys(data).length === 0) {
    return (
      <>
        <Header />
        <div
          style={{
            padding: "24px 16px",
            textAlign: "center",
            color: "#aaa",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          No data yet!
          <br />
          Browse around and come back.
        </div>
      </>
    );
  }

  // Main state — we have data
  return (
    <>
      {/* Header is always shown */}
      <Header />

      {/* Score card: gets the grouped data and total */}
      <ScoreCard grouped={grouped} totalSeconds={totalSeconds} />

      {/* Category bars: gets grouped + total to draw proportions */}
      <CategoryBars grouped={grouped} totalSeconds={totalSeconds} />

      {/* Sites list: gets the raw per-domain data */}
      <SitesList data={data} />
    </>
  );
}

// ── HEADER COMPONENT (small, lives here since it's simple) ───
// Notice: this is a separate component defined in the same file.
// You CAN do this for tiny components. For bigger ones, use separate files.

function Header() {
  // Format today's date nicely: "Monday, March 18, 2025"
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      style={{ padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f0" }}
    >
      <h1 style={{ fontSize: "14px", fontWeight: 600 }}>
        Where Did My Time Go?
      </h1>
      <p style={{ fontSize: "11px", color: "#999", marginTop: "2px" }}>
        {dateStr}
      </p>
    </div>
  );
}
