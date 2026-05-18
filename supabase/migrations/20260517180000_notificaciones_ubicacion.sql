-- Ubicación geográfica en notificaciones
ALTER TABLE public.notificaciones
  ADD COLUMN IF NOT EXISTS latitud NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitud NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS mapa_zoom smallint;

ALTER TABLE public.notificaciones
  DROP CONSTRAINT IF EXISTS notificaciones_mapa_zoom_range;

ALTER TABLE public.notificaciones
  ADD CONSTRAINT notificaciones_mapa_zoom_range
  CHECK (mapa_zoom IS NULL OR (mapa_zoom >= 1 AND mapa_zoom <= 19));

COMMENT ON COLUMN public.notificaciones.latitud IS 'Latitud del punto marcado en el mapa';
COMMENT ON COLUMN public.notificaciones.longitud IS 'Longitud del punto marcado en el mapa';
COMMENT ON COLUMN public.notificaciones.mapa_zoom IS 'Nivel de zoom Leaflet al guardar la ubicación';
