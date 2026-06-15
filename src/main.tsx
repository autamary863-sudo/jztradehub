// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("main.tsx is running!");

const rootElement = document.getElementById("root");
console.log("Root element:", rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("App rendered!");
} else {
  console.error("Root element not found!");
}