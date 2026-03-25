import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface Favorite {
    id: string;
    user_id: string;
    anime_id: string;
    anime_title: string;
    anime_poster: string;
    created_at: string;
}

export const useFavorites = () => {
    const [favorites, setFavorites] = useState<Favorite[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        const fetchFavorites = async () => {
            try {
                const { data, error } = await supabase
                    .from('favorites')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setFavorites(data || []);
            } catch (error) {
                console.error('Error fetching favorites:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();

        // Subscribe to changes
        const subscription = supabase
            .channel(`favorites:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'favorites',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        setFavorites((prev) => [payload.new as Favorite, ...prev]);
                    } else if (payload.eventType === 'DELETE') {
                        setFavorites((prev) =>
                            prev.filter((fav) => fav.id !== payload.old.id)
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user]);

    const addFavorite = async (anime: any) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            const { error } = await supabase.from('favorites').insert({
                user_id: user.id,
                anime_id: anime.id,
                anime_title: anime.title,
                anime_poster: anime.poster || anime.image,
            });

            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const removeFavorite = async (animeId: string) => {
        if (!user) return { error: 'User not authenticated' };

        try {
            const { error } = await supabase
                .from('favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('anime_id', animeId);

            return { error };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const isFavorite = (animeId: string) => {
        return favorites.some((fav) => fav.anime_id === animeId);
    };

    return {
        favorites,
        loading,
        addFavorite,
        removeFavorite,
        isFavorite,
    };
};
