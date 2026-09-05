export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_analyses: {
        Row: {
          created_at: string
          created_by: string
          id: string
          model: string
          result: Json
          score: number | null
          source_id: string
          source_kind: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          model?: string
          result?: Json
          score?: number | null
          source_id: string
          source_kind: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          model?: string
          result?: Json
          score?: number | null
          source_id?: string
          source_kind?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_contents: {
        Row: {
          competitor_id: string
          created_at: string
          external_id: string
          id: string
          likes: number
          outlier_index: number
          published_at: string | null
          thumbnail: string
          title: string
          updated_at: string
          views: number
          workspace_id: string
        }
        Insert: {
          competitor_id: string
          created_at?: string
          external_id: string
          id?: string
          likes?: number
          outlier_index?: number
          published_at?: string | null
          thumbnail?: string
          title: string
          updated_at?: string
          views?: number
          workspace_id: string
        }
        Update: {
          competitor_id?: string
          created_at?: string
          external_id?: string
          id?: string
          likes?: number
          outlier_index?: number
          published_at?: string | null
          thumbnail?: string
          title?: string
          updated_at?: string
          views?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_contents_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_contents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          avatar: string
          avg_engagement: number
          avg_views: number
          created_at: string
          description: string
          followers: number
          handle: string
          hooks: Json
          id: string
          insights: string[]
          monitored: boolean
          name: string
          outlier_index: number
          platform: string
          posts_7d: number
          recent_topics: string[]
          trend: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          avatar?: string
          avg_engagement?: number
          avg_views?: number
          created_at?: string
          description?: string
          followers?: number
          handle: string
          hooks?: Json
          id?: string
          insights?: string[]
          monitored?: boolean
          name: string
          outlier_index?: number
          platform: string
          posts_7d?: number
          recent_topics?: string[]
          trend?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          avatar?: string
          avg_engagement?: number
          avg_views?: number
          created_at?: string
          description?: string
          followers?: number
          handle?: string
          hooks?: Json
          id?: string
          insights?: string[]
          monitored?: boolean
          name?: string
          outlier_index?: number
          platform?: string
          posts_7d?: number
          recent_topics?: string[]
          trend?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          assignee: string
          created_at: string
          id: string
          idea_id: string | null
          metadata: Json
          platform: string
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          assignee?: string
          created_at?: string
          id?: string
          idea_id?: string | null
          metadata?: Json
          platform: string
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          assignee?: string
          created_at?: string
          id?: string
          idea_id?: string | null
          metadata?: Json
          platform?: string
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_sources: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          source_id: string
          source_kind: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          source_id: string
          source_kind: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          source_id?: string
          source_kind?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_sources_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "idea_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          angle: string
          audience: string
          core: string
          created_at: string
          cta: string
          hook: string
          id: string
          materials: string
          metadata: Json
          outline: string
          platforms: string[]
          priority: string
          score: number
          script: string
          sort_order: number
          status: string
          strategy: string
          tags: string[]
          title: string
          title_variants: string[]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          angle?: string
          audience?: string
          core?: string
          created_at?: string
          cta?: string
          hook?: string
          id?: string
          materials?: string
          metadata?: Json
          outline?: string
          platforms?: string[]
          priority?: string
          score?: number
          script?: string
          sort_order?: number
          status?: string
          strategy?: string
          tags?: string[]
          title: string
          title_variants?: string[]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          angle?: string
          audience?: string
          core?: string
          created_at?: string
          cta?: string
          hook?: string
          id?: string
          materials?: string
          metadata?: Json
          outline?: string
          platforms?: string[]
          priority?: string
          score?: number
          script?: string
          sort_order?: number
          status?: string
          strategy?: string
          tags?: string[]
          title?: string
          title_variants?: string[]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      inbox_items: {
        Row: {
          ai_score: number | null
          analysis: Json | null
          author: string
          capture_method: string
          captured_at: string
          created_at: string
          id: string
          metrics: Json
          mode: string
          note: string
          original_content: string
          platform: string
          source_type: string
          status: string
          summary: string
          tags: string[]
          thumbnail: string
          title: string
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          ai_score?: number | null
          analysis?: Json | null
          author?: string
          capture_method: string
          captured_at?: string
          created_at?: string
          id?: string
          metrics?: Json
          mode?: string
          note?: string
          original_content?: string
          platform: string
          source_type?: string
          status?: string
          summary?: string
          tags?: string[]
          thumbnail?: string
          title: string
          updated_at?: string
          url?: string
          workspace_id: string
        }
        Update: {
          ai_score?: number | null
          analysis?: Json | null
          author?: string
          capture_method?: string
          captured_at?: string
          created_at?: string
          id?: string
          metrics?: Json
          mode?: string
          note?: string
          original_content?: string
          platform?: string
          source_type?: string
          status?: string
          summary?: string
          tags?: string[]
          thumbnail?: string
          title?: string
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbox_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_items: {
        Row: {
          ai_score: number | null
          analysis: Json | null
          author: string
          capture_method: string
          captured_at: string
          created_at: string
          id: string
          metrics: Json
          note: string
          original_content: string
          platform: string
          source_type: string
          status: string
          summary: string
          tags: string[]
          thumbnail: string
          title: string
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          ai_score?: number | null
          analysis?: Json | null
          author?: string
          capture_method: string
          captured_at?: string
          created_at?: string
          id?: string
          metrics?: Json
          note?: string
          original_content?: string
          platform: string
          source_type?: string
          status?: string
          summary?: string
          tags?: string[]
          thumbnail?: string
          title: string
          updated_at?: string
          url?: string
          workspace_id: string
        }
        Update: {
          ai_score?: number | null
          analysis?: Json | null
          author?: string
          capture_method?: string
          captured_at?: string
          created_at?: string
          id?: string
          metrics?: Json
          note?: string
          original_content?: string
          platform?: string
          source_type?: string
          status?: string
          summary?: string
          tags?: string[]
          thumbnail?: string
          title?: string
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          captured_at: string
          competitor_content_id: string | null
          content_item_id: string | null
          created_at: string
          id: string
          metrics: Json
          workspace_id: string
        }
        Insert: {
          captured_at?: string
          competitor_content_id?: string | null
          content_item_id?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          workspace_id: string
        }
        Update: {
          captured_at?: string
          competitor_content_id?: string | null
          content_item_id?: string | null
          created_at?: string
          id?: string
          metrics?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_competitor_content_id_fkey"
            columns: ["competitor_content_id"]
            isOneToOne: false
            referencedRelation: "competitor_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_snapshots_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_snapshots_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          owner_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      convert_source_to_idea: {
        Args: { p_source_id: string; p_source_kind: string }
        Returns: {
          created: boolean
          idea_id: string
        }[]
      }
      is_workspace_competitor: {
        Args: { target_competitor_id: string; target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_competitor_content: {
        Args: { target_content_id: string; target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_content: {
        Args: { target_content_id: string; target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_idea: {
        Args: { target_idea_id: string; target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      is_workspace_source: {
        Args: {
          target_kind: string
          target_source_id: string
          target_workspace_id: string
        }
        Returns: boolean
      }
      move_idea: {
        Args: { p_before_id?: string; p_idea_id: string; p_status: string }
        Returns: {
          idea_id: string
          sort_order: number
          status: string
        }[]
      }
      schedule_content: {
        Args: {
          p_assignee: string
          p_idea_id?: string
          p_platform: string
          p_scheduled_at: string
          p_title: string
        }
        Returns: {
          content_id: string
        }[]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
