// SitesList.jsx
// ─────────────────────────────────────────────────────────────
// Shows individual websites ranked by time spent.
//
// KEY REACT CONCEPT: CONDITIONAL RENDERING
//   In React, you can show/hide things based on conditions.
//   We do this in a few ways:
//
//   1. Ternary:    condition ? <ShowThis /> : <ShowThat />
//   2. AND:        condition && <ShowThis />   (shows nothing if false)
//   3. Early return: if (noData) return <EmptyState />
//
//   This component uses .map() again (like CategoryBars)
//   to render the sorted list of sites.
// ─────────────────────────────────────────────────────────────

import { COLOURS, formatTime } from "../App";

export default function SitesList({ data }) {
  // Object.entries() turns { "github.com": { seconds, category } }
  // into [ ["github.com", { seconds, category }], ... ]
  // so we can sort and map over it.

  const sorted = Object.entries(data)
    .sort(([, a], [, b]) => b.seconds - a.seconds) // sort highest → lowest
    .slice(0, 7); // top 7 only

  return (
    <div style={{ padding: "10px 16px 14px" }}>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "#aaa",
          marginBottom: "8px",
        }}
      >
        Top sites today
      </div>

      {sorted.map(([domain, entry]) => {
        // COLOURS[entry.category] gets the colour config for this category.
        // The || fallback handles any category not in our map.
        const colours = COLOURS[entry.category] || COLOURS["Uncategorized"];
        const initial = domain[0].toUpperCase(); // first letter of domain

        return (
          <div
            key={domain}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "7px",
            }}
          >
            {/* First-letter favicon placeholder */}
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "4px",
                background: "#f5f5f5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                fontWeight: 600,
                color: "#666",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>

            {/* Domain name — truncates with "..." if too long */}
            <div
              style={{
                flex: 1,
                fontSize: "12px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {domain}
            </div>

            {/* Category badge pill */}
            <div
              style={{
                fontSize: "10px",
                padding: "1px 6px",
                borderRadius: "10px",
                background: colours.bg,
                color: colours.text,
                flexShrink: 0,
              }}
            >
              {entry.category}
            </div>

            {/* Time */}
            <div
              style={{
                fontSize: "11px",
                color: "#888",
                minWidth: "34px",
                textAlign: "right",
              }}
            >
              {formatTime(entry.seconds)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
