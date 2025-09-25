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
      contact_avatars: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversation_analysis: {
        Row: {
          action_items: Json | null
          category: string
          completion_status: string
          conversation_id: string
          created_at: string
          id: string
          key_contacts: string[] | null
          processed_at: string
          sentiment: string
          suggested_response: string | null
          summary: string | null
          topic: string | null
          urgency_score: number | null
        }
        Insert: {
          action_items?: Json | null
          category: string
          completion_status: string
          conversation_id: string
          created_at?: string
          id?: string
          key_contacts?: string[] | null
          processed_at?: string
          sentiment: string
          suggested_response?: string | null
          summary?: string | null
          topic?: string | null
          urgency_score?: number | null
        }
        Update: {
          action_items?: Json | null
          category?: string
          completion_status?: string
          conversation_id?: string
          created_at?: string
          id?: string
          key_contacts?: string[] | null
          processed_at?: string
          sentiment?: string
          suggested_response?: string | null
          summary?: string | null
          topic?: string | null
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          gmail_message_id: string
          has_attachments: boolean | null
          id: string
          labels: string[] | null
          last_message_date: string
          message_count: number | null
          participants: string[]
          snippet: string | null
          subject: string
          thread_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gmail_message_id: string
          has_attachments?: boolean | null
          id?: string
          labels?: string[] | null
          last_message_date: string
          message_count?: number | null
          participants: string[]
          snippet?: string | null
          subject: string
          thread_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gmail_message_id?: string
          has_attachments?: boolean | null
          id?: string
          labels?: string[] | null
          last_message_date?: string
          message_count?: number | null
          participants?: string[]
          snippet?: string | null
          subject?: string
          thread_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      data_access_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          resource_count: number | null
          resource_type: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_count?: number | null
          resource_type: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_count?: number | null
          resource_type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_contents: {
        Row: {
          conversation_id: string
          created_at: string
          encrypted_body: string
          encryption_iv: string
          expires_at: string
          id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          encrypted_body: string
          encryption_iv: string
          expires_at?: string
          id?: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          encrypted_body?: string
          encryption_iv?: string
          expires_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_contents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      gmail_tokens: {
        Row: {
          created_at: string
          encrypted_access_token: string | null
          encrypted_refresh_token: string
          encryption_iv: string
          gmail_account_email: string | null
          id: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token: string
          encryption_iv: string
          gmail_account_email?: string | null
          id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string
          encryption_iv?: string
          gmail_account_email?: string | null
          id?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auto_purge_enabled: boolean | null
          avatar_url: string | null
          created_at: string
          email: string | null
          email_retention_days: number | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_purge_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_retention_days?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_purge_enabled?: boolean | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_retention_days?: number | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_processing_history: {
        Row: {
          conversations_processed: number | null
          created_at: string
          id: string
          last_processing_date: string | null
          monthly_limit: number | null
          subscription_tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          conversations_processed?: number | null
          created_at?: string
          id?: string
          last_processing_date?: string | null
          monthly_limit?: number | null
          subscription_tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          conversations_processed?: number | null
          created_at?: string
          id?: string
          last_processing_date?: string | null
          monthly_limit?: number | null
          subscription_tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_gmail_account_email: {
        Args: { user_token: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
