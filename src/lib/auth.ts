export const EMP_EMAIL_DOMAIN = "vizagsteel.internal";

export function empNoToEmail(empNo: string): string {
  return `${empNo.trim().toLowerCase()}@${EMP_EMAIL_DOMAIN}`;
}

export type AppRole =
  | "sys_admin"
  | "dept_user"
  | "dept_admin"
  | "ppm_user"
  | "ppm_admin";

export const ROLE_LABELS: Record<AppRole, string> = {
  sys_admin: "System Admin",
  dept_admin: "Dept Admin",
  dept_user: "Dept User",
  ppm_admin: "PPM Admin",
  ppm_user: "PPM User",
};

export const ALL_ROLES: AppRole[] = [
  "sys_admin",
  "dept_admin",
  "dept_user",
  "ppm_admin",
  "ppm_user",
];

export const ADMIN_ROLES: AppRole[] = ["sys_admin", "dept_admin"];

export const AGENCIES = ["Operations", "Mechanical", "Electrical", "Shutdown"];

// Plant shops / departments — every process-flow worker belongs to one of these.
export const DEPARTMENTS = [
  { code: "CO", name: "Coke Ovens" },
  { code: "SP", name: "Sinter Plant" },
  { code: "BF", name: "Blast Furnace" },
  { code: "SMS", name: "Steel Melt Shop" },
  { code: "SMS2", name: "Steel Melt Shop 2" },
  { code: "BILLET MILL", name: "Billet Mill" },
  { code: "BAR MILL", name: "Bar Mill" },
  { code: "WRM", name: "Wire Rod Mill" },
  { code: "WRM2", name: "Wire Rod Mill 2" },
  { code: "MMSM", name: "Medium Merchant & Structural Mill" },
  { code: "SBM", name: "Special Bar Mill" },
  { code: "RMHP", name: "Raw Material Handling Plant" },
  { code: "CRMP", name: "Calcining & Refractory Material Plant" },
  { code: "TPP", name: "Thermal Power Plant" },
  { code: "UTIL", name: "Utilities" },
  { code: "STM", name: "Steam & Maintenance" },
  { code: "DNW", name: "De-watering / Networks" },
];

export const DEMO_ACCOUNTS = [
  { empNo: "EMP1001", password: "admin123", role: "sys_admin" as AppRole, label: "System Admin" },
  { empNo: "EMP2001", password: "ppm123", role: "ppm_admin" as AppRole, label: "PPM Admin" },
  { empNo: "EMP1002", password: "user123", role: "dept_user" as AppRole, label: "Dept User" },
];
