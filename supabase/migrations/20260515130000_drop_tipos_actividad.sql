-- Elimina catálogo tipos_actividad y la FK en formularios
ALTER TABLE public.formularios DROP COLUMN IF EXISTS tipo_actividad_id;

DROP POLICY IF EXISTS "Tipos: read auth" ON public.tipos_actividad;
DROP POLICY IF EXISTS "Tipos: admin all" ON public.tipos_actividad;

DROP TABLE IF EXISTS public.tipos_actividad;
