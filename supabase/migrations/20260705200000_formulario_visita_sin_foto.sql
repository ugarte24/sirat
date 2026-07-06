-- Quitar soporte de fotos en visitas de verificación (no se usa en la app).

ALTER TABLE public.formulario_visita_verificacion
  DROP COLUMN IF EXISTS foto_path;

DROP POLICY IF EXISTS "Visita fotos storage read auth" ON storage.objects;
DROP POLICY IF EXISTS "Visita fotos storage insert auth" ON storage.objects;
DROP POLICY IF EXISTS "Visita fotos storage delete auth" ON storage.objects;

-- Supabase bloquea DELETE directo en storage.* salvo con este flag (vía admin / migración).
SELECT set_config('storage.allow_delete_query', 'true', true);
DELETE FROM storage.objects WHERE bucket_id = 'formulario-visita-fotos';
DELETE FROM storage.buckets WHERE id = 'formulario-visita-fotos';
