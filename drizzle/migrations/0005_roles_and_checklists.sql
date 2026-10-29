ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ceo';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'diretor_comercial';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_manutencao';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'almoxarifado';

CREATE OR REPLACE FUNCTION public.effective_role(_r public.app_role) RETURNS public.app_role
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  select case when _r::text in ('ceo','diretor_comercial','gestor_manutencao') then 'admin'::public.app_role
              when _r::text = 'almoxarifado' then 'almoxarife'::public.app_role
              else _r end
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_org uuid, _roles public.app_role[]) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists(select 1 from public.organization_members
    where user_id = auth.uid() and organization_id = _org and active and archived_at is null
      and (role = any(_roles) or public.effective_role(role) = any(_roles)))
$$;

CREATE OR REPLACE FUNCTION public.my_role() RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select public.effective_role(role) from public.organization_members
  where user_id = auth.uid() and active and archived_at is null order by created_at limit 1
$$;

CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  machine_type text NOT NULL CHECK (machine_type IN ('combustao','eletrica_contrabalancada','retratil','transpaleteira')),
  version integer NOT NULL DEFAULT 1,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  needs_validation boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, machine_type, version)
);
GRANT SELECT ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read templates" ON public.checklist_templates FOR SELECT TO authenticated USING (public.is_member(organization_id));

CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id),
  template_version integer NOT NULL,
  machine_type text NOT NULL CHECK (machine_type IN ('combustao','eletrica_contrabalancada','retratil','transpaleteira')),
  kind text NOT NULL CHECK (kind IN ('entrega','retorno')),
  customer_id uuid REFERENCES public.customers(id),
  equipment_id uuid REFERENCES public.equipment(id),
  consultant text, responsible_name text, responsible_cpf text, customer_signer text,
  invoice text, contract text, brand text, model text, serial text, fleet_number text,
  hour_meter numeric, check_date date NOT NULL DEFAULT current_date, check_time text,
  types text[] NOT NULL DEFAULT '{}',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  bad_count integer NOT NULL DEFAULT 0,
  tech_notes text, customer_notes text,
  archived_at timestamptz, archived_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid, version integer NOT NULL DEFAULT 1
);
CREATE INDEX checklists_org_type_idx ON public.checklists (organization_id, machine_type, check_date DESC);
GRANT SELECT, INSERT, UPDATE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read checklists" ON public.checklists FOR SELECT TO authenticated USING (public.is_member(organization_id));
CREATE POLICY "members create checklists" ON public.checklists FOR INSERT TO authenticated WITH CHECK (public.is_member(organization_id));
CREATE POLICY "author or manager updates checklists" ON public.checklists FOR UPDATE TO authenticated
  USING (public.is_member(organization_id) AND (created_by = auth.uid() OR public.has_any_role(organization_id, array['admin','gestor']::public.app_role[])))
  WITH CHECK (public.is_member(organization_id));
CREATE TRIGGER tg_row BEFORE INSERT OR UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.tg_business_row();
CREATE TRIGGER tg_audit AFTER INSERT OR DELETE OR UPDATE ON public.checklists FOR EACH ROW EXECUTE FUNCTION public.tg_audit();

DROP POLICY IF EXISTS sel ON public.attachments;
CREATE POLICY sel ON public.attachments FOR SELECT TO authenticated USING (
  status = 'ativo' AND (
    (entity_type = 'work_order' AND public.can_view_wo(entity_id))
    OR (entity_type = 'equipment' AND public.has_any_role(organization_id, array['admin','gestor','almoxarife','leitura']::public.app_role[]))
    OR (entity_type = 'vehicle' AND public.has_any_role(organization_id, array['admin','gestor','leitura']::public.app_role[]))
    OR (entity_type = 'checklist' AND public.is_member(organization_id))
  ));

INSERT INTO public.checklist_templates (organization_id, machine_type, items, needs_validation)
SELECT o.id, t.mt, t.items::jsonb, t.nv FROM public.organizations o CROSS JOIN (VALUES
 ('combustao', '["Óleo Hidráulico (nível)","Óleo Transmissão (nível)","Kit Contatores","Roda de Tração","Rodas de Apoio Direita","Rodas de Apoio Esquerda","Rodas de Carga","Chicote Principal","Articulação Traseira","Embuchamento Geral","Desgaste do Chassi","Power Track","Suporte do cilindro de gás","Freio estacionário","Freio de aproximação","Iluminação","Red Soné","Spot BLUE","Luz de segurança","Sensores","Buzina","Botoeiras","Acelerador","Fixação da Transmissão","Prisioneiros Roda de Tração","Carenagens","Mangueiras","Cilindros","Sirene de ré","Sistema de gás","Eixo direcional","Espelhos retrovisores","Vazamento de óleo motor","Vazamento de óleo transmissão","Vazamento de óleo hidráulico","Motor de partida","Bateria / Alternador","Sistema hidráulico"]', false),
 ('eletrica_contrabalancada', '["Óleo Hidráulico (nível)","Bateria (carga e nível de água)","Conector da bateria","Cabos da bateria","Carregador","Kit Contatores","Controlador / Módulo","Motor de tração","Motor da bomba","Painel e códigos de erro","Roda de Tração","Rodas de Apoio Direita","Rodas de Apoio Esquerda","Chicote Principal","Articulação Traseira","Embuchamento Geral","Desgaste do Chassi","Mastro e correntes","Garfos","Freio estacionário","Freio de serviço","Iluminação","Red Soné","Spot BLUE","Luz de segurança","Sensores","Buzina","Botoeiras","Acelerador","Carenagens","Mangueiras","Cilindros","Sirene de ré","Eixo direcional","Espelhos retrovisores","Vazamento de óleo hidráulico","Sistema hidráulico","Botão de emergência"]', true),
 ('retratil', '["Óleo Hidráulico (nível)","Bateria (carga e nível de água)","Conector da bateria","Cabos da bateria","Carregador","Kit Contatores","Controlador / Módulo","Motor de tração","Motor da bomba","Painel e códigos de erro","Roda de Tração","Rodas de Carga","Rodas de Apoio","Chicote Principal","Mastro e correntes","Sistema de retração","Garfos","Desgaste do Chassi","Power Track","Freio estacionário","Freio de serviço","Iluminação","Red Soné","Spot BLUE","Luz de segurança","Sensores","Buzina","Botoeiras","Acelerador / Joystick","Carenagens","Mangueiras","Cilindros","Sirene de ré","Vazamento de óleo hidráulico","Sistema hidráulico","Botão de emergência"]', true),
 ('transpaleteira', '["Óleo Hidráulico (nível)","Bateria (carga)","Conector da bateria","Carregador","Kit Contatores","Controlador / Módulo","Motor de tração","Motor da bomba","Painel e códigos de erro","Timão (lança)","Botoeiras do timão","Botão de emergência","Botão anti-esmagamento","Roda de Tração","Rodas de Carga","Rodas estabilizadoras","Garfos","Desgaste do Chassi","Chicote Principal","Freio eletromagnético","Buzina","Carenagens","Cilindro de elevação","Vazamento de óleo hidráulico","Sistema hidráulico"]', true)
) AS t(mt, items, nv);