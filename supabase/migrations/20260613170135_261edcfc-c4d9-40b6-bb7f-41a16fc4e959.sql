
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;

GRANT SELECT ON public.free_tips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.free_tips TO authenticated;
GRANT ALL ON public.free_tips TO service_role;

GRANT SELECT ON public.vip_tips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vip_tips TO authenticated;
GRANT ALL ON public.vip_tips TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
