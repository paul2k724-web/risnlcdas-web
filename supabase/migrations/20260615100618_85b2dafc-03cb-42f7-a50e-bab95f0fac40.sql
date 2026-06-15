-- Performance indexes for high-traffic delay logging
-- Speeds up dashboard/report filtering and sorting at scale.

CREATE INDEX IF NOT EXISTS idx_delays_data_delay_from ON public.delays_data (delay_from DESC);
CREATE INDEX IF NOT EXISTS idx_delays_data_created_at ON public.delays_data (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delays_data_shop_code ON public.delays_data (shop_code);
CREATE INDEX IF NOT EXISTS idx_delays_data_agency ON public.delays_data (agency);
CREATE INDEX IF NOT EXISTS idx_delays_data_user_entered ON public.delays_data (user_entered);
-- Composite index for the common "shop + time range" dashboard query
CREATE INDEX IF NOT EXISTS idx_delays_data_shop_from ON public.delays_data (shop_code, delay_from DESC);

-- Equipment master lookups
CREATE INDEX IF NOT EXISTS idx_eqpt_master_shop_code ON public.eqpt_master (shop_code);

-- Profile / role lookups (auth hot path)
CREATE INDEX IF NOT EXISTS idx_profiles_emp_no ON public.profiles (emp_no);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);