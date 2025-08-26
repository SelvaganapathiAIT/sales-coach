export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      accountability_reports: {
        Row: {
          created_at: string
          goals_analysis: string | null
          id: string
          instruction_id: string | null
          recommendations: string | null
          report_data: Json | null
          target_user_email: string
        }
        Insert: {
          created_at?: string
          goals_analysis?: string | null
          id?: string
          instruction_id?: string | null
          recommendations?: string | null
          report_data?: Json | null
          target_user_email: string
        }
        Update: {
          created_at?: string
          goals_analysis?: string | null
          id?: string
          instruction_id?: string | null
          recommendations?: string | null
          report_data?: Json | null
          target_user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "accountability_reports_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "coach_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json | null
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json | null
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      coach_instructions: {
        Row: {
          coach_email: string
          created_at: string
          from_email: string
          id: string
          instructions: string
          processed_at: string | null
          response_sent_at: string | null
          status: string | null
          subject: string
          target_user_email: string | null
          task_type: string | null
          updated_at: string
        }
        Insert: {
          coach_email: string
          created_at?: string
          from_email: string
          id?: string
          instructions: string
          processed_at?: string | null
          response_sent_at?: string | null
          status?: string | null
          subject: string
          target_user_email?: string | null
          task_type?: string | null
          updated_at?: string
        }
        Update: {
          coach_email?: string
          created_at?: string
          from_email?: string
          id?: string
          instructions?: string
          processed_at?: string | null
          response_sent_at?: string | null
          status?: string | null
          subject?: string
          target_user_email?: string | null
          task_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coach_users: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_users_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          email: string
          id: string
          name: string
          owner_user_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email: string
          id?: string
          name: string
          owner_user_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          name?: string
          owner_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      conversation_history: {
        Row: {
          agent_id: string
          conversation_summary: string | null
          created_at: string
          id: string
          key_insights: string[] | null
          last_topics: string[] | null
          updated_at: string
          user_challenges: string | null
          user_company: string | null
          user_goals: string | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          agent_id: string
          conversation_summary?: string | null
          created_at?: string
          id?: string
          key_insights?: string[] | null
          last_topics?: string[] | null
          updated_at?: string
          user_challenges?: string | null
          user_company?: string | null
          user_goals?: string | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          agent_id?: string
          conversation_summary?: string | null
          created_at?: string
          id?: string
          key_insights?: string[] | null
          last_topics?: string[] | null
          updated_at?: string
          user_challenges?: string | null
          user_company?: string | null
          user_goals?: string | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: []
      }
      conversation_messages: {
        Row: {
          content: string
          id: string
          message_type: string | null
          metadata: Json | null
          role: string
          session_id: string
          timestamp: string
        }
        Insert: {
          content: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role: string
          session_id: string
          timestamp?: string
        }
        Update: {
          content?: string
          id?: string
          message_type?: string | null
          metadata?: Json | null
          role?: string
          session_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "conversation_sessions"
            referencedColumns: ["id"]
          }
        ]
      }
      conversation_sessions: {
        Row: {
          coach_personality: string
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          key_outcomes: string[] | null
          session_summary: string | null
          session_title: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          coach_personality: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          key_outcomes?: string[] | null
          session_summary?: string | null
          session_title?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          coach_personality?: string
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          key_outcomes?: string[] | null
          session_summary?: string | null
          session_title?: string | null
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_connections: {
        Row: {
          additional_config: Json | null
          api_key: string | null
          api_secret: string | null
          created_at: string
          crm_name: string
          crm_type: string
          id: string
          instance_url: string | null
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_config?: Json | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          crm_name: string
          crm_type: string
          id?: string
          instance_url?: string | null
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_config?: Json | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          crm_name?: string
          crm_type?: string
          id?: string
          instance_url?: string | null
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_conversations: {
        Row: {
          coach_email: string
          coach_name: string
          created_at: string
          email_id: string | null
          id: string
          message: string
          recipient_email: string
          sent_at: string
          subject: string
          user_id: string
        }
        Insert: {
          coach_email: string
          coach_name: string
          created_at?: string
          email_id?: string | null
          id?: string
          message: string
          recipient_email: string
          sent_at?: string
          subject: string
          user_id: string
        }
        Update: {
          coach_email?: string
          coach_name?: string
          created_at?: string
          email_id?: string | null
          id?: string
          message?: string
          recipient_email?: string
          sent_at?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          callproof_api_key: string | null
          callproof_api_secret: string | null
          callproof_auto_sync: boolean | null
          callproof_enabled: boolean | null
          callproof_sync_interval: number | null
          company_name: string | null
          created_at: string
          default_coach_id: string | null
          email: string | null
          first_name: string | null
          id: string
          is_active: boolean
          last_name: string | null
          profile_photo_url: string | null
          role: string | null
          sales_description: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          callproof_api_key?: string | null
          callproof_api_secret?: string | null
          callproof_auto_sync?: boolean | null
          callproof_enabled?: boolean | null
          callproof_sync_interval?: number | null
          company_name?: string | null
          created_at?: string
          default_coach_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          profile_photo_url?: string | null
          role?: string | null
          sales_description?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          callproof_api_key?: string | null
          callproof_api_secret?: string | null
          callproof_auto_sync?: boolean | null
          callproof_enabled?: boolean | null
          callproof_sync_interval?: number | null
          company_name?: string | null
          created_at?: string
          default_coach_id?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          profile_photo_url?: string | null
          role?: string | null
          sales_description?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_coach_id_fkey"
            columns: ["default_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
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
      can_manage_coach: {
        Args: { _coach_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_coach_assignments: {
        Args: { _coach_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_accountability_report: {
        Args: {
          _target_email: string
          _instruction_id: string
          _user_id: string
        }
        Returns: boolean
      }
      can_view_coach: {
        Args: { _coach_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_coach_instruction: {
        Args: {
          _coach_email: string
          _target_user_email: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_coach_owner: {
        Args: { _coach_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_assigned_to_coach: {
        Args: { _coach_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "coach_admin"| "ceo" |"sales_rep"
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
      app_role: ["admin", "moderator", "user", "coach_admin"],
    },
  },
} as const
