create type public.app_role as enum ('sys_admin','dept_user','dept_admin','ppm_user','ppm_admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  emp_no text unique not null,
  emp_name text not null,
  dept text,
  designation text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('sys_admin','dept_admin'))
$$;

create table public.eqpt_master (
  id uuid primary key default gen_random_uuid(),
  shop_code int not null,
  shop_desc text not null,
  eqpt_code text,
  sub_eqpt_code text
);
grant select on public.eqpt_master to authenticated, anon;
grant all on public.eqpt_master to service_role;
alter table public.eqpt_master enable row level security;

create table public.delays_data (
  id uuid primary key default gen_random_uuid(),
  shop_code int not null,
  shop_desc text not null,
  eqpt_name text,
  sub_eqpt_name text,
  agency text,
  delay_from timestamptz,
  delay_upto timestamptz,
  delay_duration numeric,
  delay_desc text,
  user_entered text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.delays_data to authenticated;
grant all on public.delays_data to service_role;
alter table public.delays_data enable row level security;

create policy "profiles_select_auth" on public.profiles for select to authenticated using (true);
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin(auth.uid()))
  with check (id = auth.uid() or public.is_admin(auth.uid()));
create policy "profiles_admin_insert" on public.profiles for insert to authenticated
  with check (public.is_admin(auth.uid()));
create policy "profiles_admin_delete" on public.profiles for delete to authenticated
  using (public.is_admin(auth.uid()));

create policy "roles_select_auth" on public.user_roles for select to authenticated using (true);
create policy "roles_admin_all" on public.user_roles for all to authenticated
  using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy "eqpt_select_all" on public.eqpt_master for select to authenticated, anon using (true);

create policy "delays_select_auth" on public.delays_data for select to authenticated using (true);
create policy "delays_insert_auth" on public.delays_data for insert to authenticated with check (true);
create policy "delays_update_admin" on public.delays_data for update to authenticated using (public.is_admin(auth.uid()));
create policy "delays_delete_admin" on public.delays_data for delete to authenticated using (public.is_admin(auth.uid()));