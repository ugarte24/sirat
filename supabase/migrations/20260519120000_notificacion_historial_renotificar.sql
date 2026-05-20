-- Historial de fechas límite y conteo de renotificaciones (mismo registro / mismo QR)

ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS veces_notificado INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.notificaciones.veces_notificado IS
  'Cantidad de veces registrada la notificación (incluye la emisión inicial).';

CREATE TABLE IF NOT EXISTS public.notificacion_historial (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacion_id UUID NOT NULL REFERENCES public.notificaciones(id) ON DELETE CASCADE,
  numero SMALLINT NOT NULL CHECK (numero >= 1),
  fecha_limite DATE NOT NULL,
  observacion TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (notificacion_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_notif_historial_notif
  ON public.notificacion_historial(notificacion_id, numero DESC);

COMMENT ON TABLE public.notificacion_historial IS
  'Registro append-only de cada fecha límite asignada a una notificación.';

ALTER TABLE public.notificacion_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notif hist: read auth"
  ON public.notificacion_historial FOR SELECT TO authenticated USING (true);

CREATE POLICY "Notif hist: insert auth"
  ON public.notificacion_historial FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Backfill: una fila por notificación existente
INSERT INTO public.notificacion_historial (notificacion_id, numero, fecha_limite, created_at, created_by)
SELECT id, 1, fecha_limite, created_at, created_by
FROM public.notificaciones n
WHERE NOT EXISTS (
  SELECT 1 FROM public.notificacion_historial h WHERE h.notificacion_id = n.id
);

UPDATE public.notificaciones SET veces_notificado = 1 WHERE veces_notificado < 1;

-- Trigger: al crear notificación, historial fila 1 (si el cliente no lo insertó)
CREATE OR REPLACE FUNCTION public.notificacion_historial_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.notificacion_historial h WHERE h.notificacion_id = NEW.id
  ) THEN
    INSERT INTO public.notificacion_historial (
      notificacion_id, numero, fecha_limite, created_by, created_at
    ) VALUES (
      NEW.id, 1, NEW.fecha_limite, NEW.created_by, NEW.created_at
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notificacion_historial_on_insert ON public.notificaciones;
CREATE TRIGGER notificacion_historial_on_insert
  AFTER INSERT ON public.notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.notificacion_historial_on_insert();
