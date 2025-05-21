import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Web3Provider } from "./web3-provider";
import { ReferrerTracker } from "./ReferrerTracker.ts";
const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

createRoot(rootElement).render(
  <Web3Provider>
    <ReferrerTracker />
    <App />
  </Web3Provider>
);
