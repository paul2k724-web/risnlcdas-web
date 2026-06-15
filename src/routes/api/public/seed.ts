import { createFileRoute } from "@tanstack/react-router";
import { empNoToEmail } from "@/lib/auth";

const DEMO = [
  { empNo: "EMP1001", password: "admin123", emp_name: "S. Ramachandra Rao", dept: "PPM", designation: "Sr. Manager", role: "sys_admin" },
  { empNo: "EMP2001", password: "ppm123", emp_name: "Anjali Sharma", dept: "PPM", designation: "DGM", role: "ppm_admin" },
  { empNo: "EMP1002", password: "user123", emp_name: "K. Prasad", dept: "SMS", designation: "Engineer", role: "dept_user" },
  { empNo: "EMP3001", password: "elec123", emp_name: "M. Venkat", dept: "Electrical", designation: "AGM", role: "dept_admin" },
  { empNo: "EMP4001", password: "ppm456", emp_name: "R. Naidu", dept: "PPM", designation: "Manager", role: "ppm_user" },
];

export const Route = createFileRoute("/api/public/seed")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const expected = `Bearer ${process.env.SEED_SECRET ?? ""}`;
        if (!process.env.SEED_SECRET || auth !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { count } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true });

        if ((count ?? 0) > 0) {
          return Response.json({ seeded: false, message: "Already seeded" });
        }

        for (const u of DEMO) {
          const email = empNoToEmail(u.empNo);
          const { data: created, error: createErr } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password: u.password,
              email_confirm: true,
            });
          if (createErr || !created.user) {
            console.error("seed create user error", u.empNo, createErr);
            continue;
          }
          const uid = created.user.id;
          await supabaseAdmin.from("profiles").insert({
            id: uid,
            emp_no: u.empNo,
            emp_name: u.emp_name,
            dept: u.dept,
            designation: u.designation,
            active: true,
          });
          await supabaseAdmin
            .from("user_roles")
            .insert({ user_id: uid, role: u.role as "sys_admin" });
        }

        return Response.json({ seeded: true, count: DEMO.length });
      },
    },
  },
});
