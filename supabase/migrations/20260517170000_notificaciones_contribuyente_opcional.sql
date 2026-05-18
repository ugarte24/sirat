-- Contribuyente opcional en notificaciones
ALTER TABLE public.notificaciones
  ALTER COLUMN contribuyente_id DROP NOT NULL;
