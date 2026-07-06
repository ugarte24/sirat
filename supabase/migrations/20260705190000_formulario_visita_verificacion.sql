-- Visitas de verificación sin completar etapa 2 (local cerrado, sin titular, etc.).

CREATE TYPE public.formulario_visita_resultado AS ENUM (
  'cerrada',
  'sin_titular',
  'acceso_denegado',
  'direccion_no_coincide',
  'horario_fuera',
  'otro'
);

CREATE TABLE public.formulario_visita_verificacion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  fecha_visita DATE NOT NULL DEFAULT (CURRENT_DATE),
  resultado public.formulario_visita_resultado NOT NULL,
  observacion TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT formulario_visita_obs_otro CHECK (
    resultado <> 'otro' OR (observacion IS NOT NULL AND length(trim(observacion)) > 0)
  )
);

ALTER TABLE public.formulario_visita_verificacion ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_formulario_visita_verificacion_formulario
  ON public.formulario_visita_verificacion(formulario_id, fecha_visita DESC);

CREATE POLICY "Visitas verificación: read auth" ON public.formulario_visita_verificacion
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Visitas verificación: insert pendiente" ON public.formulario_visita_verificacion
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.formularios f
      WHERE f.id = formulario_id AND f.estado = 'pendiente_verificacion'
    )
  );
