ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'rh';
CREATE OR REPLACE FUNCTION public.effective_role(_r public.app_role)
RETURNS public.app_role LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
SELECT CASE WHEN _r::text IN ('ceo', 'diretor_comercial', 'gestor_manutencao') THEN 'admin'::public.app_role
WHEN _r::text = 'almoxarifado' THEN 'almoxarife'::public.app_role
WHEN _r::text = 'rh' THEN 'leitura'::public.app_role
ELSE _r END
$$;