DROP POLICY IF EXISTS sel ON public.vehicles;
CREATE POLICY sel ON public.vehicles FOR SELECT TO authenticated USING (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS sel ON public.suppliers;
CREATE POLICY sel ON public.suppliers FOR SELECT TO authenticated USING (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS sel ON public.stock_balances;
CREATE POLICY sel ON public.stock_balances FOR SELECT TO authenticated USING (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura','tecnico']::public.app_role[]));
DROP POLICY IF EXISTS sel ON public.stock_movements;
CREATE POLICY sel ON public.stock_movements FOR SELECT TO authenticated USING (public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura','tecnico']::public.app_role[]));