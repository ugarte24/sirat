-- Líneas divisorias: cada registro separa dos zonas (lado A / lado B según sentido de la línea).
DROP TABLE IF EXISTS public.zona_limites;

CREATE TABLE public.zona_divisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coordenadas JSONB NOT NULL,
  zona_lado_a public.zona_tipo NOT NULL,
  zona_lado_b public.zona_tipo NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT zona_divisiones_coordenadas_array CHECK (jsonb_typeof(coordenadas) = 'array'),
  CONSTRAINT zona_divisiones_min_puntos CHECK (jsonb_array_length(coordenadas) >= 2),
  CONSTRAINT zona_divisiones_zonas_distintas CHECK (zona_lado_a <> zona_lado_b)
);

ALTER TABLE public.zona_divisiones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zona divisiones: read authenticated"
  ON public.zona_divisiones
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Zona divisiones: admin write"
  ON public.zona_divisiones
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
