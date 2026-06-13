-- Catálogo de tipos de trámite (etapa 1 formularios)
CREATE TABLE public.tipos_tramite (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tipos_tramite ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tipo trámite: read auth" ON public.tipos_tramite
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tipo trámite: insert auth" ON public.tipos_tramite
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Tipo trámite: update auth" ON public.tipos_tramite
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

INSERT INTO public.tipos_tramite (nombre) VALUES
  ('Inscripción'),
  ('Renovación'),
  ('Modificación'),
  ('Otros');

ALTER TABLE public.formularios
  ADD COLUMN tipo_tramite_id UUID REFERENCES public.tipos_tramite(id);

UPDATE public.formularios
SET tipo_tramite_id = (SELECT id FROM public.tipos_tramite WHERE nombre = 'Otros' LIMIT 1)
WHERE tipo_tramite_id IS NULL;

ALTER TABLE public.formularios
  ALTER COLUMN tipo_tramite_id SET NOT NULL;

CREATE INDEX idx_formularios_tipo_tramite ON public.formularios(tipo_tramite_id);
