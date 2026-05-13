
-- Roles enum y tabla
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');
CREATE TYPE public.formulario_estado AS ENUM ('activo', 'baja', 'anulado');
CREATE TYPE public.notificacion_estado AS ENUM ('pendiente', 'cumplido', 'anulado');
CREATE TYPE public.notificacion_tipo AS ENUM ('aviso', 'advertencia', 'multa');
CREATE TYPE public.zona_tipo AS ENUM ('A', 'B', 'C', 'D', 'E');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  ci TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  intentos_fallidos INT NOT NULL DEFAULT 0,
  bloqueado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- has_role function (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger: crear profile al registrar usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  -- Asignar rol operador por defecto
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'operador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Contribuyentes
CREATE TABLE public.contribuyentes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ci TEXT NOT NULL UNIQUE,
  nombre_completo TEXT NOT NULL,
  telefono TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contribuyentes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER contribuyentes_updated BEFORE UPDATE ON public.contribuyentes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tipos de actividad
CREATE TABLE public.tipos_actividad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tipos_actividad ENABLE ROW LEVEL SECURITY;

INSERT INTO public.tipos_actividad (nombre) VALUES
  ('Comercio'), ('Servicios'), ('Industria'),
  ('Restaurante'), ('Bar / Bebidas alcohólicas'),
  ('Transporte'), ('Construcción'), ('Otros');

-- Formularios (con número serial desde 1000)
CREATE SEQUENCE public.formulario_numero_seq START 1000;
CREATE SEQUENCE public.formulario_codigo_seq START 100000;

CREATE TABLE public.formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INT NOT NULL UNIQUE DEFAULT nextval('public.formulario_numero_seq'),
  codigo_actividad TEXT NOT NULL UNIQUE DEFAULT ('AE-' || nextval('public.formulario_codigo_seq')),
  contribuyente_id UUID NOT NULL REFERENCES public.contribuyentes(id) ON DELETE RESTRICT,
  razon_social TEXT NOT NULL,
  nit TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  zona public.zona_tipo NOT NULL,
  superficie NUMERIC(10,2) NOT NULL,
  tipo_actividad_id UUID NOT NULL REFERENCES public.tipos_actividad(id),
  direccion TEXT NOT NULL,
  celular TEXT NOT NULL,
  referencia TEXT NOT NULL,
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  procedente BOOLEAN NOT NULL DEFAULT true,
  padron_bebidas BOOLEAN NOT NULL DEFAULT false,
  observacion TEXT,
  estado public.formulario_estado NOT NULL DEFAULT 'activo',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contribuyente_id, razon_social)
);
ALTER TABLE public.formularios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER formularios_updated BEFORE UPDATE ON public.formularios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_formularios_contribuyente ON public.formularios(contribuyente_id);
CREATE INDEX idx_formularios_estado ON public.formularios(estado);

-- Fotos de formulario (max 2)
CREATE TABLE public.formulario_fotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  formulario_id UUID NOT NULL REFERENCES public.formularios(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.formulario_fotos ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_fotos_formulario ON public.formulario_fotos(formulario_id);

-- Trigger: máximo 2 fotos por formulario
CREATE OR REPLACE FUNCTION public.check_max_fotos()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.formulario_fotos WHERE formulario_id = NEW.formulario_id) >= 2 THEN
    RAISE EXCEPTION 'Máximo 2 fotos por formulario';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER fotos_max_check BEFORE INSERT ON public.formulario_fotos
FOR EACH ROW EXECUTE FUNCTION public.check_max_fotos();

-- Notificaciones
CREATE SEQUENCE public.notificacion_codigo_seq START 5000;

CREATE TABLE public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo INT NOT NULL UNIQUE DEFAULT nextval('public.notificacion_codigo_seq'),
  numero_correlativo INT NOT NULL,
  contribuyente_id UUID NOT NULL REFERENCES public.contribuyentes(id) ON DELETE RESTRICT,
  nombre_notificado TEXT NOT NULL,
  direccion TEXT NOT NULL,
  fecha_limite DATE NOT NULL,
  tipo public.notificacion_tipo NOT NULL,
  padron_municipal BOOLEAN NOT NULL DEFAULT false,
  impuestos_patente BOOLEAN NOT NULL DEFAULT false,
  bienes_inmuebles BOOLEAN NOT NULL DEFAULT false,
  vehiculos BOOLEAN NOT NULL DEFAULT false,
  estado public.notificacion_estado NOT NULL DEFAULT 'pendiente',
  observacion_seguimiento TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER notif_updated BEFORE UPDATE ON public.notificaciones
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_notif_contrib ON public.notificaciones(contribuyente_id);
CREATE INDEX idx_notif_estado ON public.notificaciones(estado);

-- Trigger: auto numero correlativo por contribuyente
CREATE OR REPLACE FUNCTION public.set_notif_correlativo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
CREATE TRIGGER notif_correlativo BEFORE INSERT ON public.notificaciones
FOR EACH ROW EXECUTE FUNCTION public.set_notif_correlativo();

-- Auditoría
CREATE TABLE public.auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id UUID,
  detalle JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_audit_created ON public.auditoria(created_at DESC);

-- ========== POLICIES ==========

-- profiles: cada user ve su propio profile, admin ve todo
CREATE POLICY "Profiles: self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: admin insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles: solo admin gestiona; cualquiera puede leer su propio rol
CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Roles: admin all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- contribuyentes: todos los autenticados leen y crean; eliminar solo admin
CREATE POLICY "Contrib: read auth" ON public.contribuyentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Contrib: insert auth" ON public.contribuyentes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Contrib: update auth" ON public.contribuyentes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Contrib: delete admin" ON public.contribuyentes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- tipos: lectura todos, escritura admin
CREATE POLICY "Tipos: read auth" ON public.tipos_actividad FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tipos: admin all" ON public.tipos_actividad FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- formularios: todos los autenticados CRUD; eliminar solo admin
CREATE POLICY "Form: read auth" ON public.formularios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Form: insert auth" ON public.formularios FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Form: update auth" ON public.formularios FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Form: delete admin" ON public.formularios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- fotos
CREATE POLICY "Fotos: read auth" ON public.formulario_fotos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fotos: insert auth" ON public.formulario_fotos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Fotos: delete auth" ON public.formulario_fotos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- notificaciones
CREATE POLICY "Notif: read auth" ON public.notificaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notif: insert auth" ON public.notificaciones FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Notif: update auth" ON public.notificaciones FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Notif: delete admin" ON public.notificaciones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- auditoria
CREATE POLICY "Audit: admin read" ON public.auditoria FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Audit: insert auth" ON public.auditoria FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ========== STORAGE ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('formulario-fotos', 'formulario-fotos', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Fotos read public" ON storage.objects FOR SELECT USING (bucket_id = 'formulario-fotos');
CREATE POLICY "Fotos auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'formulario-fotos');
CREATE POLICY "Fotos auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'formulario-fotos');
