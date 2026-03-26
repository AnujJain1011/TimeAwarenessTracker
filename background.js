// background.js
// This file runs silently in the background, always listening.
// In Phase 1, we just confirm it's alive.

chrome.runtime.onInstalled.addListener(() => {
  console.log("Time Tracker installed and running!");
});

// Phase 2

// background.js — Phase 2: Track active tab + measure time
//
// HOW IT WORKS:
//   We keep track of two things:
//     1. activeTab   — the domain currently being visited
//     2. startTime   — when the user switched to that tab
//
//   Every time the user switches tabs or windows, we:
//     a) Calculate how long they were on the LAST tab
//     b) Add that time to storage
//     c) Start the clock fresh for the NEW tab

let activeTab = null;   // e.g. "github.com"
let startTime = null;   // timestamp in milliseconds


// ─── HELPER: extract domain from a URL ───────────────────────────────────────
// "https://github.com/user/repo" → "github.com"
function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;  // invalid URL (e.g. chrome:// pages) — we ignore these
  }
}


// ─── HELPER: save time to storage ────────────────────────────────────────────
// Reads today's data, adds the new seconds, writes it back.
async function saveTime(domain, seconds) {
  if (!domain || seconds < 1) return;  // ignore tiny blips under 1 second

  const today = new Date().toISOString().split("T")[0]; // "2025-03-18"
  const key = `data_${today}`;

  // chrome.storage.local stores key → value pairs.
  // We store one object per day: { "github.com": 340, "youtube.com": 120 }
  const result = await chrome.storage.local.get(key);
  const todayData = result[key] || {};

  // Add the new seconds on top of whatever was already saved
  todayData[domain] = (todayData[domain] || 0) + Math.round(seconds);

  await chrome.storage.local.set({ [key]: todayData });
  console.log(`Saved: ${domain} +${Math.round(seconds)}s → total: ${todayData[domain]}s`);
}


// ─── HELPER: handle a tab change ─────────────────────────────────────────────
// Called every time the active tab/window changes.
async function handleTabChange(newUrl) {
  const now = Date.now();

  // Step 1: Save time for the tab we're LEAVING
  if (activeTab && startTime) {
    const secondsSpent = (now - startTime) / 1000;
    await saveTime(activeTab, secondsSpent);
  }

  // Step 2: Start tracking the NEW tab
  const newDomain = getDomain(newUrl);
  activeTab = newDomain;
  startTime = now;
}


// ─── LISTENER 1: user switches to a different tab ────────────────────────────
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    handleTabChange(tab.url);
  }
});


// ─── LISTENER 2: user switches to a different window ─────────────────────────
chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User switched away from Chrome entirely — save time, pause tracking
    if (activeTab && startTime) {
      const secondsSpent = (Date.now() - startTime) / 1000;
      await saveTime(activeTab, secondsSpent);
      activeTab = null;
      startTime = null;
    }
    return;
  }

  // User switched back to Chrome — find the active tab in the focused window
  const tabs = await chrome.tabs.query({ active: true, windowId });
  if (tabs[0]?.url) {
    handleTabChange(tabs[0].url);
  }
});


// ─── LISTENER 3: tab URL changes (e.g. navigating within same tab) ───────────
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active && tab.url) {
    handleTabChange(tab.url);
  }
});


// ─── ON INSTALL: confirm everything is wired up ───────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log("Time Tracker Phase 2 running — watching your tabs!");
});
