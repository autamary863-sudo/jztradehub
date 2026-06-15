// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Log that the app is starting
console.log("🚀 JZTradeHub is starting...");
console.log("📦 Environment:", import.meta.env.MODE);
console.log("🔗 API URL:", import.meta.env.VITE_API_URL || "http://localhost:5000");

// Get the root element
const rootElement = document.getElementById("root");

// Verify root element exists
if (!rootElement) {
  console.error("❌ Root element not found! Make sure index.html has <div id='root'></div>");
  throw new Error("Root element not found");
}

// Create and render the app
const root = createRoot(rootElement);

// Render with error boundary
try {
  root.render(<App />);
  console.log("✅ App rendered successfully!");
} catch (error) {
  console.error("❌ Failed to render app:", error);
  
  // Show fallback error UI
  rootElement.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; padding: 20px; text-align: center;">
      <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6, #10b981); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
        <span style="font-size: 40px; color: white;">⚠️</span>
      </div>
      <h1 style="font-size: 24px; margin-bottom: 12px; color: #1e3c72;">Something went wrong</h1>
      <p style="color: #6c8192; margin-bottom: 24px;">Failed to load the application. Please try again later.</p>
      <button onclick="location.reload()" style="padding: 12px 24px; background: linear-gradient(135deg, #3b82f6, #10b981); color: white; border: none; border-radius: 40px; font-weight: 600; cursor: pointer;">Refresh Page</button>
    </div>
  `;
}
