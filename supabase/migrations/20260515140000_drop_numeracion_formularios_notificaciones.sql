-- Formularios: eliminar número y código de actividad
ALTER TABLE public.formularios DROP COLUMN IF EXISTS numero;
ALTER TABLE public.formularios DROP COLUMN IF EXISTS codigo_actividad;
DROP SEQUENCE IF EXISTS public.formulario_numero_seq;
DROP SEQUENCE IF EXISTS public.formulario_codigo_seq;

-- Notificaciones: eliminar código global y correlativo por contribuyente
DROP TRIGGER IF EXISTS notif_correlativo ON public.notificaciones;
DROP FUNCTION IF EXISTS public.set_notif_correlativo();
ALTER TABLE public.notificaciones DROP COLUMN IF EXISTS codigo;
ALTER TABLE public.notificaciones DROP COLUMN IF EXISTS numero_correlativo;
DROP SEQUENCE IF EXISTS public.notificacion_codigo_seq;
