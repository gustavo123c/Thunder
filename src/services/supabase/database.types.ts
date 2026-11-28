/**
 * Database types for the Supabase client.
 *
 * Hand-written to match supabase/migrations until the local stack is available.
 * `npm run db:types` regenerates this file with the same shape — prefer that
 * once Docker/Supabase is running. PostGIS geography columns are `unknown`.
 */

export type WorkoutFeedback = 'helped' | 'neutral' | 'discomfort';

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
          sex: 'male' | 'female' | null;
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
          sex?: 'male' | 'female' | null;
        };
        Relationships: [];
      };
      run_media: {
        Row: {
          id: string;
          run_id: string;
          user_id: string;
          storage_path: string;
          media_type: 'image' | 'video';
          mime_type: string;
          size_bytes: number;
          width: number | null;
          height: number | null;
          duration_s: number | null;
          created_at: Timestamp;
        };
        Insert: {
          id?: string;
          run_id: string;
          user_id: string;
          storage_path: string;
          media_type: 'image' | 'video';
          mime_type: string;
          size_bytes: number;
          width?: number | null;
          height?: number | null;
          duration_s?: number | null;
        };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      pain_logs: {
        Row: {
          id: string;
          user_id: string;
          region: string;
          side: 'left' | 'right' | 'center';
          intensity: number;
          notes: string | null;
          created_at: Timestamp;
          resolved_at: Timestamp | null;
        };
        Insert: {
          user_id: string;
          region: string;
          side?: 'left' | 'right' | 'center';
          intensity: number;
          notes?: string | null;
        };
        Update: { intensity?: number; notes?: string | null; resolved_at?: Timestamp | null };
        Relationships: [];
      };
      generated_workouts: {
        Row: {
          id: string;
          user_id: string;
          generator: 'rules' | 'ai';
          request: Json;
          plan: Json;
          created_at: Timestamp;
          feedback: WorkoutFeedback | null;
          feedback_at: Timestamp | null;
          run_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          generator: 'rules' | 'ai';
          request: Json;
          plan: Json;
        };
        Update: { feedback?: WorkoutFeedback; feedback_at?: Timestamp; run_id?: string | null };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          owner_id: string;
          created_at: Timestamp;
        };
        Insert: { name: string; owner_id: string };
        Update: { name?: string };
        Relationships: [];
      };
      group_members: {
        Row: { group_id: string; user_id: string; role: 'owner' | 'member'; joined_at: Timestamp };
        Insert: { group_id: string; user_id: string; role?: 'owner' | 'member' };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: Timestamp;
          run_id: string | null;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked_at?: Timestamp;
          run_id?: string | null;
        };
        Update: { [_ in never]: never };
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
      run_feedback: {
        Row: {
          id: string;
          run_id: string;
          user_id: string;
          issues: string[];
          pain_regions: Json | null;
          other_text: string | null;
          next_preference: 'lighter' | 'same' | null;
          safety_alert: boolean;
          generated_workout_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          run_id: string;
          user_id: string;
          issues?: string[];
          pain_regions?: Json | null;
          other_text?: string | null;
          next_preference?: 'lighter' | 'same' | null;
          safety_alert?: boolean;
          generated_workout_id?: string | null;
        };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      health_anamnese: {
        Row: {
          id: string;
          user_id: string;
          running_experience: 'none' | 'beginner' | 'intermediate' | 'advanced' | null;
          weekly_frequency: number | null;
          current_injuries: string[] | null;
          past_injuries: string[] | null;
          surgeries: string | null;
          health_conditions: string[] | null;
          medications: string | null;
          par_q: Json;
          par_q_risk: boolean;
          consented_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          running_experience?: 'none' | 'beginner' | 'intermediate' | 'advanced' | null;
          weekly_frequency?: number | null;
          current_injuries?: string[] | null;
          past_injuries?: string[] | null;
          surgeries?: string | null;
          health_conditions?: string[] | null;
          medications?: string | null;
          par_q?: Json;
          par_q_risk?: boolean;
          consented_at?: string | null;
        };
        Update: {
          running_experience?: 'none' | 'beginner' | 'intermediate' | 'advanced' | null;
          weekly_frequency?: number | null;
          current_injuries?: string[] | null;
          past_injuries?: string[] | null;
          surgeries?: string | null;
          health_conditions?: string[] | null;
          medications?: string | null;
          par_q?: Json;
          par_q_risk?: boolean;
          consented_at?: string | null;
        };
        Relationships: [];
      };
      terms_acceptances: {
        Row: {
          id: string;
          user_id: string;
          terms_version: string;
          health_data_consent: boolean;
          age_statement: boolean;
          accepted_at: string;
        };
        Insert: {
          user_id: string;
          terms_version: string;
          health_data_consent: boolean;
          age_statement: boolean;
        };
        Update: { [_ in never]: never };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      can_view_run: { Args: { target_run_id: string }; Returns: boolean };
      can_view_run_row: {
        Args: { owner_id: string; run_visibility: Database['public']['Enums']['run_visibility'] };
        Returns: boolean;
      };
      finish_run: { Args: { payload: Json }; Returns: string };
      list_user_runs: {
        Args: { p_user_id: string; p_before?: string; p_before_id?: string; p_limit?: number };
        Returns: Json;
      };
      get_run_detail: { Args: { p_run_id: string; p_history_limit?: number }; Returns: Json };
      get_feed: { Args: { p_before?: string; p_before_id?: string; p_limit?: number }; Returns: Json };
      list_comments: { Args: { p_run_id: string; p_limit?: number }; Returns: Json };
      search_profiles: { Args: { p_query: string; p_limit?: number }; Returns: Json };
      get_profile_stats: { Args: { p_user_id: string }; Returns: Json };
      list_activity: { Args: { p_user_id: string; p_since: string }; Returns: Json };
      owns_run: { Args: { target_run_id: string }; Returns: boolean };
      create_group: { Args: { p_name: string }; Returns: string };
      join_group: { Args: { p_code: string }; Returns: string };
      list_my_groups: { Args: Record<string, never>; Returns: Json };
      group_leaderboard: { Args: { p_group_id: string; p_since: string }; Returns: Json };
      get_group_feed: {
        Args: { p_group_id: string; p_before?: string; p_before_id?: string; p_limit?: number };
        Returns: Json;
      };
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
