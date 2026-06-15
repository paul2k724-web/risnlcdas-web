import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { ALL_ROLES, ROLE_LABELS, type AppRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, ShieldX, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/users")({
  component: UsersPage,
});

interface ProfileRow {
  id: string;
  emp_no: string;
  emp_name: string;
  dept: string | null;
  designation: string | null;
  active: boolean;
}

function UsersPage() {
  const { isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nf, setNf] = useState({
    empNo: "",
    password: "",
    emp_name: "",
    dept: "",
    designation: "",
    role: "dept_user" as AppRole,
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [{ data: profiles, error: pe }, { data: roles, error: re }] = await Promise.all([
        supabase.from("profiles").select("*").order("emp_no"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (pe) throw pe;
      if (re) throw re;
      const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
      return (profiles as ProfileRow[]).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null }));
    },
  });

  if (loading) return <Skeleton className="mx-auto h-64 max-w-5xl rounded-xl" />;

  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-20 text-center">
        <ShieldX className="h-12 w-12 text-destructive" />
        <h1 className="font-display text-xl font-bold">Access Restricted</h1>
        <p className="text-sm text-muted-foreground">
          Only System Admins and Department Admins can manage users.
        </p>
      </div>
    );
  }

  async function setRole(userId: string, role: AppRole) {
    await supabase.from("user_roles").delete().eq("user_id", userId);
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) {
      toast.error("Could not update role", { description: error.message });
      return;
    }
    toast.success("Role updated");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function setActive(userId: string, active: boolean) {
    const { error } = await supabase.from("profiles").update({ active }).eq("id", userId);
    if (error) {
      toast.error("Could not update status", { description: error.message });
      return;
    }
    toast.success(active ? "User activated" : "User deactivated");
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!nf.empNo || !nf.password || !nf.emp_name) {
      toast.error("Employee No, name and password are required");
      return;
    }
    setSubmitting(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(nf),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }
      toast.success("Employee added");
      setOpen(false);
      setNf({ empNo: "", password: "", emp_name: "", dept: "", designation: "", role: "dept_user" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (err) {
      toast.error("Could not add employee", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const users = usersQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage employee accounts, roles and access</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-molten text-primary-foreground shadow-molten">
              <UserPlus className="mr-1 h-4 w-4" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Employee No *</Label>
                  <Input value={nf.empNo} onChange={(e) => setNf({ ...nf, empNo: e.target.value })} placeholder="EMP5001" />
                </div>
                <div className="space-y-1.5">
                  <Label>Password *</Label>
                  <Input type="text" value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} placeholder="min 6 chars" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={nf.emp_name} onChange={(e) => setNf({ ...nf, emp_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Department</Label>
                  <Input value={nf.dept} onChange={(e) => setNf({ ...nf, dept: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Designation</Label>
                  <Input value={nf.designation} onChange={(e) => setNf({ ...nf, designation: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={nf.role} onValueChange={(v) => setNf({ ...nf, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting} className="bg-gradient-molten text-primary-foreground shadow-molten">
                  {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-card">
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.emp_no}</TableCell>
                      <TableCell>{u.emp_name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.dept ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{u.designation ?? "—"}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role ?? undefined}
                          onValueChange={(v) => setRole(u.id, v as AppRole)}
                        >
                          <SelectTrigger className="h-8 w-[150px]">
                            <SelectValue placeholder="No role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch checked={u.active} onCheckedChange={(c) => setActive(u.id, c)} />
                          <Badge variant={u.active ? "default" : "secondary"} className={u.active ? "bg-primary/20 text-primary" : ""}>
                            {u.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
