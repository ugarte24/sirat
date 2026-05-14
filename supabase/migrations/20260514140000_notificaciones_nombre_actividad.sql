-- Renombrar campo y permitir valor nulo (opcional en formulario).
ALTER TABLE public.notificaciones RENAME COLUMN nombre_notificado TO nombre_actividad;
ALTER TABLE public.notificaciones ALTER COLUMN nombre_actividad DROP NOT NULL;
