# SIRAT - Sistema Integral de Registro y Administración Tributaria

Sistema web responsivo (mobile-first) para gestión tributaria con autenticación por roles, contribuyentes, formularios de verificación con mapas y fotos, notificaciones y reportes.

## Stack
- TanStack Start + Tailwind + shadcn
- **Lovable Cloud** (auth, base de datos PostgreSQL, storage de fotos)
- Leaflet + OpenStreetMap (mapas gratuitos, sin API key)
- jsPDF + autoTable para PDFs

## Diseño visual (mobile-first)
- Paleta institucional sobria: azul profundo `oklch(0.35 0.13 250)` + dorado `oklch(0.75 0.13 80)` como acento, fondo claro
- Tipografía: Inter para UI, Playfair Display para títulos (sello institucional)
- Layout móvil: bottom navigation con íconos grandes, tarjetas apiladas, FAB para acciones primarias
- Layout desktop: sidebar lateral colapsable
- Componentes táctiles (mín 44px), formularios paso a paso en móvil

## Estructura de rutas
```
/login                              Login
/                                   Dashboard (según rol)
/contribuyentes                     Lista + buscar
/contribuyentes/nuevo               Registro
/contribuyentes/$id                 Detalle/editar
/formularios                        Lista de verificaciones
/formularios/nuevo                  Registro con mapa + fotos
/formularios/$id                    Ver/editar/PDF
/notificaciones                     Lista
/notificaciones/nuevo               Crear notificación
/notificaciones/$id                 Detalle/seguimiento
/mapa                               Vista global de actividades
/reportes                           (admin) Reportes y exports
/usuarios                           (admin) Gestión usuarios
/perfil                             Cambio de contraseña
```

## Esquema de base de datos
- `profiles` (id, full_name, email, ci, activo, intentos_fallidos, bloqueado)
- `user_roles` (user_id, role: admin|operador) — tabla separada con `has_role()` SECURITY DEFINER
- `contribuyentes` (id, ci UNIQUE, nombre_completo, telefono, created_by, created_at)
- `tipos_actividad` (id, nombre)
- `formularios` (id, numero serial desde 1000, codigo_actividad, contribuyente_id, razon_social, nit, zona, superficie, tipo_actividad_id, direccion, celular, referencia, latitud, longitud, procedente, padron_bebidas, observacion, estado: activo|baja|anulado, created_by, created_at)
- `formulario_fotos` (id, formulario_id, storage_path) — máx 2 vía check
- `notificaciones` (id, codigo serial desde 5000, numero_correlativo, contribuyente_id, nombre_notificado, direccion, fecha_limite, tipo: aviso|advertencia|multa, conceptos jsonb, estado: pendiente|cumplido|anulado, created_by, created_at)
- `auditoria` (id, user_id, accion, entidad, entidad_id, detalle jsonb, created_at)
- Storage bucket `formulario-fotos` (privado, RLS)
- RLS en todas las tablas; policies usan `has_role()`

## Reglas de negocio implementadas
- No eliminar contribuyente con formularios (constraint + UI)
- Validación duplicado CI + razón social
- Bloqueo tras 5 intentos fallidos (trigger en login)
- Estados lógicos en lugar de delete físico
- Todos los campos obligatorios excepto NIT

## Alcance del MVP (esta entrega)
1. Sistema de diseño + login responsivo
2. Cloud + esquema completo + RLS + roles
3. CRUD contribuyentes
4. Formularios de verificación con mapa Leaflet + subida de hasta 2 fotos
5. Notificaciones con seguimiento
6. Vista mapa global
7. Generación de PDFs (formulario + notificación)
8. Dashboard básico por rol
9. Gestión de usuarios (admin)
10. Reportes con export PDF/Excel

## Fuera de alcance del MVP (siguientes iteraciones)
- **Funcionamiento offline / PWA con sync**: requiere arquitectura compleja (Service Worker + IndexedDB + cola de sincronización). Lo agrego después si confirmas.
- **Reseteo de contraseña por email con contraseña temporal**: en MVP el admin dispara un reset estándar de Supabase Auth (link por email). El "password temporal generado" lo añado en una segunda pasada si lo prefieres.
- Reportes muy complejos de "deudas" y "padrones pendientes" requieren más detalle del modelo de deuda — los dejo como tablas simples filtradas hasta que definas la lógica de cálculo.

¿Procedo con este alcance?
