-- Paso 1: nuevo valor de enum (debe ir solo en esta migración; PG exige commit antes de usarlo)
ALTER TYPE public.formulario_estado ADD VALUE IF NOT EXISTS 'pendiente_verificacion';
