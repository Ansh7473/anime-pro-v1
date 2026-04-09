<script lang="ts">
  import { ArrowRight, LayoutGrid } from 'lucide-svelte';
  import { fly } from 'svelte/transition';

  const genres = [
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", 
    "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life", 
    "Sports", "Supernatural", "Thriller", "Psychological", "Isekai"
  ];
</script>

<div class="tv-genres-page" in:fly={{ x: 50, duration: 500 }}>
  <header class="section-header">
    <LayoutGrid size={40} class="text-red-500" />
    <h1>Categories</h1>
  </header>

  <div class="genres-grid">
    {#each genres as genre, i}
      <a href="/tv/search?genre={genre}" class="genre-card" in:fly={{ y: 20, delay: i * 30 }}>
        <div class="genre-content">
          <span class="genre-name">{genre}</span>
          <div class="genre-arrow-wrapper">
            <ArrowRight size={24} />
          </div>
        </div>
      </a>
    {/each}
  </div>
</div>

<style>
  .section-header {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-bottom: 5rem;
  }

  .section-header h1 {
    font-size: 3.5rem;
    font-weight: 900;
  }

  .genres-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 2rem;
    padding-bottom: 5rem;
  }

  .genre-card {
    height: 120px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    display: flex;
    align-items: center;
    padding: 2rem;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .genre-card:hover,
  .genre-card:focus-visible {
    background: var(--net-red);
    transform: scale(1.05);
    border-color: white;
    outline: none;
    box-shadow: 0 10px 40px rgba(229, 9, 20, 0.4);
  }

  .genre-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .genre-name {
    font-size: 1.75rem;
    font-weight: 800;
    color: white;
  }

  .genre-arrow-wrapper {
    color: rgba(255, 255, 255, 0.3);
    transition: transform 0.3s;
  }

  .genre-card:hover .genre-arrow-wrapper,
  .genre-card:focus-visible .genre-arrow-wrapper {
    transform: translateX(10px);
    color: white;
  }
</style>
