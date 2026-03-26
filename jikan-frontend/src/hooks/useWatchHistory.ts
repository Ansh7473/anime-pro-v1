/**
 * useWatchHistory
 * Works WITHOUT login: data is saved to localStorage.
 * If logged in, syncs with Supabase.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface WatchHistoryItem {
    id: string;
    user_id?: string;
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

const STORAGE_KEY = 'animepro_watch_history';
const MAX_LOCAL_ITEMS = 200;

function loadFromStorage(): WatchHistoryItem[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveToStorage(items: WatchHistoryItem[]) {
    try {
        // Keep only latest MAX_LOCAL_ITEMS
        const trimmed = items.slice(0, MAX_LOCAL_ITEMS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch { /* silent */ }
}

export const useWatchHistory = () => {
    const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>(loadFromStorage);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // On mount: merge localStorage with Supabase if logged in
    useEffect(() => {
        const init = async () => {
            const local = loadFromStorage();
            if (user && supabase) {
                try {
                    const { data } = await supabase
                        .from('watch_history')
                        .select('*')
                        .eq('user_id', user.id)
                        .order('watched_at', { ascending: false });

                    const remote: WatchHistoryItem[] = data || [];

                    // Merge: group by anime_id+episode_number, remote wins on conflict
                    const seen = new Set<string>();
                    const merged: WatchHistoryItem[] = [];
                    for (const item of [...remote, ...local]) {
                        const key = `${item.anime_id}_ep${item.episode_number}`;
                        if (!seen.has(key)) {
                            seen.add(key);
                            merged.push(item);
                        }
                    }

                    setWatchHistory(merged);
                    saveToStorage(merged);
                } catch (e) {
                    console.warn('Supabase history sync failed:', e);
                    setWatchHistory(local);
                }
            } else {
                setWatchHistory(local);
            }
            setLoading(false);
        };
        init();
    }, [user]);

    const addToWatchHistory = useCallback(async (
        anime: any,
        episodeNumber: number,
        episodeTitle: string | null = null,
        progressSeconds: number = 0,
        totalSeconds: number = 0
    ): Promise<{ error?: any }> => {
        const animeId = String(anime.id || anime.mal_id);
        const key = `${animeId}_ep${episodeNumber}`;
        const newItem: WatchHistoryItem = {
            id: `local_${Date.now()}_${key}`,
            anime_id: animeId,
            anime_title: anime.title || 'Unknown',
            anime_poster: anime.poster || anime.image || '',
            episode_number: episodeNumber,
            episode_title: episodeTitle,
            watched_at: new Date().toISOString(),
            progress_seconds: progressSeconds,
            total_seconds: totalSeconds,
            completed: totalSeconds > 0 && progressSeconds >= totalSeconds,
        };

        setWatchHistory(prev => {
            // Update existing or insert at top
            const exists = prev.findIndex(h => h.anime_id === animeId && h.episode_number === episodeNumber);
            let updated: WatchHistoryItem[];
            if (exists >= 0) {
                updated = [{ ...prev[exists], ...newItem }, ...prev.filter((_, i) => i !== exists)];
            } else {
                updated = [newItem, ...prev];
            }
            saveToStorage(updated);
            return updated;
        });

        if (user && supabase) {
            try {
                const { data: existing } = await supabase
                    .from('watch_history')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('anime_id', animeId)
                    .eq('episode_number', episodeNumber)
                    .single();

                if (existing) {
                    await supabase.from('watch_history').update({
                        progress_seconds: progressSeconds,
                        total_seconds: totalSeconds,
                        completed: totalSeconds > 0 && progressSeconds >= totalSeconds,
                        watched_at: newItem.watched_at,
                    }).eq('id', existing.id);
                } else {
                    await supabase.from('watch_history').insert({
                        user_id: user.id,
                        anime_id: animeId,
                        anime_title: newItem.anime_title,
                        anime_poster: newItem.anime_poster,
                        episode_number: episodeNumber,
                        episode_title: episodeTitle,
                        progress_seconds: progressSeconds,
                        total_seconds: totalSeconds,
                        completed: newItem.completed,
                    });
                }
            } catch (e) {
                console.warn('Supabase history add failed:', e);
            }
        }

        return {};
    }, [user]);

    const removeFromWatchHistory = useCallback(async (animeId: string): Promise<{ error?: any }> => {
        setWatchHistory(prev => {
            const updated = prev.filter(h => h.anime_id !== animeId);
            saveToStorage(updated);
            return updated;
        });

        if (user && supabase) {
            try {
                await supabase.from('watch_history').delete()
                    .eq('user_id', user.id)
                    .eq('anime_id', animeId);
            } catch (e) {
                console.warn('Supabase history remove failed:', e);
            }
        }

        return {};
    }, [user]);

    const updateProgress = useCallback(async (
        animeId: string,
        episodeNumber: number,
        progressSeconds: number,
        totalSeconds: number = 0
    ): Promise<{ error?: any }> => {
        setWatchHistory(prev => {
            const updated = prev.map(h =>
                h.anime_id === animeId && h.episode_number === episodeNumber
                    ? { ...h, progress_seconds: progressSeconds, total_seconds: totalSeconds, watched_at: new Date().toISOString(), completed: totalSeconds > 0 && progressSeconds >= totalSeconds }
                    : h
            );
            saveToStorage(updated);
            return updated;
        });

        if (user && supabase) {
            try {
                await supabase.from('watch_history').update({
                    progress_seconds: progressSeconds,
                    total_seconds: totalSeconds,
                    completed: totalSeconds > 0 && progressSeconds >= totalSeconds,
                    watched_at: new Date().toISOString(),
                })
                    .eq('user_id', user.id)
                    .eq('anime_id', animeId)
                    .eq('episode_number', episodeNumber);
            } catch (e) {
                console.warn('Supabase progress update failed:', e);
            }
        }

        return {};
    }, [user]);

    const getWatchProgress = useCallback((animeId: string, episodeNumber: number) => {
        const item = watchHistory.find(h => h.anime_id === String(animeId) && h.episode_number === episodeNumber);
        return item?.progress_seconds || 0;
    }, [watchHistory]);

    return { watchHistory, loading, addToWatchHistory, removeFromWatchHistory, updateProgress, getWatchProgress };
};
