// vite.config.js
// ─────────────────────────────────────────────────────────────
// Vite is the tool that compiles your React code into
// plain JavaScript that Chrome can understand.
//
// This config file tells Vite:
//   1. We're building a React app
//   2. Output the compiled files into the PARENT folder
//      (so popup.html and popup.js land in the extension root)
//   3. Name the output file "popup.js" (not a random hash name)
// ─────────────────────────────────────────────────────────────

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  build: {
    // Output goes one level UP — into the extension root folder
    // ".." means "go up one folder from where we are"
    outDir: "../..",

    // Don't delete the parent folder contents when building
    // (we don't want it to wipe out background.js, categories.js etc.)
    emptyOutDir: false,

    rollupOptions: {
      input: "popup.html", // the entry HTML file
      output: {
        // Name the JS file "popup.js" instead of a random hash
        entryFileNames: "popup.js",

        // Put any extra JS chunks in the same folder
        chunkFileNames: "[name].js",

        // Put CSS and other assets in the same folder too
        assetFileNames: "[name].[ext]",
      },
    },
  },
});
