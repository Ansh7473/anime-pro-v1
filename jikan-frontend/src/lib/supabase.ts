import { createClient } from '@supabase/supabase-js';

// Replace these with your Supabase project URL and anon key
// Get these from: https://supabase.com/dashboard/project/_/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    email: string;
                    username: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id: string;
                    email: string;
                    username?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    email?: string;
                    username?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
            };
            favorites: {
                Row: {
                    id: string;
                    user_id: string;
                    anime_id: string;
                    anime_title: string;
                    anime_poster: string;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    anime_id: string;
                    anime_title: string;
                    anime_poster: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    anime_id?: string;
                    anime_title?: string;
                    anime_poster?: string;
                    created_at?: string;
                };
            };
            watch_history: {
                Row: {
                    id: string;
                    user_id: string;
                    anime_id: string;
                    anime_title: string;
                    anime_poster: string;
                    episode_number: number;
                    episode_id: string;
                    progress: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    anime_id: string;
                    anime_title: string;
                    anime_poster: string;
                    episode_number: number;
                    episode_id: string;
                    progress?: number;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    anime_id?: string;
                    anime_title?: string;
                    anime_poster?: string;
                    episode_number?: number;
                    episode_id?: string;
                    progress?: number;
                    created_at?: string;
                    updated_at?: string;
                };
            };
        };
    };
}
