-- =============================================================================
-- SIRAT — esquema completo para Supabase (paso 2: SQL único)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- Equivale al estado final de todas las migraciones en supabase/migrations/
-- =============================================================================

-- Roles enum y tabla
CREATE TYPE public.app_role AS ENUM ('admin', 'operador');
CREATE TYPE public.formulario_estado AS ENUM ('activo', 'baja', 'anulado');
CREATE TYPE public.notificacion_estado AS ENUM ('pendiente', 'cumplido', 'anulado');
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

-- Trigger: crear profile al registrar usuario (primer usuario = admin)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INT;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'operador';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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

-- Formularios
CREATE TABLE public.formularios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribuyente_id UUID NOT NULL REFERENCES public.contribuyentes(id) ON DELETE RESTRICT,
  razon_social TEXT NOT NULL,
  nit TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  zona public.zona_tipo NOT NULL,
  superficie NUMERIC(10,2) NOT NULL,
  direccion TEXT NOT NULL,
  celular TEXT NOT NULL,
  referencia TEXT NOT NULL,
  latitud NUMERIC(10,7),
  longitud NUMERIC(10,7),
  procedente BOOLEAN NOT NULL DEFAULT true,
  padron BOOLEAN NOT NULL DEFAULT false,
  bebidas_alcoholicas BOOLEAN NOT NULL DEFAULT false,
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

CREATE OR REPLACE FUNCTION public.check_max_fotos()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
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
CREATE TABLE public.notificaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribuyente_id UUID NOT NULL REFERENCES public.contribuyentes(id) ON DELETE RESTRICT,
  nombre_actividad TEXT,
  numero_identificacion TEXT,
  direccion TEXT NOT NULL,
  fecha_limite DATE NOT NULL,
  padron_municipal BOOLEAN NOT NULL DEFAULT false,
  permiso_bebidas_alcoholicas BOOLEAN NOT NULL DEFAULT false,
  impuestos_patente BOOLEAN NOT NULL DEFAULT false,
  bienes_inmuebles BOOLEAN NOT NULL DEFAULT false,
  vehiculos BOOLEAN NOT NULL DEFAULT false,
  gestiones_adeudadas TEXT,
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

-- ========== POLICIES ==========

CREATE POLICY "Profiles: self select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Profiles: admin insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Roles: read own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Roles: admin all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Contrib: read auth" ON public.contribuyentes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Contrib: insert auth" ON public.contribuyentes FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Contrib: update auth" ON public.contribuyentes FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Contrib: delete admin" ON public.contribuyentes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Form: read auth" ON public.formularios FOR SELECT TO authenticated USING (true);
CREATE POLICY "Form: insert auth" ON public.formularios FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Form: update auth" ON public.formularios FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Form: delete admin" ON public.formularios FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Fotos: read auth" ON public.formulario_fotos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fotos: insert auth" ON public.formulario_fotos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Fotos: delete auth" ON public.formulario_fotos FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Notif: read auth" ON public.notificaciones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notif: insert auth" ON public.notificaciones FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Notif: update auth" ON public.notificaciones FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Notif: delete admin" ON public.notificaciones FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ========== STORAGE (bucket privado; lectura solo usuarios autenticados) ==========
INSERT INTO storage.buckets (id, name, public) VALUES ('formulario-fotos', 'formulario-fotos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

CREATE POLICY "Fotos read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'formulario-fotos');
CREATE POLICY "Fotos auth upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'formulario-fotos');
CREATE POLICY "Fotos auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'formulario-fotos');

-- Funciones internas: sin ejecución directa salvo lo necesario para RLS
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, anon;
