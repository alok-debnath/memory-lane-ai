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
      ai_nudges: {
        Row: {
          based_on: Json | null
          created_at: string
          expires_at: string | null
          id: string
          is_acted_on: boolean
          is_dismissed: boolean
          message: string
          nudge_type: string
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          based_on?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_acted_on?: boolean
          is_dismissed?: boolean
          message: string
          nudge_type?: string
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          based_on?: Json | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_acted_on?: boolean
          is_dismissed?: boolean
          message?: string
          nudge_type?: string
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      diary_entries: {
        Row: {
          created_at: string
          energy_level: string | null
          habits_detected: Json | null
          id: string
          mood: string | null
          personality_traits: Json | null
          raw_text: string
          structured_insights: Json | null
          topics: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          energy_level?: string | null
          habits_detected?: Json | null
          id?: string
          mood?: string | null
          personality_traits?: Json | null
          raw_text: string
          structured_insights?: Json | null
          topics?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          energy_level?: string | null
          habits_detected?: Json | null
          id?: string
          mood?: string | null
          personality_traits?: Json | null
          raw_text?: string
          structured_insights?: Json | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      document_extractions: {
        Row: {
          attachment_id: string
          created_at: string
          document_type: string | null
          embedding: string | null
          expiry_date: string | null
          extracted_text: string
          id: string
          key_details: Json | null
          memory_id: string
          user_id: string
        }
        Insert: {
          attachment_id: string
          created_at?: string
          document_type?: string | null
          embedding?: string | null
          expiry_date?: string | null
          extracted_text?: string
          id?: string
          key_details?: Json | null
          memory_id: string
          user_id: string
        }
        Update: {
          attachment_id?: string
          created_at?: string
          document_type?: string | null
          embedding?: string | null
          expiry_date?: string | null
          extracted_text?: string
          id?: string
          key_details?: Json | null
          memory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_extractions_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          memory_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
          memory_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          memory_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_attachments_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      memory_history: {
        Row: {
          action: string
          created_at: string
          id: string
          memory_id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          memory_id: string
          snapshot: Json
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          memory_id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: []
      }
      memory_notes: {
        Row: {
          capsule_unlock_date: string | null
          category: string | null
          content: string
          created_at: string
          embedding: string | null
          extracted_actions: Json | null
          id: string
          is_recurring: boolean
          mood: string | null
          recurrence_type: string | null
          reminder_date: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          capsule_unlock_date?: string | null
          category?: string | null
          content: string
          created_at?: string
          embedding?: string | null
          extracted_actions?: Json | null
          id?: string
          is_recurring?: boolean
          mood?: string | null
          recurrence_type?: string | null
          reminder_date?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          capsule_unlock_date?: string | null
          category?: string | null
          content?: string
          created_at?: string
          embedding?: string | null
          extracted_actions?: Json | null
          id?: string
          is_recurring?: boolean
          mood?: string | null
          recurrence_type?: string | null
          reminder_date?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_schedule: {
        Row: {
          created_at: string
          ease_factor: number
          id: string
          interval_days: number
          last_reviewed_at: string | null
          memory_id: string
          next_review_at: string
          repetitions: number
          user_id: string
        }
        Insert: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          memory_id: string
          next_review_at?: string
          repetitions?: number
          user_id: string
        }
        Update: {
          created_at?: string
          ease_factor?: number
          id?: string
          interval_days?: number
          last_reviewed_at?: string | null
          memory_id?: string
          next_review_at?: string
          repetitions?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_schedule_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_memories: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          memory_id: string
          share_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          memory_id: string
          share_token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          memory_id?: string
          share_token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_memories_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memory_notes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_history: { Args: never; Returns: undefined }
      fuzzy_search_memories: {
        Args: {
          max_results?: number
          p_user_id: string
          search_query: string
          similarity_threshold?: number
        }
        Returns: {
          category: string
          content: string
          created_at: string
          fuzzy_score: number
          id: string
          is_recurring: boolean
          recurrence_type: string
          reminder_date: string
          title: string
        }[]
      }
      get_flashback_memories: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          mood: string
          title: string
        }[]
      }
      get_memories_paginated: {
        Args: {
          p_category?: string
          p_cursor?: string
          p_limit?: number
          p_user_id: string
        }
        Returns: {
          capsule_unlock_date: string
          category: string
          content: string
          created_at: string
          extracted_actions: Json
          id: string
          is_recurring: boolean
          mood: string
          recurrence_type: string
          reminder_date: string
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      match_documents: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          attachment_id: string
          created_at: string
          document_type: string
          expiry_date: string
          extracted_text: string
          id: string
          key_details: Json
          memory_id: string
          similarity: number
        }[]
      }
      match_memories: {
        Args: {
          match_count?: number
          match_threshold?: number
          p_user_id?: string
          query_embedding: string
        }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          is_recurring: boolean
          recurrence_type: string
          reminder_date: string
          similarity: number
          title: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
