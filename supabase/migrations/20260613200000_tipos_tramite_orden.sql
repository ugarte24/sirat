-- Orden manual del catálogo (nuevos al final; listado y combobox por orden)
ALTER TABLE public.tipos_tramite ADD COLUMN orden INTEGER;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, nombre ASC) AS rn
  FROM public.tipos_tramite
)
UPDATE public.tipos_tramite t
SET orden = n.rn
FROM numbered n
WHERE t.id = n.id;

ALTER TABLE public.tipos_tramite ALTER COLUMN orden SET NOT NULL;

CREATE UNIQUE INDEX idx_tipos_tramite_orden ON public.tipos_tramite(orden);
