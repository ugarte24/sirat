-- Paso 2: columnas e índice (después de que exista el valor del enum)
ALTER TABLE public.formularios
  ALTER COLUMN superficie DROP NOT NULL;

ALTER TABLE public.formularios
  ADD COLUMN IF NOT EXISTS verificado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verificado_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_formularios_pendiente
  ON public.formularios(estado)
  WHERE estado = 'pendiente_verificacion';
