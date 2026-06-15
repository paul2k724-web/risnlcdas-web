import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/landing-stats")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const [{ count: eqptCount }, { count: delaysCount }, { data: shopRows }, { data: durRows }] =
            await Promise.all([
              supabaseAdmin.from("eqpt_master").select("id", { count: "exact", head: true }),
              supabaseAdmin.from("delays_data").select("id", { count: "exact", head: true }),
              supabaseAdmin.from("eqpt_master").select("shop_code"),
              supabaseAdmin.from("delays_data").select("delay_duration"),
            ]);

          const shops = new Set((shopRows ?? []).map((r) => r.shop_code)).size;
          const durations = (durRows ?? [])
            .map((r) => Number(r.delay_duration))
            .filter((n) => !Number.isNaN(n) && n > 0);
          const avg = durations.length
            ? durations.reduce((a, b) => a + b, 0) / durations.length
            : 0;

          return Response.json({
            equipment: eqptCount ?? 0,
            shops,
            delays: delaysCount ?? 0,
            avgHours: Math.round(avg * 10) / 10,
          });
        } catch {
          return Response.json({ equipment: 0, shops: 0, delays: 0, avgHours: 0 });
        }
      },
    },
  },
});
