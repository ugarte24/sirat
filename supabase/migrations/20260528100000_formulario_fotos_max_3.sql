CREATE OR REPLACE FUNCTION public.check_max_fotos()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.formulario_fotos WHERE formulario_id = NEW.formulario_id) >= 3 THEN
    RAISE EXCEPTION 'Máximo 3 fotos por formulario';
  END IF;
  RETURN NEW;
END;
$$;
