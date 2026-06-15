import process from "node:process";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// Load .env so server-side process.env gets all vars (not just VITE_*)
const envDir = resolve(import.meta.dirname ?? ".");
const envFiles = [".env", ".env.local"];
for (const f of envFiles) {
  try {
    const p = resolve(envDir, f);
    const content = readFileSync(p, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
        val = val.slice(1, -1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}
// TanStack Start internal — must be set for dev-mode server function routing
if (!process.env.TSS_SERVER_FN_BASE) process.env.TSS_SERVER_FN_BASE = "/_server/fn/";

export default defineConfig({
  plugins: [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(),
    react(),
  ],
  css: { transformer: "lightningcss" },
  define: {
    "process.env.TSS_SERVER_FN_BASE": JSON.stringify("/_server/fn/"),
  },
  server: {
    host: "::",
    port: 8080,
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
  },
});
