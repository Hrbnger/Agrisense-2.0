export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          email: string | null
          avatar_url: string | null
          location: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          email?: string | null
          avatar_url?: string | null
          location?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plants: {
        Row: {
          id: string
          user_id: string
          plant_name: string
          image_url: string | null
          confidence: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          plant_name: string
          image_url?: string | null
          confidence: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          plant_name?: string
          image_url?: string | null
          confidence?: number
          created_at?: string
        }
      }
      diseases: {
        Row: {
          id: string
          user_id: string
          disease_name: string
          plant_name: string
          image_url: string | null
          confidence: number
          treatment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          disease_name: string
          plant_name: string
          image_url?: string | null
          confidence: number
          treatment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          disease_name?: string
          plant_name?: string
          image_url?: string | null
          confidence?: number
          treatment?: string | null
          created_at?: string
        }
      }
      forum_posts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

