export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contribuyentes: {
        Row: {
          ci: string
          created_at: string
          created_by: string | null
          id: string
          nombre_completo: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          ci: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre_completo: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          ci?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      formulario_ambientes: {
        Row: {
          ambiente: string
          ancho: number
          created_at: string
          formulario_id: string
          id: string
          largo: number
          orden: number
        }
        Insert: {
          ambiente: string
          ancho: number
          created_at?: string
          formulario_id: string
          id?: string
          largo: number
          orden: number
        }
        Update: {
          ambiente?: string
          ancho?: number
          created_at?: string
          formulario_id?: string
          id?: string
          largo?: number
          orden?: number
        }
        Relationships: [
          {
            foreignKeyName: "formulario_ambientes_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_baja_fotos: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulario_baja_fotos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_visita_verificacion: {
        Row: {
          created_at: string
          created_by: string | null
          fecha_visita: string
          formulario_id: string
          id: string
          observacion: string | null
          resultado: Database["public"]["Enums"]["formulario_visita_resultado"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha_visita?: string
          formulario_id: string
          id?: string
          observacion?: string | null
          resultado: Database["public"]["Enums"]["formulario_visita_resultado"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha_visita?: string
          formulario_id?: string
          id?: string
          observacion?: string | null
          resultado?: Database["public"]["Enums"]["formulario_visita_resultado"]
        }
        Relationships: [
          {
            foreignKeyName: "formulario_visita_verificacion_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formulario_visita_verificacion_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_fotos: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulario_fotos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_tramite: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          orden: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      formularios: {
        Row: {
          baja_at: string | null
          baja_pdf_path: string | null
          celular: string
          contribuyente_id: string
          created_at: string
          created_by: string | null
          direccion: string
          estado: Database["public"]["Enums"]["formulario_estado"]
          fecha: string
          id: string
          latitud: number | null
          longitud: number | null
          mapa_zoom: number | null
          nit: string | null
          observacion: string | null
          padron: boolean
          bebidas_alcoholicas: boolean
          procedente: boolean
          razon_social: string
          referencia: string
          superficie: number | null
          tipo_tramite_id: string
          updated_at: string
          verificado_at: string | null
          verificado_por: string | null
          zona: Database["public"]["Enums"]["zona_tipo"]
        }
        Insert: {
          baja_at?: string | null
          baja_pdf_path?: string | null
          celular: string
          contribuyente_id: string
          created_at?: string
          created_by?: string | null
          direccion: string
          estado?: Database["public"]["Enums"]["formulario_estado"]
          fecha?: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          mapa_zoom?: number | null
          nit?: string | null
          observacion?: string | null
          padron?: boolean
          bebidas_alcoholicas?: boolean
          procedente?: boolean
          razon_social: string
          referencia: string
          superficie?: number | null
          tipo_tramite_id: string
          updated_at?: string
          verificado_at?: string | null
          verificado_por?: string | null
          zona: Database["public"]["Enums"]["zona_tipo"]
        }
        Update: {
          baja_at?: string | null
          baja_pdf_path?: string | null
          celular?: string
          contribuyente_id?: string
          created_at?: string
          created_by?: string | null
          direccion?: string
          estado?: Database["public"]["Enums"]["formulario_estado"]
          fecha?: string
          id?: string
          latitud?: number | null
          longitud?: number | null
          mapa_zoom?: number | null
          nit?: string | null
          observacion?: string | null
          padron?: boolean
          bebidas_alcoholicas?: boolean
          procedente?: boolean
          razon_social?: string
          referencia?: string
          superficie?: number | null
          tipo_tramite_id?: string
          updated_at?: string
          verificado_at?: string | null
          verificado_por?: string | null
          zona?: Database["public"]["Enums"]["zona_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "formularios_contribuyente_id_fkey"
            columns: ["contribuyente_id"]
            isOneToOne: false
            referencedRelation: "contribuyentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formularios_tipo_tramite_id_fkey"
            columns: ["tipo_tramite_id"]
            isOneToOne: false
            referencedRelation: "tipos_tramite"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacion_historial: {
        Row: {
          created_at: string
          created_by: string | null
          fecha_limite: string
          id: string
          notificacion_id: string
          numero: number
          observacion: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fecha_limite: string
          id?: string
          notificacion_id: string
          numero: number
          observacion?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fecha_limite?: string
          id?: string
          notificacion_id?: string
          numero?: number
          observacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notificacion_historial_notificacion_id_fkey"
            columns: ["notificacion_id"]
            isOneToOne: false
            referencedRelation: "notificaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      notificaciones: {
        Row: {
          bienes_inmuebles: boolean
          contribuyente_id: string | null
          created_at: string
          created_by: string | null
          direccion: string
          estado: Database["public"]["Enums"]["notificacion_estado"]
          fecha_limite: string
          id: string
          gestiones_adeudadas: string | null
          impuestos_patente: boolean
          latitud: number | null
          longitud: number | null
          mapa_zoom: number | null
          nombre_actividad: string | null
          numero_identificacion: string | null
          observacion_seguimiento: string | null
          padron_municipal: boolean
          permiso_bebidas_alcoholicas: boolean
          updated_at: string
          veces_notificado: number
          vehiculos: boolean
        }
        Insert: {
          bienes_inmuebles?: boolean
          contribuyente_id?: string | null
          created_at?: string
          created_by?: string | null
          direccion: string
          estado?: Database["public"]["Enums"]["notificacion_estado"]
          fecha_limite: string
          id?: string
          gestiones_adeudadas?: string | null
          impuestos_patente?: boolean
          latitud?: number | null
          longitud?: number | null
          mapa_zoom?: number | null
          nombre_actividad?: string | null
          numero_identificacion?: string | null
          observacion_seguimiento?: string | null
          padron_municipal?: boolean
          permiso_bebidas_alcoholicas?: boolean
          updated_at?: string
          veces_notificado?: number
          vehiculos?: boolean
        }
        Update: {
          bienes_inmuebles?: boolean
          contribuyente_id?: string
          created_at?: string
          created_by?: string | null
          direccion?: string
          estado?: Database["public"]["Enums"]["notificacion_estado"]
          fecha_limite?: string
          id?: string
          gestiones_adeudadas?: string | null
          impuestos_patente?: boolean
          latitud?: number | null
          longitud?: number | null
          mapa_zoom?: number | null
          nombre_actividad?: string | null
          numero_identificacion?: string | null
          observacion_seguimiento?: string | null
          padron_municipal?: boolean
          permiso_bebidas_alcoholicas?: boolean
          updated_at?: string
          veces_notificado?: number
          vehiculos?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notificaciones_contribuyente_id_fkey"
            columns: ["contribuyente_id"]
            isOneToOne: false
            referencedRelation: "contribuyentes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          activo: boolean
          bloqueado: boolean
          ci: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          intentos_fallidos: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          bloqueado?: boolean
          ci?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          intentos_fallidos?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          bloqueado?: boolean
          ci?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          intentos_fallidos?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      zona_divisiones: {
        Row: {
          coordenadas: Json
          id: string
          updated_at: string
          updated_by: string | null
          zona_lado_a: Database["public"]["Enums"]["zona_tipo"]
          zona_lado_b: Database["public"]["Enums"]["zona_tipo"]
        }
        Insert: {
          coordenadas: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
          zona_lado_a: Database["public"]["Enums"]["zona_tipo"]
          zona_lado_b: Database["public"]["Enums"]["zona_tipo"]
        }
        Update: {
          coordenadas?: Json
          id?: string
          updated_at?: string
          updated_by?: string | null
          zona_lado_a?: Database["public"]["Enums"]["zona_tipo"]
          zona_lado_b?: Database["public"]["Enums"]["zona_tipo"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
      formulario_estado: "activo" | "baja" | "anulado" | "pendiente_verificacion"
      formulario_visita_resultado:
        | "cerrada"
        | "sin_titular"
        | "acceso_denegado"
        | "direccion_no_coincide"
        | "horario_fuera"
        | "otro"
      notificacion_estado: "pendiente" | "cumplido" | "anulado"
      zona_tipo: "A" | "B" | "C" | "D" | "E"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "operador"],
      formulario_estado: ["activo", "baja", "anulado", "pendiente_verificacion"],
      formulario_visita_resultado: [
        "cerrada",
        "sin_titular",
        "acceso_denegado",
        "direccion_no_coincide",
        "horario_fuera",
        "otro",
      ],
      notificacion_estado: ["pendiente", "cumplido", "anulado"],
      zona_tipo: ["A", "B", "C", "D", "E"],
    },
  },
} as const
