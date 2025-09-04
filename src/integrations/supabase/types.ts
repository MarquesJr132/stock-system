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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          id: string
          ip_address: unknown | null
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          tenant_id: string
          timestamp: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          tenant_id: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          ip_address?: unknown | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          tenant_id?: string
          timestamp?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      company_settings: {
        Row: {
          account_holder: string | null
          account_number: string | null
          address: string | null
          bank_name: string | null
          company_name: string
          created_at: string
          email: string | null
          iban: string | null
          id: string
          logo_url: string | null
          nuit: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          nuit?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_name?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          iban?: string | null
          id?: string
          logo_url?: string | null
          nuit?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          nuit: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          nuit?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          nuit?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      data_usage_log: {
        Row: {
          action_type: string
          created_at: string
          created_by: string
          data_type: string
          id: string
          tenant_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          created_by: string
          data_type: string
          id?: string
          tenant_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          created_by?: string
          data_type?: string
          id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          min_stock: number | null
          name: string
          purchase_price: number
          quantity: number
          reorder_level: number | null
          reorder_quantity: number | null
          sale_price: number
          supplier: string | null
          supplier_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          min_stock?: number | null
          name: string
          purchase_price: number
          quantity?: number
          reorder_level?: number | null
          reorder_quantity?: number | null
          sale_price: number
          supplier?: string | null
          supplier_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          min_stock?: number | null
          name?: string
          purchase_price?: number
          quantity?: number
          reorder_level?: number | null
          reorder_quantity?: number | null
          sale_price?: number
          supplier?: string | null
          supplier_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          purchase_order_id: string | null
          quantity: number
          received_quantity: number | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string | null
          quantity: number
          received_quantity?: number | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          purchase_order_id?: string | null
          quantity?: number
          received_quantity?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          received_date: string | null
          status: string | null
          supplier_id: string | null
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          received_date?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          tenant_id: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          received_date?: string | null
          status?: string | null
          supplier_id?: string | null
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          created_at: string
          id: string
          includes_vat: boolean
          product_id: string
          quantity: number
          quotation_id: string
          subtotal: number
          tenant_id: string
          total: number
          unit_price: number
          vat_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          includes_vat?: boolean
          product_id: string
          quantity: number
          quotation_id: string
          subtotal: number
          tenant_id: string
          total: number
          unit_price: number
          vat_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          includes_vat?: boolean
          product_id?: string
          quantity?: number
          quotation_id?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          unit_price?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          notes: string | null
          payment_method: string
          status: string
          tenant_id: string
          total_amount: number
          total_profit: number
          total_vat_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          status?: string
          tenant_id: string
          total_amount: number
          total_profit?: number
          total_vat_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          total_profit?: number
          total_vat_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          includes_vat: boolean
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          tenant_id: string
          total: number
          unit_price: number
          vat_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          includes_vat?: boolean
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          tenant_id: string
          total: number
          unit_price: number
          vat_amount?: number
        }
        Update: {
          created_at?: string
          id?: string
          includes_vat?: boolean
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
          tenant_id?: string
          total?: number
          unit_price?: number
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          notes: string | null
          payment_method: string
          status: string | null
          tenant_id: string
          total_amount: number
          total_profit: number
          total_vat_amount: number
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          status?: string | null
          tenant_id: string
          total_amount: number
          total_profit?: number
          total_vat_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          status?: string | null
          tenant_id?: string
          total_amount?: number
          total_profit?: number
          total_vat_amount?: number
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      special_order_items: {
        Row: {
          created_at: string
          id: string
          product_description: string | null
          product_name: string
          profit_amount: number
          quantity: number
          special_order_id: string
          subtotal: number
          tenant_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_name: string
          profit_amount?: number
          quantity?: number
          special_order_id: string
          subtotal: number
          tenant_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          product_description?: string | null
          product_name?: string
          profit_amount?: number
          quantity?: number
          special_order_id?: string
          subtotal?: number
          tenant_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      special_orders: {
        Row: {
          actual_delivery_date: string | null
          advance_payment: number | null
          created_at: string
          created_by: string
          customer_id: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          payment_method: string | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          actual_delivery_date?: string | null
          advance_payment?: number | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_method?: string | null
          status?: string
          tenant_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          actual_delivery_date?: string | null
          advance_payment?: number | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          payment_method?: string | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          contact_person: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          payment_terms: number | null
          phone: string | null
          status: string | null
          tax_number: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          status?: string | null
          tax_number?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_person?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          status?: string | null
          tax_number?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_limits: {
        Row: {
          created_at: string
          created_by: string
          current_month_usage: number
          current_month_users: number
          id: string
          limit_period_start: string
          monthly_data_limit: number
          monthly_user_limit: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          current_month_usage?: number
          current_month_users?: number
          id?: string
          limit_period_start?: string
          monthly_data_limit?: number
          monthly_user_limit?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          current_month_usage?: number
          current_month_users?: number
          id?: string
          limit_period_start?: string
          monthly_data_limit?: number
          monthly_user_limit?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_user: {
        Args: {
          admin_tenant_id?: string
          user_email: string
          user_full_name: string
          user_password: string
          user_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: Json
      }
      assign_user_to_admin_tenant: {
        Args: { admin_email: string; user_email: string }
        Returns: undefined
      }
      atomic_stock_update: {
        Args: {
          p_product_id: string
          p_quantity_change: number
          p_tenant_id: string
        }
        Returns: boolean
      }
      check_data_limit: {
        Args: { data_type_param: string; tenant_uuid: string }
        Returns: boolean
      }
      check_user_limit: {
        Args: { tenant_uuid: string }
        Returns: boolean
      }
      cleanup_tenant_data: {
        Args: { tenant_uuid: string }
        Returns: undefined
      }
      get_administrators: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          created_by: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_current_user_tenant: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_profile: {
        Args: { user_uuid: string }
        Returns: {
          created_at: string | null
          created_by: string | null
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
      }
      get_user_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: { check_role: Database["public"]["Enums"]["user_role"] }
        Returns: boolean
      }
      increment_user_count: {
        Args: { tenant_uuid: string }
        Returns: boolean
      }
      initialize_tenant_limits: {
        Args: { tenant_uuid: string }
        Returns: undefined
      }
      is_administrator: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_gerente: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_superuser: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      mask_sensitive_data: {
        Args: { data_json: Json }
        Returns: Json
      }
      promote_to_superuser: {
        Args: { user_email: string }
        Returns: undefined
      }
      reset_monthly_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_all_tenant_counters: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_tenant_counters: {
        Args: { tenant_uuid: string }
        Returns: undefined
      }
      sync_tenant_data_usage: {
        Args: { tenant_uuid: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "superuser" | "administrator" | "user" | "gerente"
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
      user_role: ["superuser", "administrator", "user", "gerente"],
    },
  },
} as const
