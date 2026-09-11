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
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          club_id: string | null
          created_at: string
          diff: Json | null
          id: number
          record_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          club_id?: string | null
          created_at?: string
          diff?: Json | null
          id?: number
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          club_id?: string | null
          created_at?: string
          diff?: Json | null
          id?: number
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string | null
          crest_url: string | null
          id: string
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          crest_url?: string | null
          id?: string
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          crest_url?: string | null
          id?: string
          name?: string
          short_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      competitions: {
        Row: {
          clock_mode: Database["public"]["Enums"]["clock_mode"]
          club_id: string
          created_at: string
          created_by: string | null
          enabled_event_types: Database["public"]["Enums"]["event_type"][]
          halftime_minutes: number
          id: string
          kind: Database["public"]["Enums"]["competition_kind"]
          name: string
          period_minutes: number
          periods_count: number
          players_on_pitch: number
          red_card_default_bans: number
          season_id: string
          squad_max: number
          substitution_type: Database["public"]["Enums"]["substitution_type"]
          substitutions_max: number
          updated_at: string
          yellow_cards_for_ban: number
        }
        Insert: {
          clock_mode?: Database["public"]["Enums"]["clock_mode"]
          club_id: string
          created_at?: string
          created_by?: string | null
          enabled_event_types?: Database["public"]["Enums"]["event_type"][]
          halftime_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["competition_kind"]
          name: string
          period_minutes?: number
          periods_count?: number
          players_on_pitch?: number
          red_card_default_bans?: number
          season_id: string
          squad_max?: number
          substitution_type?: Database["public"]["Enums"]["substitution_type"]
          substitutions_max?: number
          updated_at?: string
          yellow_cards_for_ban?: number
        }
        Update: {
          clock_mode?: Database["public"]["Enums"]["clock_mode"]
          club_id?: string
          created_at?: string
          created_by?: string | null
          enabled_event_types?: Database["public"]["Enums"]["event_type"][]
          halftime_minutes?: number
          id?: string
          kind?: Database["public"]["Enums"]["competition_kind"]
          name?: string
          period_minutes?: number
          periods_count?: number
          players_on_pitch?: number
          red_card_default_bans?: number
          season_id?: string
          squad_max?: number
          substitution_type?: Database["public"]["Enums"]["substitution_type"]
          substitutions_max?: number
          updated_at?: string
          yellow_cards_for_ban?: number
        }
        Relationships: [
          {
            foreignKeyName: "competitions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      coverage_declarations: {
        Row: {
          covered_event_types: Database["public"]["Enums"]["event_type"][]
          created_at: string
          end_period: number | null
          end_seconds: number | null
          id: string
          is_retroactive: boolean
          match_id: string
          scope: Database["public"]["Enums"]["coverage_scope"]
          start_period: number
          start_seconds: number
          target_player_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          covered_event_types: Database["public"]["Enums"]["event_type"][]
          created_at?: string
          end_period?: number | null
          end_seconds?: number | null
          id?: string
          is_retroactive?: boolean
          match_id: string
          scope?: Database["public"]["Enums"]["coverage_scope"]
          start_period?: number
          start_seconds?: number
          target_player_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          covered_event_types?: Database["public"]["Enums"]["event_type"][]
          created_at?: string
          end_period?: number | null
          end_seconds?: number | null
          id?: string
          is_retroactive?: boolean
          match_id?: string
          scope?: Database["public"]["Enums"]["coverage_scope"]
          start_period?: number
          start_seconds?: number
          target_player_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coverage_declarations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_declarations_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "coverage_declarations_target_player_id_fkey"
            columns: ["target_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coverage_declarations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          app_version: string | null
          club_id: string | null
          created_at: string
          device: Json | null
          id: string
          message: string
          route: string | null
          stack: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          club_id?: string | null
          created_at?: string
          device?: Json | null
          id?: string
          message: string
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          club_id?: string | null
          created_at?: string
          device?: Json | null
          id?: string
          message?: string
          route?: string | null
          stack?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          as_follower: boolean
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          permissions: Database["public"]["Enums"]["app_permission"][]
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
        }
        Insert: {
          as_follower?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          permissions?: Database["public"]["Enums"]["app_permission"][]
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id: string
          token: string
        }
        Update: {
          as_follower?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          permissions?: Database["public"]["Enums"]["app_permission"][]
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          team_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_events: {
        Row: {
          client_event_id: string
          created_at: string
          created_by: string
          details: Json
          duplicate_group_id: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_opponent: boolean
          match_id: string
          period: number
          player_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          secondary_player_id: string | null
          seconds: number
          status: Database["public"]["Enums"]["event_status"]
          updated_at: string
        }
        Insert: {
          client_event_id: string
          created_at?: string
          created_by: string
          details?: Json
          duplicate_group_id?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          is_opponent?: boolean
          match_id: string
          period: number
          player_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_player_id?: string | null
          seconds: number
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Update: {
          client_event_id?: string
          created_at?: string
          created_by?: string
          details?: Json
          duplicate_group_id?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_opponent?: boolean
          match_id?: string
          period?: number
          player_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          secondary_player_id?: string | null
          seconds?: number
          status?: Database["public"]["Enums"]["event_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_events_player_called"
            columns: ["match_id", "player_id"]
            isOneToOne: false
            referencedRelation: "match_squad"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_events_player_called"
            columns: ["match_id", "player_id"]
            isOneToOne: false
            referencedRelation: "v_player_match_stats"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_events_secondary_called"
            columns: ["match_id", "secondary_player_id"]
            isOneToOne: false
            referencedRelation: "match_squad"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_events_secondary_called"
            columns: ["match_id", "secondary_player_id"]
            isOneToOne: false
            referencedRelation: "v_player_match_stats"
            referencedColumns: ["match_id", "player_id"]
          },
          {
            foreignKeyName: "match_events_secondary_player_id_fkey"
            columns: ["secondary_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_periods: {
        Row: {
          actual_seconds: number | null
          created_at: string
          ended_at: string | null
          id: string
          match_id: string
          period_number: number
          planned_seconds: number
          started_at: string | null
          updated_at: string
        }
        Insert: {
          actual_seconds?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          match_id: string
          period_number: number
          planned_seconds: number
          started_at?: string | null
          updated_at?: string
        }
        Update: {
          actual_seconds?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          match_id?: string
          period_number?: number
          planned_seconds?: number
          started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_periods_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_periods_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
        ]
      }
      match_squad: {
        Row: {
          call_status: Database["public"]["Enums"]["call_status"]
          created_at: string
          created_by: string | null
          id: string
          match_id: string
          player_id: string
          position: Database["public"]["Enums"]["position_code"] | null
          shirt_number: number | null
          updated_at: string
        }
        Insert: {
          call_status?: Database["public"]["Enums"]["call_status"]
          created_at?: string
          created_by?: string | null
          id?: string
          match_id: string
          player_id: string
          position?: Database["public"]["Enums"]["position_code"] | null
          shirt_number?: number | null
          updated_at?: string
        }
        Update: {
          call_status?: Database["public"]["Enums"]["call_status"]
          created_at?: string
          created_by?: string | null
          id?: string
          match_id?: string
          player_id?: string
          position?: Database["public"]["Enums"]["position_code"] | null
          shirt_number?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_squad_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_squad_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_squad_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_squad_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          club_id: string
          competition_id: string
          confirmed_goals_against: number | null
          confirmed_goals_for: number | null
          created_at: string
          created_by: string | null
          id: string
          is_home: boolean
          is_retroactive: boolean
          kickoff_at: string
          notes: string | null
          opponent_team_id: string
          season_id: string
          status: Database["public"]["Enums"]["match_status"]
          suspended_period: number | null
          suspended_seconds: number | null
          team_id: string
          updated_at: string
          venue: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          club_id: string
          competition_id: string
          confirmed_goals_against?: number | null
          confirmed_goals_for?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_home?: boolean
          is_retroactive?: boolean
          kickoff_at: string
          notes?: string | null
          opponent_team_id: string
          season_id: string
          status?: Database["public"]["Enums"]["match_status"]
          suspended_period?: number | null
          suspended_seconds?: number | null
          team_id: string
          updated_at?: string
          venue?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          club_id?: string
          competition_id?: string
          confirmed_goals_against?: number | null
          confirmed_goals_for?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_home?: boolean
          is_retroactive?: boolean
          kickoff_at?: string
          notes?: string | null
          opponent_team_id?: string
          season_id?: string
          status?: Database["public"]["Enums"]["match_status"]
          suspended_period?: number | null
          suspended_seconds?: number | null
          team_id?: string
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_opponent_team_id_fkey"
            columns: ["opponent_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_stints: {
        Row: {
          created_at: string
          end_reason: Database["public"]["Enums"]["stint_boundary"]
          end_seconds: number
          id: string
          match_id: string
          period: number
          player_id: string
          start_reason: Database["public"]["Enums"]["stint_boundary"]
          start_seconds: number
        }
        Insert: {
          created_at?: string
          end_reason: Database["public"]["Enums"]["stint_boundary"]
          end_seconds: number
          id?: string
          match_id: string
          period: number
          player_id: string
          start_reason: Database["public"]["Enums"]["stint_boundary"]
          start_seconds: number
        }
        Update: {
          created_at?: string
          end_reason?: Database["public"]["Enums"]["stint_boundary"]
          end_seconds?: number
          id?: string
          match_id?: string
          period?: number
          player_id?: string
          start_reason?: Database["public"]["Enums"]["stint_boundary"]
          start_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_match_stints_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stints_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "player_match_stints_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          full_name: string | null
          id: string
          is_active: boolean
          name_consent_at: string | null
          name_consent_note: string | null
          nickname: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          name_consent_at?: string | null
          name_consent_note?: string | null
          nickname: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          name_consent_at?: string | null
          name_consent_note?: string | null
          nickname?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_platform_admin: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_platform_admin?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      sanctions: {
        Row: {
          club_id: string
          competition_id: string | null
          created_at: string
          created_by: string | null
          ends_on: string | null
          id: string
          matches_served: number
          matches_total: number | null
          notes: string | null
          origin_event_id: string | null
          player_id: string
          season_id: string
          starts_after_match_id: string | null
          starts_on: string | null
          status: Database["public"]["Enums"]["sanction_status"]
          type: Database["public"]["Enums"]["sanction_type"]
          updated_at: string
        }
        Insert: {
          club_id: string
          competition_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          matches_served?: number
          matches_total?: number | null
          notes?: string | null
          origin_event_id?: string | null
          player_id: string
          season_id: string
          starts_after_match_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["sanction_status"]
          type: Database["public"]["Enums"]["sanction_type"]
          updated_at?: string
        }
        Update: {
          club_id?: string
          competition_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_on?: string | null
          id?: string
          matches_served?: number
          matches_total?: number | null
          notes?: string | null
          origin_event_id?: string | null
          player_id?: string
          season_id?: string
          starts_after_match_id?: string | null
          starts_on?: string | null
          status?: Database["public"]["Enums"]["sanction_status"]
          type?: Database["public"]["Enums"]["sanction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sanctions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_origin_event_id_fkey"
            columns: ["origin_event_id"]
            isOneToOne: false
            referencedRelation: "match_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_starts_after_match_id_fkey"
            columns: ["starts_after_match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sanctions_starts_after_match_id_fkey"
            columns: ["starts_after_match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
        ]
      }
      seasons: {
        Row: {
          club_id: string
          created_at: string
          created_by: string | null
          ends_on: string
          id: string
          is_current: boolean
          name: string
          starts_on: string
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          created_by?: string | null
          ends_on: string
          id?: string
          is_current?: boolean
          name: string
          starts_on: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          created_by?: string | null
          ends_on?: string
          id?: string
          is_current?: boolean
          name?: string
          starts_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seasons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_memberships: {
        Row: {
          availability: Database["public"]["Enums"]["availability_status"]
          created_at: string
          created_by: string | null
          default_position: Database["public"]["Enums"]["position_code"] | null
          id: string
          joined_on: string
          left_on: string | null
          player_id: string
          season_id: string
          shirt_number: number | null
          team_id: string
          updated_at: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability_status"]
          created_at?: string
          created_by?: string | null
          default_position?: Database["public"]["Enums"]["position_code"] | null
          id?: string
          joined_on?: string
          left_on?: string | null
          player_id: string
          season_id: string
          shirt_number?: number | null
          team_id: string
          updated_at?: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability_status"]
          created_at?: string
          created_by?: string | null
          default_position?: Database["public"]["Enums"]["position_code"] | null
          id?: string
          joined_on?: string
          left_on?: string | null
          player_id?: string
          season_id?: string
          shirt_number?: number | null
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_memberships_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_memberships_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_memberships_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_followers: {
        Row: {
          created_at: string
          granted_by: string | null
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_followers_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_followers_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_member_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission: Database["public"]["Enums"]["app_permission"]
          team_member_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission: Database["public"]["Enums"]["app_permission"]
          team_member_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission?: Database["public"]["Enums"]["app_permission"]
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_member_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_member_permissions_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          invited_by: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category: string | null
          club_id: string
          created_at: string
          created_by: string | null
          crest_url: string | null
          id: string
          kind: Database["public"]["Enums"]["team_kind"]
          name: string
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          club_id: string
          created_at?: string
          created_by?: string | null
          crest_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["team_kind"]
          name: string
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          club_id?: string
          created_at?: string
          created_by?: string | null
          crest_url?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["team_kind"]
          name?: string
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_attendance: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          player_id: string
          session_id: string
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          player_id: string
          session_id: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          player_id?: string
          session_id?: string
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_attendance_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          focus: string | null
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          season_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          focus?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          season_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          focus?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          season_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_match_scores: {
        Row: {
          competition_id: string | null
          confirmed_goals_against: number | null
          confirmed_goals_for: number | null
          goals_against: number | null
          goals_for: number | null
          match_id: string | null
          season_id: string | null
          status: Database["public"]["Enums"]["match_status"] | null
          team_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_player_match_minutes: {
        Row: {
          match_id: string | null
          minutes_played: number | null
          player_id: string | null
          season_id: string | null
          seconds_played: number | null
          team_id: string | null
          was_starter: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stints_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_stints_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "player_match_stints_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      v_player_match_stats: {
        Row: {
          assists: number | null
          call_status: Database["public"]["Enums"]["call_status"] | null
          competition_id: string | null
          fouls_committed: number | null
          fouls_received: number | null
          goals: number | null
          match_id: string | null
          minutes_played: number | null
          own_goals: number | null
          player_id: string | null
          red_cards: number | null
          season_id: string | null
          team_id: string | null
          yellow_cards: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_squad_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_squad_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "v_match_scores"
            referencedColumns: ["match_id"]
          },
          {
            foreignKeyName: "match_squad_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_player_season_stats: {
        Row: {
          assists: number | null
          fouls_committed: number | null
          fouls_received: number | null
          goals: number | null
          matches_called: number | null
          matches_played: number | null
          matches_started: number | null
          minutes_played: number | null
          own_goals: number | null
          player_id: string | null
          red_cards: number | null
          season_id: string | null
          team_id: string | null
          yellow_cards: number | null
        }
        Relationships: [
          {
            foreignKeyName: "match_squad_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_team_season_stats: {
        Row: {
          competition_id: string | null
          draws: number | null
          goals_against: number | null
          goals_for: number | null
          losses: number | null
          matches: number | null
          season_id: string | null
          team_id: string | null
          wins: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_competition_id_fkey"
            columns: ["competition_id"]
            isOneToOne: false
            referencedRelation: "competitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      can_read_club: { Args: { p_club_id: string }; Returns: boolean }
      can_read_team: { Args: { p_team_id: string }; Returns: boolean }
      flag_duplicate_candidates: {
        Args: { p_match_id: string }
        Returns: number
      }
      has_club_permission: {
        Args: {
          p_club_id: string
          p_permission: Database["public"]["Enums"]["app_permission"]
        }
        Returns: boolean
      }
      has_team_permission: {
        Args: {
          p_permission: Database["public"]["Enums"]["app_permission"]
          p_team_id: string
        }
        Returns: boolean
      }
      is_club_member: { Args: { p_club_id: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_team_follower: { Args: { p_team_id: string }; Returns: boolean }
      is_team_member: { Args: { p_team_id: string }; Returns: boolean }
      metric_reliability: {
        Args: {
          p_event_type: Database["public"]["Enums"]["event_type"]
          p_match_id: string
          p_player_id?: string
        }
        Returns: number
      }
      player_metric_reliability: {
        Args: {
          p_event_type: Database["public"]["Enums"]["event_type"]
          p_match_id: string
          p_player_id: string
        }
        Returns: number
      }
      rebuild_match_stints: { Args: { p_match_id: string }; Returns: number }
      team_of_match: { Args: { p_match_id: string }; Returns: string }
    }
    Enums: {
      app_permission:
        | "team.manage"
        | "roster.manage"
        | "competition.manage"
        | "schedule.manage"
        | "lineup.manage"
        | "match.live.write"
        | "match.close"
        | "discipline.manage"
        | "training.manage"
        | "stats.view"
        | "members.manage"
      attendance_status: "present" | "absent" | "late"
      availability_status: "available" | "unavailable" | "sanctioned"
      call_status: "starter" | "substitute" | "not_called"
      clock_mode: "running" | "stopped"
      competition_kind: "league" | "cup" | "friendly"
      coverage_scope: "full_team" | "single_player" | "goals_cards" | "custom"
      event_status: "pending" | "approved" | "rejected"
      event_type:
        | "goal"
        | "own_goal"
        | "yellow_card"
        | "second_yellow"
        | "red_card"
        | "foul_committed"
        | "foul_received"
        | "corner"
        | "substitution"
        | "position_change"
        | "note"
        | "pass"
        | "key_pass"
        | "shot_on_target"
        | "shot_off_target"
        | "offside"
        | "recovery"
        | "turnover"
        | "player_rating"
      invitation_status: "pending" | "accepted" | "revoked" | "expired"
      match_status:
        | "scheduled"
        | "called"
        | "live"
        | "suspended"
        | "finished"
        | "closed"
      position_code: "GK" | "DF" | "MF" | "FW"
      sanction_status: "proposed" | "active" | "served" | "cancelled"
      sanction_type: "yellow_accumulation" | "red_card" | "club_decision"
      stint_boundary:
        | "period_start"
        | "period_end"
        | "substitution"
        | "sent_off"
        | "match_end"
        | "suspended"
      substitution_reason: "tactical" | "fatigue" | "other"
      substitution_type: "fixed" | "rolling"
      team_kind: "managed" | "reference"
      team_role: "coach" | "delegate" | "scout" | "spectator"
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
      app_permission: [
        "team.manage",
        "roster.manage",
        "competition.manage",
        "schedule.manage",
        "lineup.manage",
        "match.live.write",
        "match.close",
        "discipline.manage",
        "training.manage",
        "stats.view",
        "members.manage",
      ],
      attendance_status: ["present", "absent", "late"],
      availability_status: ["available", "unavailable", "sanctioned"],
      call_status: ["starter", "substitute", "not_called"],
      clock_mode: ["running", "stopped"],
      competition_kind: ["league", "cup", "friendly"],
      coverage_scope: ["full_team", "single_player", "goals_cards", "custom"],
      event_status: ["pending", "approved", "rejected"],
      event_type: [
        "goal",
        "own_goal",
        "yellow_card",
        "second_yellow",
        "red_card",
        "foul_committed",
        "foul_received",
        "corner",
        "substitution",
        "position_change",
        "note",
        "pass",
        "key_pass",
        "shot_on_target",
        "shot_off_target",
        "offside",
        "recovery",
        "turnover",
        "player_rating",
      ],
      invitation_status: ["pending", "accepted", "revoked", "expired"],
      match_status: [
        "scheduled",
        "called",
        "live",
        "suspended",
        "finished",
        "closed",
      ],
      position_code: ["GK", "DF", "MF", "FW"],
      sanction_status: ["proposed", "active", "served", "cancelled"],
      sanction_type: ["yellow_accumulation", "red_card", "club_decision"],
      stint_boundary: [
        "period_start",
        "period_end",
        "substitution",
        "sent_off",
        "match_end",
        "suspended",
      ],
      substitution_reason: ["tactical", "fatigue", "other"],
      substitution_type: ["fixed", "rolling"],
      team_kind: ["managed", "reference"],
      team_role: ["coach", "delegate", "scout", "spectator"],
    },
  },
} as const
