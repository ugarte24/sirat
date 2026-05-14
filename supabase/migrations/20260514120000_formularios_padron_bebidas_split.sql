-- Separa "Padrón / Bebidas alcohólicas" en dos columnas independientes.
ALTER TABLE public.formularios
  ADD COLUMN padron boolean NOT NULL DEFAULT false,
  ADD COLUMN bebidas_alcoholicas boolean NOT NULL DEFAULT false;

UPDATE public.formularios
SET padron = true, bebidas_alcoholicas = true
WHERE padron_bebidas = true;

ALTER TABLE public.formularios DROP COLUMN padron_bebidas;
