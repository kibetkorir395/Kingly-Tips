
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.tip_result AS ENUM ('pending', 'won', 'lost', 'void');
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'successful', 'failed');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT, full_name TEXT, country TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "p_sel" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "p_upd" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "p_ins" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ur_sel" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = 'ancientpuppy92@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- plans
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
  duration_days INT NOT NULL, price_kes NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true, sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pl_sel" ON public.plans FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "pl_all" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plans (code, name, duration_days, price_kes, sort_order) VALUES
  ('daily','Daily',1,190,1),('weekly','Weekly',7,750,2),('monthly','Monthly',30,2500,3);

-- subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status subscription_status NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_sel" ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE INDEX idx_subs_user_active ON public.subscriptions (user_id, status, expires_at);

-- free_tips
CREATE TABLE public.free_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL, kickoff_time TEXT, league TEXT,
  home_team TEXT NOT NULL, away_team TEXT NOT NULL,
  tip TEXT NOT NULL, odds NUMERIC(5,2),
  result tip_result NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.free_tips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.free_tips TO authenticated;
GRANT ALL ON public.free_tips TO service_role;
ALTER TABLE public.free_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ft_sel" ON public.free_tips FOR SELECT USING (true);
CREATE POLICY "ft_all" ON public.free_tips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_free_tips_updated BEFORE UPDATE ON public.free_tips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- vip_tips (after subscriptions)
CREATE TABLE public.vip_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date DATE NOT NULL, kickoff_time TEXT, league TEXT,
  home_team TEXT NOT NULL, away_team TEXT NOT NULL,
  tip TEXT NOT NULL, odds NUMERIC(5,2),
  result tip_result NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_tips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vip_tips TO authenticated;
GRANT ALL ON public.vip_tips TO service_role;
ALTER TABLE public.vip_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vt_sel_settled" ON public.vip_tips FOR SELECT USING (result <> 'pending');
CREATE POLICY "vt_sel_subs" ON public.vip_tips FOR SELECT TO authenticated USING (
  result = 'pending' AND (
    public.has_role(auth.uid(),'admin') OR
    EXISTS (SELECT 1 FROM public.subscriptions s
            WHERE s.user_id = auth.uid() AND s.status = 'active' AND s.expires_at > now())
  )
);
CREATE POLICY "vt_all" ON public.vip_tips FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_vip_tips_updated BEFORE UPDATE ON public.vip_tips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  tx_ref TEXT UNIQUE NOT NULL, flw_tx_id TEXT,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'KES',
  status payment_status NOT NULL DEFAULT 'pending',
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pay_sel" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
