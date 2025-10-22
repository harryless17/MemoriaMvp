/**
 * Database type definitions
 * Generated from Supabase schema
 */

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          owner_id: string | null;
          title: string;
          description: string | null;
          date: string | null;
          location: string | null;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string | null;
          title: string;
          description?: string | null;
          date?: string | null;
          location?: string | null;
          visibility: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string | null;
          title?: string;
          description?: string | null;
          date?: string | null;
          location?: string | null;
          visibility?: string;
          created_at?: string;
        };
      };
      event_attendees: {
        Row: {
          event_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          event_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          event_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
      };
      media: {
        Row: {
          id: string;
          event_id: string;
          user_id: string | null;
          type: string;
          storage_path: string;
          thumb_path: string | null;
          visibility: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          user_id?: string | null;
          type: string;
          storage_path: string;
          thumb_path?: string | null;
          visibility: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          user_id?: string | null;
          type?: string;
          storage_path?: string;
          thumb_path?: string | null;
          visibility?: string;
          created_at?: string;
        };
      };
      likes: {
        Row: {
          media_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          media_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          media_id?: string;
          user_id?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          media_id: string;
          user_id: string | null;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          media_id: string;
          user_id?: string | null;
          text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          media_id?: string;
          user_id?: string | null;
          text?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {
      is_event_member: {
        Args: { e_id: string };
        Returns: boolean;
      };
    };
    Enums: {};
  };
}

