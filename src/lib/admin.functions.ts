import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { empNoToEmail } from "@/lib/auth";

const createSchema = z.object({
  empNo: z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/),
  password: z.string().min(6).max(72),
  emp_name: z.string().min(1).max(120),
  dept: z.string().max(80).optional().default(""),
  designation: z.string().max(80).optional().default(""),
  role: z.enum(["sys_admin", "dept_admin", "dept_user", "ppm_admin", "ppm_user"]),
});

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", {
      _user_id: context.userId,
    });
    if (!isAdmin) throw new Error("Forbidden: admin role required");

    let supabaseAdmin;
    try {
      const mod = await import("@/integrations/supabase/client.server");
      supabaseAdmin = mod.supabaseAdmin;
    } catch {
      throw new Error("Admin operations unavailable: server configuration incomplete.");
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: empNoToEmail(data.empNo),
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || "Could not create user");
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
      throw new Error(pErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });

    return { ok: true, id: uid };
  });
