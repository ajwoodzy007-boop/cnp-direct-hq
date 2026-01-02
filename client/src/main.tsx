import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("🚀 React app mounting...");

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("❌ Root element not found!");
  throw new Error("Root element not found");
}

console.log("✅ Root element found, creating React root...");
const root = createRoot(rootElement);

console.log("✅ React root created, rendering app...");
try {
  root.render(<App />);
  console.log("✅ App rendered successfully!");
} catch (error) {
  console.error("❌ Error rendering app:", error);
  document.body.innerHTML = `<div style="color: red; font-family: monospace; padding: 20px;">Error: ${error}</div>`;
}
