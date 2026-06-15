-- ============================================================================
--  RINL VIZAG STEEL — CENTRALIZED DELAY ANALYSIS SYSTEM
--  Idempotent setup.sql — run ONCE against a fresh PostgreSQL/Supabase DB.
--  Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF).
--  Run via:
--    psql -h <host> -U <user> -d <dbname> -f setup.sql
--    or paste into Supabase SQL Editor.
-- ============================================================================

BEGIN;

-- ── 1. ENUM ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'sys_admin',   -- full system control
    'dept_admin',  -- admin within a department/shop
    'dept_user',   -- standard worker (default on self-registration)
    'ppm_admin',   -- Production Planning & Monitoring admin
    'ppm_user'     -- Production Planning & Monitoring user
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── 2. TABLES ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  emp_no      text NOT NULL,
  emp_name    text NOT NULL,
  dept        text,
  designation text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role    public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.eqpt_master (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_code     integer NOT NULL,
  shop_desc     text NOT NULL,
  eqpt_code     text,
  sub_eqpt_code text
);

CREATE TABLE IF NOT EXISTS public.delays_data (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_code      integer NOT NULL,
  shop_desc      text NOT NULL,
  eqpt_name      text,
  sub_eqpt_name  text,
  delay_desc     text,
  agency         text,
  delay_from     timestamptz,
  delay_upto     timestamptz,
  delay_duration numeric,
  user_entered   text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── 3. INDEXES ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_emp_no       ON public.profiles (emp_no);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id    ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_eqpt_master_shop_code ON public.eqpt_master (shop_code);
CREATE INDEX IF NOT EXISTS idx_delays_data_delay_from   ON public.delays_data (delay_from DESC);
CREATE INDEX IF NOT EXISTS idx_delays_data_created_at   ON public.delays_data (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delays_data_shop_code    ON public.delays_data (shop_code);
CREATE INDEX IF NOT EXISTS idx_delays_data_agency       ON public.delays_data (agency);
CREATE INDEX IF NOT EXISTS idx_delays_data_user_entered ON public.delays_data (user_entered);
CREATE INDEX IF NOT EXISTS idx_delays_data_shop_from    ON public.delays_data (shop_code, delay_from DESC);

-- ── 4. SECURITY DEFINER FUNCTIONS ──────────────────────────────────────────

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

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- ── 5. GRANTS ──────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles    TO authenticated;
GRANT ALL                              ON public.profiles    TO service_role;
GRANT SELECT                           ON public.user_roles  TO authenticated;
GRANT ALL                              ON public.user_roles  TO service_role;
GRANT SELECT                           ON public.eqpt_master TO anon, authenticated;
GRANT ALL                              ON public.eqpt_master TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE   ON public.delays_data TO authenticated;
GRANT ALL                              ON public.delays_data TO service_role;

-- ── 6. ROW-LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eqpt_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delays_data ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS profiles_select_self_or_admin ON public.profiles;
CREATE POLICY profiles_select_self_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_admin_insert ON public.profiles;
CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS profiles_admin_delete ON public.profiles;
CREATE POLICY profiles_admin_delete ON public.profiles
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- User roles
DROP POLICY IF EXISTS roles_select_self_or_admin ON public.user_roles;
CREATE POLICY roles_select_self_or_admin ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS roles_admin_all ON public.user_roles;
CREATE POLICY roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Equipment master (reference data — readable by everyone)
DROP POLICY IF EXISTS eqpt_select_all ON public.eqpt_master;
CREATE POLICY eqpt_select_all ON public.eqpt_master
  FOR SELECT TO anon, authenticated USING (true);

-- Delays data
DROP POLICY IF EXISTS delays_select_auth ON public.delays_data;
CREATE POLICY delays_select_auth ON public.delays_data
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS delays_insert_auth ON public.delays_data;
CREATE POLICY delays_insert_auth ON public.delays_data
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS delays_update_admin ON public.delays_data;
CREATE POLICY delays_update_admin ON public.delays_data
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS delays_delete_admin ON public.delays_data;
CREATE POLICY delays_delete_admin ON public.delays_data
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

COMMIT;
