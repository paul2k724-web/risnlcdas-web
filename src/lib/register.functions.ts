import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { empNoToEmail } from "@/lib/auth";

const registerSchema = z.object({
  empNo: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, - and _ allowed"),
  password: z.string().min(6).max(72),
  emp_name: z.string().min(2).max(120),
  dept: z.string().min(1).max(80),
  designation: z.string().max(80).optional().default(""),
  // Optional real email — when provided the worker can also sign in with it.
  email: z.string().email().max(160).optional().or(z.literal("")),
});

// Public self-registration for plant employees. By design this endpoint is
// unauthenticated (any worker can create their own account) but it ALWAYS
// assigns the lowest-privilege role (dept_user). Admin roles can only be
// granted by an existing admin via createEmployee.
export const registerEmployee = createServerFn({ method: "POST" })
  .validator((input: unknown) => registerSchema.parse(input))
  .handler(async ({ data }) => {
    let supabaseAdmin;
    try {
      const mod = await import("@/integrations/supabase/client.server");
      supabaseAdmin = mod.supabaseAdmin;
    } catch {
      throw new Error("Registration is unavailable: server configuration incomplete.");
    }

    // Reject duplicate employee numbers up front for a clear message.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("emp_no", data.empNo)
      .maybeSingle();
    if (existing) {
      throw new Error("An account with this employee number already exists.");
    }

    const authEmail = data.email && data.email.length > 0 ? data.email : empNoToEmail(data.empNo);
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: data.password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || "Could not create account");
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
      throw new Error(pErr.message);
    }

    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "dept_user" });

    return { ok: true };
  });

// Resolves a login identifier (employee number OR real email) to the auth email
// that signInWithPassword expects. This lets workers sign in with either one
// while the employee-number flow keeps working unchanged.
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .validator((input: unknown) =>
    z.object({ identifier: z.string().min(3).max(160) }).parse(input),
  )
  .handler(async ({ data }) => {
    const id = data.identifier.trim();
    if (id.includes("@")) return { email: id };

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("emp_no", id)
        .maybeSingle();
      if (!profile) return { email: empNoToEmail(id) };
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      return { email: userRes.user?.email || empNoToEmail(id) };
    } catch {
      return { email: empNoToEmail(id) };
    }
  });
