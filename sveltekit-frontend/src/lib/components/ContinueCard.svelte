<script lang="ts">
  import { getProxiedImage } from '$lib/api';

  let { item } = $props<{ item: any }>();

  const poster = $derived(getProxiedImage(item?.poster || item?.image || ''));
  const title = $derived(item?.title || 'Unknown');
  const epNum = $derived(item?.episode || item?.episodeNumber || 1);
  const progress = $derived(item?.progress || 0);
  const duration = $derived(item?.duration || 1);
  const percent = $derived(Math.min((progress / duration) * 100, 100));
  const id = $derived(item?.id || item?.animeId);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
</script>

<a href="/watch/{id}/{epNum}" class="continue-card">
  <div class="card-thumb">
    <img src={poster} alt={title} loading="lazy" />
    <div class="thumb-overlay">
      <div class="play-icon">▶</div>
    </div>
    <span class="ep-badge">EP {epNum}</span>
    <span class="time-left">{formatTime(duration - progress)} left</span>
    <div class="progress-track">
      <div class="progress-fill" style="width: {percent}%"></div>
    </div>
  </div>
  <p class="card-title">{title}</p>
</a>

<style>
  .continue-card {
    display: block; flex-shrink: 0; width: 220px;
    cursor: pointer; transition: transform 0.3s ease;
    text-decoration: none;
  }
  .continue-card:hover { transform: scale(1.05); z-index: 2; }

  .card-thumb {
    position: relative; width: 100%; aspect-ratio: 16/9;
    border-radius: 8px; overflow: hidden;
    background: var(--net-card-bg);
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  }
  .card-thumb img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.4s ease;
  }
  .continue-card:hover .card-thumb img { transform: scale(1.1); }

  .thumb-overlay {
    position: absolute; inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s;
  }
  .continue-card:hover .thumb-overlay { opacity: 1; }

  .play-icon {
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(229,9,20,0.9);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.1rem; color: white;
    box-shadow: 0 4px 15px rgba(229,9,20,0.4);
    transform: scale(0.8); transition: transform 0.3s;
  }
  .continue-card:hover .play-icon { transform: scale(1); }

  .ep-badge {
    position: absolute; top: 8px; left: 8px;
    background: rgba(0,0,0,0.75); color: white;
    font-size: 0.65rem; font-weight: 700; padding: 2px 8px;
    border-radius: 4px; letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .time-left {
    position: absolute; top: 8px; right: 8px;
    background: rgba(0,0,0,0.75); color: var(--net-text-muted);
    font-size: 0.65rem; font-weight: 500; padding: 2px 8px;
    border-radius: 4px;
  }

  /* Red progress bar at bottom */
  .progress-track {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: 4px; background: rgba(255,255,255,0.15);
  }
  .progress-fill {
    height: 100%;
    background: var(--net-red);
    border-radius: 0 2px 2px 0;
    transition: width 0.3s ease;
    box-shadow: 0 0 8px rgba(229,9,20,0.5);
  }

  .card-title {
    margin-top: 0.5rem; font-size: 0.85rem; font-weight: 500;
    color: var(--net-text-muted); padding: 0 2px;
    display: -webkit-box; -webkit-line-clamp: 1;
    -webkit-box-orient: vertical; overflow: hidden;
  }
  .continue-card:hover .card-title { color: white; }

  @media (max-width: 768px) {
    .continue-card { width: 180px; }
  }
</style>
