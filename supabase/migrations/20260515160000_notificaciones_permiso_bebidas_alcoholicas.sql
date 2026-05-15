ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS permiso_bebidas_alcoholicas BOOLEAN NOT NULL DEFAULT false;
