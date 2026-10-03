import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const theme = await readFile(new URL("../styles/theme.css", import.meta.url), "utf8");
const required = ["Dashboard", "Portfolio", "Watchlist", "Alerts", "Settings", "/api/v1/portfolio", "/api/v1/watchlist", "alerts/history", "market/quotes"];
for (const value of required) {
  if (!source.includes(value)) throw new Error("missing UI/API marker: " + value);
}
for (const value of [".ms-shell", ".ms-sidebar", ".ms-card", ".ms-table"]) {
  if (!theme.includes(value)) throw new Error("missing theme marker: " + value);
}
console.log("frontend smoke tests passed");
