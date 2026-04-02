<script lang="ts">
    import { api, getProxiedImage } from "$lib/api";
    import { auth } from "$lib/stores/auth";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import AnimeCard from "$lib/components/AnimeCard.svelte";

    let favorites: any[] = $state([]);
    let loading = $state(true);
    let error = $state("");

    onMount(async () => {
        if (!$auth.token) {
            goto("/auth/login?redirect=/favorites");
            return;
        }

        try {
            const res = await api.getFavorites($auth.token);
            favorites = Array.isArray(res) ? res : res.data || [];
        } catch (e: any) {
            error = e.message || "Failed to load favorites";
            console.error(e);
        } finally {
            loading = false;
        }
    });

    async function handleRemove(animeId: string) {
        if (!$auth.token) return;
        try {
            await api.removeFromFavorites($auth.token, animeId);
            favorites = favorites.filter((item) => item.animeId !== animeId);
        } catch (e) {
            console.error(e);
        }
    }
</script>

<svelte:head>
    <title>My Favorites — AnimePro</title>
</svelte:head>

<div class="favorites-page container">
    <div class="page-header">
        <h1 class="page-title">My <span class="accent">Favorites</span></h1>
        <p class="page-subtitle">Your personal collection of beloved anime.</p>
    </div>

    {#if loading}
        <div class="center">
            <div class="spinner"></div>
        </div>
    {:else if error}
        <div class="error-state glass">
            <p>{error}</p>
            <button class="btn-primary" onclick={() => window.location.reload()}
                >Retry</button
            >
        </div>
    {:else if favorites.length === 0}
        <div class="empty-state glass">
            <div class="empty-icon">❤️</div>
            <h2>No favorites yet</h2>
            <p>Start adding anime to your favorites collection!</p>
            <a href="/" class="btn-primary">Browse Anime</a>
        </div>
    {:else}
        <div class="favorites-grid">
            {#each favorites as item}
                <div class="favorites-item">
                    <AnimeCard
                        anime={{
                            id: item.animeId,
                            title: item.animeTitle,
                            poster: item.animePoster,
                            status: item.status,
                        }}
                    />
                    <div class="item-actions">
                        <button
                            class="btn-remove"
                            onclick={() => handleRemove(item.animeId)}
                        >
                            <span>✕</span> Remove
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .favorites-page {
        padding: 2rem 0 6rem;
    }
    .page-header {
        margin-bottom: 3rem;
    }
    .page-title {
        font-size: 2.5rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        margin-bottom: 0.5rem;
    }
    .page-title .accent {
        color: var(--net-red);
    }
    .page-subtitle {
        color: var(--net-text-muted);
        font-size: 1rem;
    }

    .favorites-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 2rem;
    }

    .favorites-item {
        position: relative;
        transition: transform 0.2s ease;
    }

    .favorites-item:hover {
        transform: translateY(-4px);
    }

    .item-actions {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .favorites-item:hover .item-actions {
        opacity: 1;
    }

    .btn-remove {
        background: rgba(0, 0, 0, 0.8);
        color: white;
        border: none;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 14px;
    }

    .btn-remove:hover {
        background: var(--net-red);
        transform: scale(1.1);
    }

    .center {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 300px;
    }

    .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(255, 255, 255, 0.1);
        border-top-color: var(--net-red);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .error-state,
    .empty-state {
        text-align: center;
        padding: 4rem 2rem;
        border-radius: 16px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
    }

    .empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
    }

    .error-state h2,
    .empty-state h2 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
    }

    .error-state p,
    .empty-state p {
        color: var(--net-text-muted);
        margin-bottom: 1.5rem;
    }

    .btn-primary {
        display: inline-block;
        background: var(--net-red);
        color: white;
        padding: 0.75rem 2rem;
        border-radius: 8px;
        text-decoration: none;
        font-weight: 600;
        transition: all 0.2s ease;
    }

    .btn-primary:hover {
        background: #e50914;
        transform: translateY(-2px);
    }

    /* Tablet responsive */
    @media (max-width: 768px) {
        .favorites-page {
            padding: 1.5rem 0 5rem;
        }
        .page-header {
            margin-bottom: 2rem;
        }
        .page-title {
            font-size: 2rem;
        }
        .page-subtitle {
            font-size: 0.95rem;
        }
        .favorites-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 1.5rem;
        }
        .btn-remove {
            width: 32px;
            height: 32px;
            font-size: 12px;
        }
        .error-state,
        .empty-state {
            padding: 3rem 1.5rem;
        }
        .empty-icon {
            font-size: 3rem;
        }
        .error-state h2,
        .empty-state h2 {
            font-size: 1.3rem;
        }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
        .favorites-page {
            padding: 1rem 0 4rem;
        }
        .page-header {
            margin-bottom: 1.5rem;
        }
        .page-title {
            font-size: 1.6rem;
        }
        .page-subtitle {
            font-size: 0.9rem;
        }
        .favorites-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
        }
        .item-actions {
            top: 6px;
            right: 6px;
        }
        .btn-remove {
            width: 30px;
            height: 30px;
            font-size: 11px;
        }
        .error-state,
        .empty-state {
            padding: 2rem 1rem;
        }
        .empty-icon {
            font-size: 2.5rem;
        }
        .error-state h2,
        .empty-state h2 {
            font-size: 1.2rem;
        }
        .btn-primary {
            padding: 0.65rem 1.5rem;
            font-size: 0.9rem;
        }
    }

    /* Small mobile responsive */
    @media (max-width: 360px) {
        .page-title {
            font-size: 1.4rem;
        }
        .favorites-grid {
            grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
            gap: 0.8rem;
        }
        .btn-remove {
            width: 28px;
            height: 28px;
            font-size: 10px;
        }
    }
</style>
