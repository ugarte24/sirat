-- Desglose de superficie por ambiente en verificación (etapa 2).

CREATE TABLE public.formulario_ambientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  orden SMALLINT NOT NULL,
  ambiente TEXT NOT NULL,
  largo NUMERIC(10, 2) NOT NULL CHECK (largo > 0),
  ancho NUMERIC(10, 2) NOT NULL CHECK (ancho > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT formulario_ambientes_orden_unique UNIQUE (formulario_id, orden)
);

CREATE INDEX idx_formulario_ambientes_formulario ON public.formulario_ambientes(formulario_id);

ALTER TABLE public.formulario_ambientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ambientes: read auth" ON public.formulario_ambientes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Ambientes: insert auth" ON public.formulario_ambientes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Ambientes: delete auth" ON public.formulario_ambientes
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);
