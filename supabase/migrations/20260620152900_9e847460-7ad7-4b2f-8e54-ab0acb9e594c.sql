
-- user_roles: admin-only writes
CREATE POLICY ur_admin_ins ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY ur_admin_upd ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY ur_admin_del ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- payments: admin-only update/delete; block client inserts (server uses service role)
CREATE POLICY pay_admin_upd ON public.payments FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY pay_admin_del ON public.payments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY pay_no_client_ins ON public.payments FOR INSERT TO authenticated WITH CHECK (false);

-- subscriptions: admin-only writes; block client inserts (server uses service role)
CREATE POLICY sub_admin_upd ON public.subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY sub_admin_del ON public.subscriptions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY sub_no_client_ins ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (false);

-- Tighten has_role EXECUTE: remove anon/public; keep authenticated (RLS needs it) and service_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
