-- Permitir dar de baja (DELETE) a cualquier usuario autenticado solo si no hay
-- formularios ni notificaciones vinculados (antes: solo admin).
DROP POLICY IF EXISTS "Contrib: delete admin" ON public.contribuyentes;

CREATE POLICY "Contrib: delete sin vínculos" ON public.contribuyentes
  FOR DELETE TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.formularios f WHERE f.contribuyente_id = contribuyentes.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.notificaciones n WHERE n.contribuyente_id = contribuyentes.id
    )
  );
