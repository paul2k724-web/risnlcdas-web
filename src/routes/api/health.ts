import { createFileRoute } from "@tanstack/react-router";
import process from "node:process";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const envOk = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
        return Response.json(
          {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            env: {
              supabase_configured: envOk,
              node_env: process.env.NODE_ENV || "development",
            },
          },
          {
            status: 200,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "application/json",
            },
          },
        );
      },
    },
  },
});
