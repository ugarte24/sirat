-- Documentación de baja: PDF almacenado, fotos propias (máx. 2), fecha de baja.

ALTER TABLE public.formularios
  ADD COLUMN IF NOT EXISTS baja_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS baja_pdf_path TEXT;

CREATE TABLE public.formulario_baja_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.formulario_baja_fotos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_formulario_baja_fotos_formulario
  ON public.formulario_baja_fotos(formulario_id);

CREATE OR REPLACE FUNCTION public.formulario_baja_fotos_max_check()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.formulario_baja_fotos WHERE formulario_id = NEW.formulario_id) >= 2 THEN
    RAISE EXCEPTION 'Máximo 2 fotos de baja por formulario';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS formulario_baja_fotos_max_check ON public.formulario_baja_fotos;
CREATE TRIGGER formulario_baja_fotos_max_check
  BEFORE INSERT ON public.formulario_baja_fotos
  FOR EACH ROW EXECUTE FUNCTION public.formulario_baja_fotos_max_check();

CREATE POLICY "Baja fotos: read auth" ON public.formulario_baja_fotos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Baja fotos: insert auth" ON public.formulario_baja_fotos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Baja fotos: delete auth" ON public.formulario_baja_fotos
  FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('formulario-baja-fotos', 'formulario-baja-fotos', false),
  ('formulario-baja-pdf', 'formulario-baja-pdf', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Baja fotos storage read auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'formulario-baja-fotos');
CREATE POLICY "Baja fotos storage insert auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'formulario-baja-fotos');
CREATE POLICY "Baja fotos storage delete auth" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'formulario-baja-fotos');

CREATE POLICY "Baja pdf storage read auth" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'formulario-baja-pdf');
CREATE POLICY "Baja pdf storage insert auth" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'formulario-baja-pdf');
CREATE POLICY "Baja pdf storage update auth" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'formulario-baja-pdf');
CREATE POLICY "Baja pdf storage delete auth" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'formulario-baja-pdf');
