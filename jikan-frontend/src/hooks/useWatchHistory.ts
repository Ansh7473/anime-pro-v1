import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface WatchHistoryItem {
    id: string;
    user_id: string;
    anime_id: string;
    anime_title: string;
    anime_poster: string;
    episode_number: number;
    episode_title: string | null;
    watched_at: string;
    progress_seconds: number;
    total_seconds: number;
    completed: boolean;
}

export const useWatchHistory = () => {
    const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setWatchHistory([]);
            setLoading(false);
            return;
        }

        const fetchWatchHistory = async () => {
            try {
                const { data, error } = await supabase
                    .from('watch_history')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('watched_at', { ascending: false });

                if (error) throw error;
                setWatchHistory(data || []);
            } catch (error) {
                console.error('Error fetching watch history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchWatchHistory();

        // Subscribe to changes
        const subscription = supabase
            .channel(`watch_history:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'watch_history',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setWatchHistory((prev) => [payload.new as WatchHistoryItem, ...prev]);
                    } else if (payload.eventType === 'UPDATE') {
                        setWatchHistory((prev) =>
                            prev.map((item) =>
                                item.id === payload.new.id ? (payload.new as WatchHistoryItem) : item
                            )
                        );
                    } else if (payload.eventType === 'DELETE') {
                        setWatchHistory((prev) =>
                            prev.filter((item) => item.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const addToWatchHistory = async (anime: any, episodeNumber: number, episodeTitle: string | null = null, progressSeconds: number = 0, totalSeconds: number = 0) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            // Check if entry already exists
            const { data: existing } = await supabase
                .from('watch_history')
                .select('id')
                .eq('user_id', user.id)
                .eq('anime_id', anime.id)
                .eq('episode_number', episodeNumber)
                .single();

            if (existing) {
                // Update existing entry
                const { error } = await supabase
                    .from('watch_history')
                    .update({
                        progress_seconds: progressSeconds,
                        total_seconds: totalSeconds,
                        completed: progressSeconds >= totalSeconds && totalSeconds > 0,
                        watched_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);

                return { error };
            } else {
                // Insert new entry
                const { error } = await supabase.from('watch_history').insert({
                    user_id: user.id,
                    anime_id: anime.id,
                    anime_title: anime.title,
                    anime_poster: anime.poster || anime.image,
                    episode_number: episodeNumber,
                    episode_title: episodeTitle,
                    progress_seconds: progressSeconds,
                    total_seconds: totalSeconds,
                    completed: progressSeconds >= totalSeconds && totalSeconds > 0,
                });

                return { error };
            }
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const removeFromWatchHistory = async (animeId: string) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            const { error } = await supabase
                .from('watch_history')
                .delete()
                .eq('user_id', user.id)
                .eq('anime_id', animeId);

            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const updateProgress = async (animeId: string, episodeNumber: number, progressSeconds: number, totalSeconds: number = 0) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            const { error } = await supabase
                .from('watch_history')
                .update({
                    progress_seconds: progressSeconds,
                    total_seconds: totalSeconds,
                    completed: progressSeconds >= totalSeconds && totalSeconds > 0,
                    watched_at: new Date().toISOString(),
                })
                .eq('user_id', user.id)
                .eq('anime_id', animeId)
                .eq('episode_number', episodeNumber);

            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const getWatchProgress = (animeId: string, episodeNumber: number) => {
        const item = watchHistory.find(
            (h) => h.anime_id === animeId && h.episode_number === episodeNumber
        );
        return item?.progress_seconds || 0;
    };

    return {
        watchHistory,
        loading,
        addToWatchHistory,
        removeFromWatchHistory,
        updateProgress,
        getWatchProgress,
    };
};
