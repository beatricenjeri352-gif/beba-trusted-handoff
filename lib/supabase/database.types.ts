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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      business_members: {
        Row: {
          business_id: string
          created_at: string
          id: string
          invited_by: string | null
          member_role: string
          membership_status: Database["public"]["Enums"]["role_status"]
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          member_role: string
          membership_status?: Database["public"]["Enums"]["role_status"]
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          member_role?: string
          membership_status?: Database["public"]["Enums"]["role_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          application_status: Database["public"]["Enums"]["approval_status"]
          approved_at: string | null
          approved_by: string | null
          business_address: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          business_type: string | null
          created_at: string
          id: string
          registration_number: string | null
          updated_at: string
        }
        Insert: {
          application_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          registration_number?: string | null
          updated_at?: string
        }
        Update: {
          application_status?: Database["public"]["Enums"]["approval_status"]
          approved_at?: string | null
          approved_by?: string | null
          business_address?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          business_type?: string | null
          created_at?: string
          id?: string
          registration_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_profiles: {
        Row: {
          active_status: boolean
          approval_status: Database["public"]["Enums"]["approval_status"]
          carrier_type: string | null
          created_at: string
          delivery_methods: string[]
          id: string
          operating_towns: string[]
          profile_description: string | null
          profile_photo_path: string | null
          updated_at: string
          user_id: string
          vehicle_registration: string | null
          vehicle_type: string | null
        }
        Insert: {
          active_status?: boolean
          approval_status?: Database["public"]["Enums"]["approval_status"]
          carrier_type?: string | null
          created_at?: string
          delivery_methods?: string[]
          id?: string
          operating_towns?: string[]
          profile_description?: string | null
          profile_photo_path?: string | null
          updated_at?: string
          user_id: string
          vehicle_registration?: string | null
          vehicle_type?: string | null
        }
        Update: {
          active_status?: boolean
          approval_status?: Database["public"]["Enums"]["approval_status"]
          carrier_type?: string | null
          created_at?: string
          delivery_methods?: string[]
          id?: string
          operating_towns?: string[]
          profile_description?: string | null
          profile_photo_path?: string | null
          updated_at?: string
          user_id?: string
          vehicle_registration?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carrier_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_requests: {
        Row: {
          accepted_quote_id: string | null
          business_id: string | null
          created_at: string
          current_status: Database["public"]["Enums"]["delivery_status"]
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id: string
          parcel_description: string
          parcel_size: string | null
          sender_user_id: string
          tracking_number: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          accepted_quote_id?: string | null
          business_id?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["delivery_status"]
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          id?: string
          parcel_description: string
          parcel_size?: string | null
          sender_user_id: string
          tracking_number: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          accepted_quote_id?: string | null
          business_id?: string | null
          created_at?: string
          current_status?: Database["public"]["Enums"]["delivery_status"]
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          id?: string
          parcel_description?: string
          parcel_size?: string | null
          sender_user_id?: string
          tracking_number?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_requests_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_stops: {
        Row: {
          address: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          delivery_request_id: string
          id: string
          instructions: string | null
          latitude: number | null
          location_name: string | null
          longitude: number | null
          sequence_number: number
          stop_type: Database["public"]["Enums"]["delivery_stop_type"]
          town: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_request_id: string
          id?: string
          instructions?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          sequence_number: number
          stop_type: Database["public"]["Enums"]["delivery_stop_type"]
          town?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          delivery_request_id?: string
          id?: string
          instructions?: string | null
          latitude?: number | null
          location_name?: string | null
          longitude?: number | null
          sequence_number?: number
          stop_type?: Database["public"]["Enums"]["delivery_stop_type"]
          town?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_stops_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          created_at: string
          document_storage_path: string | null
          id: string
          identity_reference: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string
          user_id: string
          verification_method: string
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          created_at?: string
          document_storage_path?: string | null
          id?: string
          identity_reference?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
          user_id: string
          verification_method: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          created_at?: string
          document_storage_path?: string | null
          id?: string
          identity_reference?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string
          user_id?: string
          verification_method?: string
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role_name"]
          status: Database["public"]["Enums"]["role_status"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role_name"]
          status?: Database["public"]["Enums"]["role_status"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role_name"]
          status?: Database["public"]["Enums"]["role_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          account_status: Database["public"]["Enums"]["account_status"]
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone_number: string | null
          updated_at: string
        }
        Insert: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          phone_number?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: Database["public"]["Enums"]["account_status"]
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_administrator: { Args: never; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "suspended" | "deleted"
      approval_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "suspended"
      delivery_method: "within_town" | "to_stage" | "intertown"
      delivery_status:
        | "draft"
        | "awaiting_carrier"
        | "carrier_selected"
        | "awaiting_carrier_confirmation"
        | "carrier_confirmed"
        | "goods_collected"
        | "in_transit"
        | "at_handover_point"
        | "awaiting_receiver_confirmation"
        | "completed"
        | "cancelled"
        | "failed"
        | "under_review"
        | "disputed"
        | "returned"
      delivery_stop_type: "pickup" | "handover" | "destination"
      role_status: "pending" | "approved" | "suspended" | "rejected"
      user_role_name: "sender" | "carrier" | "administrator"
      verification_status:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_more_information"
        | "expired"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "suspended", "deleted"],
      approval_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "suspended",
      ],
      delivery_method: ["within_town", "to_stage", "intertown"],
      delivery_status: [
        "draft",
        "awaiting_carrier",
        "carrier_selected",
        "awaiting_carrier_confirmation",
        "carrier_confirmed",
        "goods_collected",
        "in_transit",
        "at_handover_point",
        "awaiting_receiver_confirmation",
        "completed",
        "cancelled",
        "failed",
        "under_review",
        "disputed",
        "returned",
      ],
      delivery_stop_type: ["pickup", "handover", "destination"],
      role_status: ["pending", "approved", "suspended", "rejected"],
      user_role_name: ["sender", "carrier", "administrator"],
      verification_status: [
        "pending",
        "approved",
        "rejected",
        "needs_more_information",
        "expired",
      ],
    },
  },
} as const
