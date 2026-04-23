// ScoreCard.jsx
// ─────────────────────────────────────────────────────────────
// Shows the productivity score circle + description.
//
// KEY REACT CONCEPT: PROPS
//   Props (short for "properties") are how a parent component
//   sends data to a child component.
//
//   In App.jsx we wrote:
//     <ScoreCard grouped={grouped} totalSeconds={totalSeconds} />
//
//   Here, we receive those as:
//     function ScoreCard({ grouped, totalSeconds })
//
//   It's like a function receiving arguments.
//   Parent passes data IN → child uses it to render.
//   Data only flows ONE WAY: parent → child. Never the reverse.
// ─────────────────────────────────────────────────────────────

import { formatTime } from "../App";

// ── HELPER: calculate the score ───────────────────────────────
function calcScore(grouped) {
  const productive = (grouped["Work"] || 0) + (grouped["Learning"] || 0);
  const total =
    (grouped["Work"] || 0) +
    (grouped["Learning"] || 0) +
    (grouped["Distraction"] || 0) +
    (grouped["Uncategorized"] || 0);
  if (total === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((productive / total) * 100)));
}

// ── HELPER: score → human label ───────────────────────────────
function scoreLabel(score) {
  if (score >= 90) return "Outstanding focus!";
  if (score >= 75) return "Really productive day";
  if (score >= 60) return "Pretty good progress";
  if (score >= 40) return "Room to improve";
  if (score >= 20) return "Distraction heavy day";
  return "Let's refocus!";
}

// ── HELPER: score → colours ───────────────────────────────────
function scoreColours(score) {
  if (score >= 70) return { bg: "#EAF3DE", text: "#27500A" }; // green
  if (score >= 40) return { bg: "#FAEEDA", text: "#633806" }; // amber
  return { bg: "#FCEBEB", text: "#791F1F" }; // red
}

// ══════════════════════════════════════════════════════════════
// THE COMPONENT
// ══════════════════════════════════════════════════════════════
//
// Destructuring in the parameter: { grouped, totalSeconds }
// This is the same as writing:
//   function ScoreCard(props) {
//     const grouped      = props.grouped;
//     const totalSeconds = props.totalSeconds;
//   }
// Just shorter and cleaner.

export default function ScoreCard({ grouped, totalSeconds }) {
  const score = calcScore(grouped);
  const colours = scoreColours(score);
  const label = scoreLabel(score);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      {/* The circle — colour changes based on score */}
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: colours.bg,
          color: colours.text,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: "20px", fontWeight: 600, lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: "9px", marginTop: "1px", opacity: 0.7 }}>
          score
        </span>
      </div>

      {/* The text beside the circle */}
      <div>
        <div style={{ fontSize: "13px", fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
          {formatTime(totalSeconds)} tracked today
        </div>
      </div>
    </div>
  );
}

// import React from "react";

// function ScoreCard() {
//   const score = 74;
//   const messageProvider = (score) => {
//     if (score > 70) return "Pretty productive day";
//     else return "This day could have been better";
//   };
//   const timeTracked = `10 hr 30 min`;
//   return (
//     <div className="card">
//       <div className="score-circle">
//         <span>
//           {score}
//           <span> Score</span>
//         </span>
//       </div>
//       <div>
//         {`${messageProvider(score)}
//          ${timeTracked} tracked so far!`}
//       </div>
//     </div>
//   );
// }

// export default ScoreCard;
