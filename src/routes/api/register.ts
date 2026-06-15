import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { empNoToEmail } from "@/lib/auth";

const registerSchema = z.object({
  empNo: z.string().min(3).max(40).regex(/^[A-Za-z0-9_-]+$/),
  password: z.string().min(6).max(72),
  emp_name: z.string().min(2).max(120),
  dept: z.string().min(1).max(80),
  designation: z.string().max(80).optional().default(""),
  email: z.string().email().max(160).optional().or(z.literal("")),
});

export const Route = createFileRoute("/api/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
        }
        const data = parsed.data;

        let supabaseAdmin;
        try {
          const mod = await import("@/integrations/supabase/client.server");
          supabaseAdmin = mod.supabaseAdmin;
        } catch {
          return Response.json({ error: "Server configuration incomplete" }, { status: 500 });
        }

        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("emp_no", data.empNo)
          .maybeSingle();
        if (existing) {
          return Response.json({ error: "Employee number already registered" }, { status: 409 });
        }

        const authEmail = data.email && data.email.length > 0 ? data.email : empNoToEmail(data.empNo);
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: authEmail,
          password: data.password,
          email_confirm: true,
        });
        if (createErr || !created.user) {
          return Response.json({ error: createErr?.message || "Could not create account" }, { status: 500 });
        }
        const uid = created.user.id;

        const { error: pErr } = await supabaseAdmin.from("profiles").insert({
          id: uid,
          emp_no: data.empNo,
          emp_name: data.emp_name,
          dept: data.dept,
          designation: data.designation || null,
          active: true,
        });
        if (pErr) {
          await supabaseAdmin.auth.admin.deleteUser(uid);
          return Response.json({ error: pErr.message }, { status: 500 });
        }

        await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "dept_user" });

        return Response.json({ ok: true });
      },
    },
  },
});
