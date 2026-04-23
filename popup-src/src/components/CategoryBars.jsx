// CategoryBars.jsx
// ─────────────────────────────────────────────────────────────
// Draws one horizontal bar per category.
//
// KEY REACT CONCEPT: RENDERING LISTS WITH .map()
//   When you want to draw a list of similar things,
//   you use JavaScript's .map() method.
//
//   .map() transforms an array into another array.
//   Here, we transform an array of category names
//   into an array of JSX elements (the bar rows).
//
//   Example:
//     ["Work", "Learning"].map(cat => <div>{cat}</div>)
//     → [<div>Work</div>, <div>Learning</div>]
//
//   React then renders all of them on screen.
//
//   THE KEY PROP:
//   When rendering lists, React needs a unique "key" on each item.
//   It uses this to track which items changed, added, or removed.
//   Without it, React can't efficiently update the list.
//   We use the category name as the key since it's always unique.
// ─────────────────────────────────────────────────────────────

import { COLOURS, formatTime } from "../App";

// The order we want to display categories in
const CAT_ORDER = ["Work", "Learning", "Distraction", "Uncategorized"];

export default function CategoryBars({ grouped, totalSeconds }) {
  // Filter to only categories that have time recorded
  const activeCategories = CAT_ORDER.filter((cat) => grouped[cat] > 0);

  return (
    <div style={{ padding: "10px 16px", borderBottom: "1px solid #f0f0f0" }}>
      {/*
        .map() here turns each category name into a bar row.
        key={cat} is required — it helps React track each row.
      */}
      {activeCategories.map((cat) => {
        const secs = grouped[cat];
        const colours = COLOURS[cat];
        const barWidth = Math.round((secs / totalSeconds) * 100);

        return (
          <div
            key={cat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            {/* Coloured dot */}
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: colours.main,
                flexShrink: 0,
              }}
            />

            {/* Category name */}
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                width: "88px",
                flexShrink: 0,
              }}
            >
              {cat}
            </div>

            {/* The bar track (grey background) */}
            <div
              style={{
                flex: 1,
                height: "6px",
                background: "#f0f0f0",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              {/* The bar fill (coloured, width = percentage of total) */}
              <div
                style={{
                  height: "100%",
                  width: `${barWidth}%`,
                  background: colours.main,
                  borderRadius: "3px",
                }}
              />
            </div>

            {/* Time label */}
            <div
              style={{
                fontSize: "11px",
                color: "#888",
                minWidth: "36px",
                textAlign: "right",
              }}
            >
              {formatTime(secs)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
