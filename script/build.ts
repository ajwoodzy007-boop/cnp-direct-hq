/**
 * Build Script - Sanitized
 * Removed 'yahoo-finance2' from external dependencies to allow 
 * clean uninstallation and prevent build-time crashes.
 */
const forceExternal = [
  "stripe",
  "stripe-replit-sync"
  // REMOVED: "yahoo-finance2"
];

async function buildAll() {
  console.log("[Build] Starting production build...");
  console.log(`[Build] External dependencies: ${forceExternal.join(", ")}`);
  
  // Build logic continues...
  return true;
}

buildAll().catch((err) => {
  console.error("[Build] Failed:", err);
  process.exit(1);
});
