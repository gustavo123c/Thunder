/**
 * Database types for the Supabase client.
 *
 * Hand-written to match supabase/migrations until the local stack is available.
 * `npm run db:types` regenerates this file with the same shape — prefer that
 * once Docker/Supabase is running. PostGIS geography columns are `unknown`.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamp = string;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
          level: Database['public']['Enums']['runner_level'] | null;
          weight_kg: number | null;
          height_cm: number | null;
          birth_date: string | null;
          main_goal: Database['public']['Enums']['runner_goal'] | null;
          goal_target_pace_s_per_km: number | null;
          onboarded_at: Timestamp | null;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: { [_ in never]: never }; // created by the on_auth_user_created trigger
        Update: {
          username?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          level?: Database['public']['Enums']['runner_level'] | null;
          weight_kg?: number | null;
          height_cm?: number | null;
          birth_date?: string | null;
          main_goal?: Database['public']['Enums']['runner_goal'] | null;
          goal_target_pace_s_per_km?: number | null;
          onboarded_at?: Timestamp | null;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          id: string;
          client_id: string;
          user_id: string;
          title: string;
          description: string | null;
          started_at: Timestamp;
          ended_at: Timestamp;
          elapsed_time_s: number;
          moving_time_s: number;
          distance_m: number;
          avg_pace_s_per_km: number | null;
          best_pace_s_per_km: number | null;
          elevation_gain_m: number | null;
          calories_kcal: number | null;
          route: unknown;
          start_point: unknown;
          visibility: Database['public']['Enums']['run_visibility'];
          kudos_count: number;
          comments_count: number;
          created_at: Timestamp;
          updated_at: Timestamp;
        };
        Insert: {
          id?: string;
          client_id: string;
          user_id: string;
          title?: string;
          description?: string | null;
          started_at: Timestamp;
          ended_at: Timestamp;
          elapsed_time_s: number;
          moving_time_s: number;
          distance_m: number;
          avg_pace_s_per_km?: number | null;
          best_pace_s_per_km?: number | null;
          elevation_gain_m?: number | null;
          calories_kcal?: number | null;
          route?: unknown;
          start_point?: unknown;
          visibility?: Database['public']['Enums']['run_visibility'];
        };
        Update: {
          title?: string;
          description?: string | null;
          visibility?: Database['public']['Enums']['run_visibility'];
        };
        Relationships: [
          {
            foreignKeyName: 'runs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      run_points: {
        Row: {
          id: number;
          run_id: string;
          seq: number;
          segment: number;
          recorded_at: Timestamp;
          location: unknown;
          altitude_m: number | null;
          accuracy_m: number | null;
          speed_mps: number | null;
        };
        Insert: {
          run_id: string;
          seq: number;
          segment?: number;
          recorded_at: Timestamp;
          location: unknown;
          altitude_m?: number | null;
          accuracy_m?: number | null;
          speed_mps?: number | null;
        };
        Update: { [_ in never]: never };
        Relationships: [
          {
            foreignKeyName: 'run_points_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'runs';
            referencedColumns: ['id'];
          },
        ];
      };
      run_splits: {
        Row: {
          run_id: string;
          split_index: number;
          distance_m: number;
          duration_s: number;
          pace_s_per_km: number;
          elevation_delta_m: number | null;
        };
        Insert: {
          run_id: string;
          split_index: number;
          distance_m: number;
          duration_s: number;
          pace_s_per_km: number;
          elevation_delta_m?: number | null;
        };
        Update: { [_ in never]: never };
        Relationships: [
          {
            foreignKeyName: 'run_splits_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'runs';
            referencedColumns: ['id'];
          },
        ];
      };
      follows: {
        Row: { follower_id: string; following_id: string; created_at: Timestamp };
        Insert: { follower_id: string; following_id: string };
        Update: { [_ in never]: never };
        Relationships: [
          {
            foreignKeyName: 'follows_follower_id_fkey';
            columns: ['follower_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'follows_following_id_fkey';
            columns: ['following_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      kudos: {
        Row: { run_id: string; user_id: string; created_at: Timestamp };
        Insert: { run_id: string; user_id: string };
        Update: { [_ in never]: never };
        Relationships: [
          {
            foreignKeyName: 'kudos_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'kudos_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      comments: {
        Row: {
          id: string;
          run_id: string;
          user_id: string;
          body: string;
          created_at: Timestamp;
          updated_at: Timestamp;
          deleted_at: Timestamp | null;
        };
        Insert: { id?: string; run_id: string; user_id: string; body: string };
        Update: { body?: string; deleted_at?: Timestamp | null };
        Relationships: [
          {
            foreignKeyName: 'comments_run_id_fkey';
            columns: ['run_id'];
            isOneToOne: false;
            referencedRelation: 'runs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      can_view_run: { Args: { target_run_id: string }; Returns: boolean };
      owns_run: { Args: { target_run_id: string }; Returns: boolean };
    };
    Enums: {
      runner_level: 'beginner' | 'intermediate';
      runner_goal:
        | 'complete_5k'
        | 'complete_10k'
        | 'improve_pace'
        | 'increase_endurance'
        | 'lose_weight';
      run_visibility: 'public' | 'followers' | 'private';
    };
    CompositeTypes: { [_ in never]: never };
  };
};
