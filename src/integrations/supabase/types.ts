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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          entity_id: string
          entity_type: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          timestamp: string
          updated_by: string | null
        }
        Insert: {
          entity_id: string
          entity_type: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          timestamp?: string
          updated_by?: string | null
        }
        Update: {
          entity_id?: string
          entity_type?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          timestamp?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coating_vendors: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      colour_shades: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      dealers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      dispatch: {
        Row: {
          dispatch_date: string | null
          id: string
          order_id: string
          transporter: string | null
          vehicle_details: string | null
          windows_dispatched: number
        }
        Insert: {
          dispatch_date?: string | null
          id?: string
          order_id: string
          transporter?: string | null
          vehicle_details?: string | null
          windows_dispatched?: number
        }
        Update: {
          dispatch_date?: string | null
          id?: string
          order_id?: string
          transporter?: string | null
          vehicle_details?: string | null
          windows_dispatched?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      installation: {
        Row: {
          id: string
          installation_completed: string | null
          installation_planned: string | null
          installation_status: string
          order_id: string
        }
        Insert: {
          id?: string
          installation_completed?: string | null
          installation_planned?: string | null
          installation_status?: string
          order_id: string
        }
        Update: {
          id?: string
          installation_completed?: string | null
          installation_planned?: string | null
          installation_status?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "installation_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      material_status: {
        Row: {
          aluminium_expected_date: string | null
          aluminium_status: string
          coating_vendor: string | null
          glass_expected_date: string | null
          glass_status: string
          hardware_expected_date: string | null
          hardware_status: string
          id: string
          order_id: string
        }
        Insert: {
          aluminium_expected_date?: string | null
          aluminium_status?: string
          coating_vendor?: string | null
          glass_expected_date?: string | null
          glass_status?: string
          hardware_expected_date?: string | null
          hardware_status?: string
          id?: string
          order_id: string
        }
        Update: {
          aluminium_expected_date?: string | null
          aluminium_status?: string
          coating_vendor?: string | null
          glass_expected_date?: string | null
          glass_status?: string
          hardware_expected_date?: string | null
          hardware_status?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_status_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          advance_received: number
          balance_amount: number
          colour_shade: string | null
          commercial_status: string
          created_at: string
          dealer_name: string
          design_status: string
          dispatch_status: string
          finance_status: string
          id: string
          installation_status: string
          order_name: string
          order_value: number
          quote_no: string | null
          sales_order_no: string | null
          salesperson: string | null
          sqft: number
          survey_status: string
          total_windows: number
          windows_released: number
        }
        Insert: {
          advance_received?: number
          balance_amount?: number
          colour_shade?: string | null
          commercial_status?: string
          created_at?: string
          dealer_name?: string
          design_status?: string
          dispatch_status?: string
          finance_status?: string
          id?: string
          installation_status?: string
          order_name?: string
          order_value?: number
          quote_no?: string | null
          sales_order_no?: string | null
          salesperson?: string | null
          sqft?: number
          survey_status?: string
          total_windows?: number
          windows_released?: number
        }
        Update: {
          advance_received?: number
          balance_amount?: number
          colour_shade?: string | null
          commercial_status?: string
          created_at?: string
          dealer_name?: string
          design_status?: string
          dispatch_status?: string
          finance_status?: string
          id?: string
          installation_status?: string
          order_name?: string
          order_value?: number
          quote_no?: string | null
          sales_order_no?: string | null
          salesperson?: string | null
          sqft?: number
          survey_status?: string
          total_windows?: number
          windows_released?: number
        }
        Relationships: []
      }
      production_status: {
        Row: {
          assembly: number
          cutting: number
          glazing: number
          id: string
          order_id: string
          packing: number
          qc: number
          unit: string | null
        }
        Insert: {
          assembly?: number
          cutting?: number
          glazing?: number
          id?: string
          order_id: string
          packing?: number
          qc?: number
          unit?: string | null
        }
        Update: {
          assembly?: number
          cutting?: number
          glazing?: number
          id?: string
          order_id?: string
          packing?: number
          qc?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "production_status_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      production_units: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      salespersons: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      app_role:
        | "sales"
        | "finance"
        | "survey"
        | "design"
        | "procurement"
        | "stores"
        | "production"
        | "quality"
        | "dispatch"
        | "installation"
        | "management"
        | "admin"
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
      app_role: [
        "sales",
        "finance",
        "survey",
        "design",
        "procurement",
        "stores",
        "production",
        "quality",
        "dispatch",
        "installation",
        "management",
        "admin",
      ],
    },
  },
} as const
