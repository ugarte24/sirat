-- Zoom del mapa Leaflet al guardar ubicación (etapa registro)
ALTER TABLE public.formularios
  ADD COLUMN IF NOT EXISTS mapa_zoom smallint;

ALTER TABLE public.formularios
  DROP CONSTRAINT IF EXISTS formularios_mapa_zoom_range;

ALTER TABLE public.formularios
  ADD CONSTRAINT formularios_mapa_zoom_range
  CHECK (mapa_zoom IS NULL OR (mapa_zoom >= 1 AND mapa_zoom <= 19));

COMMENT ON COLUMN public.formularios.mapa_zoom IS 'Nivel de zoom Leaflet guardado al registrar o actualizar la ubicación';
