<script lang="ts">
  import { goto } from "$app/navigation";
  import { Flame, Star, Trophy, Calendar, Clock, Film, Swords, Heart, Sparkles } from "lucide-svelte";

  const categories = [
    { id: "trending", title: "Trending Now", desc: "What everyone is watching right now", icon: Flame, color: "#e50914" },
    { id: "popular", title: "Most Popular", desc: "Fan favorites across all time", icon: Star, color: "#fbbf24" },
    { id: "highest-rated", title: "Highest Rated", desc: "Top rated anime by the community", icon: Trophy, color: "#22c55e" },
    { id: "seasonal", title: "This Season", desc: "Currently airing this season", icon: Calendar, color: "#3b82f6" },
    { id: "upcoming", title: "Upcoming", desc: "Most anticipated upcoming releases", icon: Clock, color: "#a855f7" },
    { id: "movies", title: "Movies", desc: "Best anime films and features", icon: Film, color: "#ec4899" },
    { id: "action", title: "Action", desc: "High energy battles and adventures", icon: Swords, color: "#ef4444" },
    { id: "romance", title: "Romance", desc: "Love stories and slice of life", icon: Heart, color: "#f472b6" },
  ];
</script>

<svelte:head>
  <title>Explore Anime — WatchAnimez</title>
  <meta name="description" content="Explore anime by category on WatchAnimez — trending, popular, top-rated, seasonal, upcoming, movies, action, and romance." />
</svelte:head>

<div class="page container">
  <div class="page-header">
    <h1 class="page-title">Explore Anime</h1>
    <p class="page-subtitle">Browse anime by category. Find your next favorite series.</p>
  </div>

  <div class="categories-grid">
    {#each categories as cat (cat.id)}
      <a href="/explore/{cat.id}" class="category-card">
        <div class="card-icon" style="color: {cat.color}">
          <cat.icon size={28} />
        </div>
        <div class="card-info">
          <h2 class="card-title">{cat.title}</h2>
          <p class="card-desc">{cat.desc}</p>
        </div>
        <span class="card-arrow">→</span>
      </a>
    {/each}
  </div>

  <div class="quick-links">
    <h3>Quick Links</h3>
    <div class="links-row">
      <a href="/latest" class="quick-link">Latest Releases</a>
      <a href="/schedule" class="quick-link">Release Schedule</a>
      <a href="/movies" class="quick-link">Movies</a>
      <a href="/tv-series" class="quick-link">TV Series</a>
    </div>
  </div>
</div>

<style>
  .page {
    padding-top: 2rem;
    padding-bottom: 4rem;
  }

  .page-header {
    margin-bottom: 2.5rem;
  }
  .page-title {
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.5rem;
  }
  .page-subtitle {
    color: var(--net-text-muted);
    font-size: 1rem;
  }

  .categories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 3rem;
  }

  .category-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem 1.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    text-decoration: none;
    color: inherit;
    transition: all 0.25s ease;
  }
  .category-card:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--net-red);
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }

  .card-icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .card-info {
    flex: 1;
    min-width: 0;
  }
  .card-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
    color: white;
  }
  .card-desc {
    font-size: 0.82rem;
    color: var(--net-text-muted);
    line-height: 1.4;
  }

  .card-arrow {
    flex-shrink: 0;
    font-size: 1.2rem;
    color: var(--net-text-muted);
    transition: transform 0.2s, color 0.2s;
  }
  .category-card:hover .card-arrow {
    transform: translateX(4px);
    color: var(--net-red);
  }

  .quick-links {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 2rem;
  }
  .quick-links h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: var(--net-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.85rem;
  }
  .links-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }
  .quick-link {
    padding: 0.6rem 1.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50px;
    color: white;
    font-size: 0.88rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s;
  }
  .quick-link:hover {
    background: var(--net-red);
    border-color: var(--net-red);
  }

  @media (max-width: 768px) {
    .page-title { font-size: 1.6rem; }
    .categories-grid {
      grid-template-columns: 1fr;
    }
    .category-card {
      padding: 1rem 1.25rem;
    }
  }

  @media (max-width: 480px) {
    .page-title { font-size: 1.4rem; }
    .category-card {
      padding: 0.9rem 1rem;
      gap: 0.75rem;
    }
    .card-icon {
      width: 40px;
      height: 40px;
    }
    .card-title { font-size: 0.95rem; }
    .card-desc { font-size: 0.78rem; }
    .quick-link {
      padding: 0.5rem 1rem;
      font-size: 0.82rem;
    }
  }
</style>
