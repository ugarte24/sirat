
-- Fix function search paths
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION public.check_max_fotos()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.formulario_fotos WHERE formulario_id = NEW.formulario_id) >= 2 THEN
    RAISE EXCEPTION 'Máximo 2 fotos por formulario';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_notif_correlativo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.numero_correlativo IS NULL OR NEW.numero_correlativo = 0 THEN
    SELECT COALESCE(MAX(numero_correlativo), 0) + 1
      INTO NEW.numero_correlativo
      FROM public.notificaciones
      WHERE contribuyente_id = NEW.contribuyente_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Revoke EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Restrict storage bucket listing: only allow reading specific objects, not listing
DROP POLICY IF EXISTS "Fotos read public" ON storage.objects;
CREATE POLICY "Fotos read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'formulario-fotos');

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'formulario-fotos';
