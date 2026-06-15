import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { empNoToEmail } from "@/lib/auth";

const createSchema = z.object({
  empNo: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  password: z.string().min(6).max(72),
  emp_name: z.string().min(1).max(120),
  dept: z.string().max(80).optional().default(""),
  designation: z.string().max(80).optional().default(""),
  role: z.enum(["sys_admin", "dept_admin", "dept_user", "ppm_admin", "ppm_user"]),
});

export const Route = createFileRoute("/api/admin/create-user")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsed = createSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
        }
        const data = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const authorization = request.headers.get("authorization") ?? "";
        if (!authorization.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authorization.slice(7);

        const { createClient } = await import("@supabase/supabase-js");

        const userSupabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
          },
        );

        const { data: userData, error: userErr } = await userSupabase.auth.getUser(token);
        if (userErr || !userData.user) {
          return Response.json({ error: "Invalid token" }, { status: 401 });
        }
        const userId = userData.user.id;

        const { data: isAdmin } = await userSupabase.rpc("is_admin", { _user_id: userId });
        if (!isAdmin) {
          return Response.json({ error: "Forbidden: admin role required" }, { status: 403 });
        }

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: empNoToEmail(data.empNo),
          password: data.password,
          email_confirm: true,
        });
        if (createErr || !created.user) {
          return Response.json({ error: createErr?.message || "Could not create user" }, { status: 500 });
        }
        const uid = created.user.id;

        const { error: pErr } = await supabaseAdmin.from("profiles").insert({
          id: uid,
          emp_no: data.empNo,
          emp_name: data.emp_name,
          dept: data.dept || null,
          designation: data.designation || null,
          active: true,
        });
        if (pErr) {
          await supabaseAdmin.auth.admin.deleteUser(uid);
          return Response.json({ error: pErr.message }, { status: 500 });
        }

        await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });

        return Response.json({ ok: true, id: uid });
      },
    },
  },
});
