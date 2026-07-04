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
</script>

<a href="/watch/{id}/{epNum}" class="resume-card">
  <div class="card-poster">
    <img src={poster} alt={title} loading="lazy" decoding="async" />
    <div class="play-circle">
      <span class="play-icon">▶</span>
    </div>
    <span class="ep-badge">EP {epNum}</span>
    {#if percent > 0}
      <div class="progress-track">
        <div class="progress-fill" style="width: {percent}%"></div>
      </div>
    {/if}
  </div>
  <p class="card-title">{title}</p>
</a>

<style>
  .resume-card {
    display: block;
    flex-shrink: 0;
    width: 132px;
    cursor: pointer;
    text-decoration: none;
    scroll-snap-align: start;
    transition: transform 0.2s ease;
  }
  .resume-card:hover {
    transform: scale(1.05);
    z-index: 2;
  }

  .card-poster {
    position: relative;
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 12px;
    overflow: hidden;
    background: #181818;
    border: 2px solid transparent;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .resume-card:hover .card-poster {
    border-color: rgba(255, 255, 255, 0.9);
    box-shadow: 0 0 16px rgba(255, 255, 255, 0.12);
  }

  .card-poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-circle {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .play-icon {
    color: white;
    font-size: 1rem;
    margin-left: 2px;
  }

  .ep-badge {
    position: absolute;
    left: 6px;
    bottom: 10px;
    background: rgba(0, 0, 0, 0.75);
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.15);
  }

  .progress-track {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(255, 255, 255, 0.15);
  }
  .progress-fill {
    height: 100%;
    background: var(--net-red, #E50914);
    border-radius: 0 1px 0 0;
  }

  .card-title {
    margin-top: 6px;
    padding: 0 2px;
    font-size: 0.78rem;
    font-weight: 500;
    color: #a3a3a3;
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: color 0.2s;
  }
  .resume-card:hover .card-title {
    color: white;
  }

  @media (max-width: 768px) {
    .resume-card { width: 120px; }
    .card-poster { border-radius: 10px; }
  }

  @media (max-width: 480px) {
    .resume-card { width: 105px; }
    .card-poster { border-radius: 8px; }
    .card-title { font-size: 0.72rem; }
  }
</style>
