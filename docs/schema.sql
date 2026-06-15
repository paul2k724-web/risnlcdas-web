-- ============================================================================
--  RINL VIZAG STEEL — CENTRALIZED DELAY ANALYSIS SYSTEM
--  Clean, documented PostgreSQL schema (Supabase / Lovable Cloud)
--  ----------------------------------------------------------------------------
--  This file is a READ-ONLY reference of the production database structure.
--  It is meant for review, onboarding, and self-hosting. The live database is
--  managed through versioned migrations — apply changes there, not here.
--
--  Design goals:
--    * Role-based access control (RBAC) with zero privilege-escalation risk
--    * Row-Level Security (RLS) on every table
--    * Indexes tuned for a high-traffic, plant-wide user base
-- ============================================================================


-- ============================================================================
-- 1. ROLES
--    Roles live in their OWN table (never on profiles) to prevent users from
--    escalating their own privileges. Checked via a SECURITY DEFINER function.
-- ============================================================================

CREATE TYPE public.app_role AS ENUM (
  'sys_admin',   -- full system control
  'dept_admin',  -- admin within a department/shop
  'dept_user',   -- standard worker (default on self-registration)
  'ppm_admin',   -- Production Planning & Monitoring admin
  'ppm_user'     -- Production Planning & Monitoring user
);

CREATE TABLE public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles (user_id);

-- Data API grants (Supabase does not grant these by default)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL    ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- A user can read their own roles; admins can read all.
CREATE POLICY roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Only admins may grant/modify roles.
CREATE POLICY roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));


-- ============================================================================
-- 2. SECURITY DEFINER HELPERS
--    SECURITY DEFINER lets these bypass RLS so policies can call them without
--    causing infinite recursion. search_path is pinned for safety.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('sys_admin', 'dept_admin')
  )
$$;


-- ============================================================================
-- 3. PROFILES — one row per employee, linked to the auth user
-- ============================================================================

CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emp_no      text NOT NULL,             -- employee number (login identifier)
  emp_name    text NOT NULL,             -- full name
  dept        text,                      -- shop / department code
  designation text,                      -- job title
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_emp_no ON public.profiles (emp_no);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


-- ============================================================================
-- 4. EQUIPMENT MASTER — reference list of shops, equipment & sub-equipment
-- ============================================================================

CREATE TABLE public.eqpt_master (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_code     integer NOT NULL,
  shop_desc     text NOT NULL,
  eqpt_code     text,
  sub_eqpt_code text
);

CREATE INDEX idx_eqpt_master_shop_code ON public.eqpt_master (shop_code);

GRANT SELECT ON public.eqpt_master TO anon, authenticated;
GRANT ALL    ON public.eqpt_master TO service_role;

ALTER TABLE public.eqpt_master ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by everyone, writable only via admin/service role.
CREATE POLICY eqpt_select_all ON public.eqpt_master
  FOR SELECT TO anon, authenticated USING (true);


-- ============================================================================
-- 5. DELAYS DATA — the core operational table (every equipment delay logged)
-- ============================================================================

CREATE TABLE public.delays_data (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_code      integer NOT NULL,
  shop_desc      text NOT NULL,
  eqpt_name      text,
  sub_eqpt_name  text,
  delay_desc     text,
  agency         text,                   -- Operations / Mechanical / Electrical / Shutdown
  delay_from     timestamptz,
  delay_upto     timestamptz,
  delay_duration numeric,                -- minutes
  user_entered   text,                   -- who logged it
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- High-traffic indexes: filtering & sorting in dashboards/reports
CREATE INDEX idx_delays_data_delay_from   ON public.delays_data (delay_from DESC);
CREATE INDEX idx_delays_data_created_at   ON public.delays_data (created_at DESC);
CREATE INDEX idx_delays_data_shop_code    ON public.delays_data (shop_code);
CREATE INDEX idx_delays_data_agency       ON public.delays_data (agency);
CREATE INDEX idx_delays_data_user_entered ON public.delays_data (user_entered);
-- Composite for the common "one shop, a time range" query
CREATE INDEX idx_delays_data_shop_from    ON public.delays_data (shop_code, delay_from DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delays_data TO authenticated;
GRANT ALL ON public.delays_data TO service_role;

ALTER TABLE public.delays_data ENABLE ROW LEVEL SECURITY;

-- Any signed-in worker can read all delays and add new ones.
CREATE POLICY delays_select_auth ON public.delays_data
  FOR SELECT TO authenticated USING (true);

CREATE POLICY delays_insert_auth ON public.delays_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can edit or delete existing records.
CREATE POLICY delays_update_admin ON public.delays_data
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY delays_delete_admin ON public.delays_data
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
