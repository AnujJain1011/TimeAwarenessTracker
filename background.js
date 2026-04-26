// background.js — FIXED: Survives service worker sleep/wake cycles
// ─────────────────────────────────────────────────────────────
// THE BUG WE'RE FIXING:
//   Before: activeTab and startTime were plain JS variables (let).
//           When Chrome killed the service worker → variables wiped.
//           When it woke up → no memory of what tab was open.
//           Result: most tracked time was lost.
//
// THE FIX:
//   Save activeTab and startTime to chrome.storage.session immediately.
//   chrome.storage.session = persists as long as Chrome is open,
//   survives service worker restarts, but clears when Chrome closes.
//   Perfect for "what am I currently tracking?" state.
//
// MENTAL MODEL:
//   Before fix: notes written on a whiteboard that gets erased randomly
//   After fix:  notes written in a notebook that always stays on the desk
// ─────────────────────────────────────────────────────────────

importScripts("categories.js");

// ══════════════════════════════════════════════════════════════
// HELPER: READ current tracking state from storage
// ══════════════════════════════════════════════════════════════
// Instead of reading two separate variables, we read one object
// from storage that holds both pieces of state together.
//
// Returns: { activeTab: "github.com", startTime: 1234567890 }
// Or:      { activeTab: null, startTime: null }  if nothing tracked yet

async function getTrackingState() {
  const result = await chrome.storage.session.get("trackingState");
  return result.trackingState || { activeTab: null, startTime: null };
}

// ══════════════════════════════════════════════════════════════
// HELPER: SAVE current tracking state to storage
// ══════════════════════════════════════════════════════════════
// Called every time we switch tabs — updates what we're tracking now.

async function setTrackingState(activeTab, startTime) {
  await chrome.storage.session.set({
    trackingState: { activeTab, startTime },
  });
}

// ══════════════════════════════════════════════════════════════
// HELPER: Extract domain from a URL
// ══════════════════════════════════════════════════════════════
// "https://www.github.com/user/repo" → "github.com"

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null; // chrome:// pages and invalid URLs return null
  }
}

// ══════════════════════════════════════════════════════════════
// HELPER: Save time duration to storage
// ══════════════════════════════════════════════════════════════
// Same as before — adds seconds to today's data for a domain.

async function saveTime(domain, seconds) {
  if (!domain || seconds < 1) return;

  const today = new Date().toISOString().split("T")[0];
  const key = `data_${today}`;

  const category = await getCategoryForDomain(domain);
  const result = await chrome.storage.local.get(key);
  const todayData = result[key] || {};

  if (todayData[domain]) {
    todayData[domain].seconds += Math.round(seconds);
  } else {
    todayData[domain] = { seconds: Math.round(seconds), category };
  }

  await chrome.storage.local.set({ [key]: todayData });
  console.log(
    `Saved: ${domain} (${category}) +${Math.round(seconds)}s → total: ${
      todayData[domain].seconds
    }s`
  );
}

// ══════════════════════════════════════════════════════════════
// CORE: Handle any tab change
// ══════════════════════════════════════════════════════════════
// THE KEY DIFFERENCE from before:
//   Before: read activeTab/startTime from memory variables (got wiped)
//   After:  read from chrome.storage.session (survives sleep)
//
// This means even if the service worker was asleep for 2 hours
// and just woke up, it can still recover:
//   "Oh, the user was on youtube.com since 2:00pm — that's 2 hours!"

async function handleTabChange(newUrl) {
  const now = Date.now();

  // Read the PERSISTED state (not a memory variable)
  const { activeTab, startTime } = await getTrackingState();

  // ── Finish timing the old tab ──────────────────────────
  if (activeTab && startTime) {
    const secondsSpent = (now - startTime) / 1000;
    await saveTime(activeTab, secondsSpent);
  }

  // ── Start timing the new tab ───────────────────────────
  const newDomain = getDomain(newUrl);

  // Save new state to storage immediately
  // So even if Chrome kills the service worker right now,
  // the next time it wakes up it knows what to pick up from
  await setTrackingState(newDomain, now);
}

// ══════════════════════════════════════════════════════════════
// LISTENER 1: User switches tab
// ══════════════════════════════════════════════════════════════

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (tab.url) {
    await handleTabChange(tab.url);
  }
});

// ══════════════════════════════════════════════════════════════
// LISTENER 2: User switches window or leaves Chrome
// ══════════════════════════════════════════════════════════════

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // User left Chrome — save current tab's time and stop tracking
    const now = Date.now();
    const { activeTab, startTime } = await getTrackingState();

    if (activeTab && startTime) {
      const secondsSpent = (now - startTime) / 1000;
      await saveTime(activeTab, secondsSpent);
    }

    // Clear the tracking state — we're not on any tab
    await setTrackingState(null, null);
    return;
  }

  // User came back to Chrome — find active tab and start tracking
  const tabs = await chrome.tabs.query({ active: true, windowId });
  if (tabs[0]?.url) {
    await handleTabChange(tabs[0].url);
  }
});

// ══════════════════════════════════════════════════════════════
// LISTENER 3: Page finishes loading (same tab navigation)
// ══════════════════════════════════════════════════════════════

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active && tab.url) {
    await handleTabChange(tab.url);
  }
});

// ══════════════════════════════════════════════════════════════
// LISTENER 4: Service worker wakes up — recover state
// ══════════════════════════════════════════════════════════════
// NEW — this didn't exist before.
//
// chrome.runtime.onStartup fires when Chrome starts.
// But more importantly, when the service worker wakes up
// after being killed, it re-runs this whole file top to bottom.
//
// We use this moment to "re-anchor" — find the current active tab
// and start timing from NOW. We can't recover the exact time
// the service worker was asleep, but we save everything up to
// the sleep moment (that happened in handleTabChange earlier).
//
// This listener + the storage fix together give much better accuracy.

chrome.runtime.onStartup.addListener(async () => {
  console.log("Service worker started — recovering tracking state");

  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs[0]?.url) {
    // Save the previous tab's time up to now, start fresh on current tab
    await handleTabChange(tabs[0].url);
  }
});

// ══════════════════════════════════════════════════════════════
// MANIFEST UPDATE: add "storage" session permission
// ══════════════════════════════════════════════════════════════
// REMINDER: You need to add "storage" to your manifest.json
// permissions array if it's not already there.
// chrome.storage.session also needs no extra permission —
// it's included under "storage".

chrome.runtime.onInstalled.addListener(() => {
  console.log("Time Tracker FIXED — now survives service worker restarts!");
});

// ---- old code ---

// // background.js — Phase 3
// // ─────────────────────────────────────────────────────────────
// // This file runs silently in the background at all times.
// // You never see it. It just watches and records.
// //
// // Its job:
// //   1. Notice when you switch tabs
// //   2. Calculate how long you were on the last tab
// //   3. Figure out the category (Work / Learning / Distraction)
// //   4. Save all of that to storage
// // ─────────────────────────────────────────────────────────────

// // ── IMPORT categories.js ──────────────────────────────────────
// // importScripts() is like saying:
// //   "Hey, grab all the code from categories.js and bring it here"
// // After this line, we can use functions like getCategoryForDomain()
// // as if they were written in this file.

// importScripts("categories.js");

// // ── TWO VARIABLES WE TRACK ────────────────────────────────────
// // These are like sticky notes we update constantly.
// //
// //   activeTab = the website we're currently on
// //               (e.g. "github.com")
// //
// //   startTime = the exact moment we switched to that tab
// //               (stored as a number: milliseconds since 1970)
// //               (e.g. 1711234567890)
// //
// // When the user switches tabs, we:
// //   1. Look at startTime → calculate how many seconds passed
// //   2. Save that duration for activeTab
// //   3. Update both variables for the new tab

// let activeTab = null;
// let startTime = null;

// // ══════════════════════════════════════════════════════════════
// // HELPER FUNCTION 1 — Get the domain from a full URL
// // ══════════════════════════════════════════════════════════════
// //
// // The browser gives us full URLs like:
// //   "https://www.github.com/user/repo?tab=readme"
// //
// // We only want the domain:
// //   "github.com"
// //
// // new URL(url).hostname does the hard work of pulling out
// // just the hostname part. Then we remove "www." if it's there.
// //
// // The try/catch is a safety net.
// // Some tab URLs look like "chrome://extensions" — not real websites.
// // new URL() would crash on those, so we catch the error and return null.
// // Returning null tells the rest of our code: "ignore this tab".

// function getDomain(url) {
//   try {
//     return new URL(url).hostname.replace("www.", "");
//   } catch {
//     return null;
//   }
// }

// // ══════════════════════════════════════════════════════════════
// // HELPER FUNCTION 2 — Save time data to storage
// // ══════════════════════════════════════════════════════════════
// //
// // This function is marked "async" because it does storage operations,
// // which take a tiny amount of time. We need to WAIT for them.
// //
// // Think of async/await like this:
// //   Normal code:  "Go to the fridge and get milk" (instant)
// //   Async code:   "Order milk online" — you have to WAIT for delivery
// //                 The "await" keyword = "wait here until it arrives"
// //
// // What gets saved (one entry per day):
// //   Key:   "data_2025-03-18"
// //   Value: {
// //            "github.com":   { seconds: 340, category: "Work" },
// //            "youtube.com":  { seconds: 120, category: "Distraction" }
// //          }

// async function saveTime(domain, seconds) {
//   // Don't bother saving if there's no domain or less than 1 second
//   if (!domain || seconds < 1) return;

//   // Get today's date as a string like "2025-03-18"
//   // .toISOString() → "2025-03-18T14:30:00.000Z"
//   // .split("T")[0] → takes just the date part before the "T"
//   const today = new Date().toISOString().split("T")[0];
//   const key = `data_${today}`; // becomes "data_2025-03-18"

//   // Ask categories.js: what category is this domain?
//   // (it checks user overrides first, then our lookup table)
//   const category = await getCategoryForDomain(domain);

//   // Read whatever data we've already saved today
//   // result will be an object like: { "data_2025-03-18": { ... } }
//   const result = await chrome.storage.local.get(key);

//   // If we have data for today, use it. If not, start with empty {}
//   const todayData = result[key] || {};

//   // Add the new seconds to whatever we already have for this domain.
//   //
//   // IF we've seen this domain before today → just add to the seconds
//   // IF it's a new domain today → create a fresh entry for it
//   if (todayData[domain]) {
//     todayData[domain].seconds += Math.round(seconds);
//   } else {
//     todayData[domain] = { seconds: Math.round(seconds), category };
//   }

//   // Write the updated data back to storage
//   // { [key]: todayData } is shorthand for { "data_2025-03-18": todayData }
//   await chrome.storage.local.set({ [key]: todayData });

//   // Log it so we can see it working in the service worker console
//   console.log(
//     `Saved: ${domain} (${category}) +${Math.round(seconds)}s → total: ${
//       todayData[domain].seconds
//     }s`
//   );
// }

// // ══════════════════════════════════════════════════════════════
// // HELPER FUNCTION 3 — Handle any tab change
// // ══════════════════════════════════════════════════════════════
// //
// // This is called every time something changes — tab switch,
// // window switch, page navigation. It does two things:
// //
// //   1. FINISH timing the OLD tab (save its duration)
// //   2. START timing the NEW tab (record when we arrived)

// async function handleTabChange(newUrl) {
//   // Date.now() gives the current time as a number (milliseconds)
//   const now = Date.now();

//   // ── FINISH the old tab ────────────────────────────────
//   // If we were already tracking something (activeTab is not null)...
//   if (activeTab && startTime) {
//     // Calculate how many seconds we spent there
//     // (now - startTime) gives milliseconds, divide by 1000 = seconds
//     const secondsSpent = (now - startTime) / 1000;

//     // Save it
//     await saveTime(activeTab, secondsSpent);
//   }

//   // ── START the new tab ─────────────────────────────────
//   // Extract the domain from the new URL
//   const newDomain = getDomain(newUrl);

//   // Update our sticky notes
//   activeTab = newDomain;
//   startTime = now;
// }

// // ══════════════════════════════════════════════════════════════
// // LISTENER 1 — User clicks a different tab
// // ══════════════════════════════════════════════════════════════
// //
// // chrome.tabs.onActivated fires whenever the active tab changes.
// // activeInfo.tabId tells us which tab just became active.
// // We look up its full details (including URL) with chrome.tabs.get()

// chrome.tabs.onActivated.addListener(async (activeInfo) => {
//   const tab = await chrome.tabs.get(activeInfo.tabId);
//   if (tab.url) {
//     handleTabChange(tab.url);
//   }
// });

// // ══════════════════════════════════════════════════════════════
// // LISTENER 2 — User switches windows (or Alt+Tabs away)
// // ══════════════════════════════════════════════════════════════
// //
// // chrome.windows.onFocusChanged fires when the focused window changes.
// // WINDOW_ID_NONE is a special value meaning "no Chrome window is focused"
// // (the user switched to another app entirely)

// chrome.windows.onFocusChanged.addListener(async (windowId) => {
//   if (windowId === chrome.windows.WINDOW_ID_NONE) {
//     // User left Chrome — save the current tab's time and stop tracking
//     if (activeTab && startTime) {
//       const secondsSpent = (Date.now() - startTime) / 1000;
//       await saveTime(activeTab, secondsSpent);
//       activeTab = null; // reset — we're not on any tab now
//       startTime = null;
//     }
//     return; // stop here, nothing more to do
//   }

//   // User came back to Chrome — find out which tab is active
//   const tabs = await chrome.tabs.query({ active: true, windowId });
//   if (tabs[0]?.url) {
//     handleTabChange(tabs[0].url);
//   }
// });

// // ══════════════════════════════════════════════════════════════
// // LISTENER 3 — Page finishes loading in the current tab
// // ══════════════════════════════════════════════════════════════
// //
// // This catches navigation within the same tab.
// // Example: you're on google.com and you search something —
// // the tab URL changes to google.com/search?q=...
// // That counts as a new "site" so we re-trigger tracking.
// //
// // changeInfo.status === "complete" means the page fully loaded
// // tab.active means it's the currently visible tab

// chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
//   if (changeInfo.status === "complete" && tab.active && tab.url) {
//     handleTabChange(tab.url);
//   }
// });

// // ══════════════════════════════════════════════════════════════
// // STARTUP MESSAGE
// // ══════════════════════════════════════════════════════════════
// // This runs once when the extension is first installed or updated.
// // Check it in the service worker console to confirm everything loaded.

// chrome.runtime.onInstalled.addListener(() => {
//   console.log("Time Tracker Phase 3 running — tracking + categorizing!");
// });
