-- Límites de zona (contorno por zona A–E) dibujados por el administrador.
CREATE TABLE public.zona_limites (
  zona public.zona_tipo PRIMARY KEY,
  coordenadas JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  CONSTRAINT zona_limites_coordenadas_array CHECK (jsonb_typeof(coordenadas) = 'array'),
  CONSTRAINT zona_limites_min_puntos CHECK (jsonb_array_length(coordenadas) >= 3)
);

ALTER TABLE public.zona_limites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Zona limites: read authenticated"
  ON public.zona_limites
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Zona limites: admin write"
  ON public.zona_limites
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
