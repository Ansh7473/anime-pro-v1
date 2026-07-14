<script lang="ts">
  import { getProxiedImage } from "$lib/api";

  let {
    topAiring = [],
    justFinished = [],
    topMovies = [],
  } = $props<{
    topAiring?: any[];
    justFinished?: any[];
    topMovies?: any[];
  }>();

  function meta(a: any) {
    const format = String(a?.type || a?.format || "TV").toUpperCase().replace(/_/g, " ");
    const year = a?.year || a?.seasonYear || "";
    const raw = a?.score || a?.rating || 0;
    const score = raw > 10 ? (raw / 10).toFixed(1) : raw ? Number(raw).toFixed(1) : "";
    return { format, year, score };
  }
</script>

<aside class="home-sidebar" aria-label="Discover more">
  {#if topAiring.length}
    <section class="sb-panel">
      <header class="sb-head">
        <span class="sb-dot" aria-hidden="true"></span>
        <h2>TOP AIRING</h2>
      </header>
      <ul class="sb-list">
        {#each topAiring.slice(0, 5) as a, i (a.id || a.mal_id || i)}
          {@const m = meta(a)}
          <li>
            <a class="sb-item" href="/anime/{a.id || a.mal_id}/">
              <img
                class="sb-thumb"
                src={getProxiedImage(a.poster || a.image)}
                alt=""
                loading="lazy"
              />
              <div class="sb-body">
                <span class="sb-title">{a.title || a.name}</span>
                <span class="sb-meta">
                  {#if m.format}<span>{m.format}</span>{/if}
                  {#if m.year}<span>{m.year}</span>{/if}
                  {#if m.score}<span>★ {m.score}</span>{/if}
                </span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if justFinished.length}
    <section class="sb-panel">
      <header class="sb-head">
        <span class="sb-dot" aria-hidden="true"></span>
        <h2>JUST FINISHED</h2>
      </header>
      <ul class="sb-list">
        {#each justFinished.slice(0, 4) as a, i (a.id || a.mal_id || i)}
          {@const m = meta(a)}
          <li>
            <a class="sb-item" href="/anime/{a.id || a.mal_id}/">
              <img
                class="sb-thumb"
                src={getProxiedImage(a.poster || a.image)}
                alt=""
                loading="lazy"
              />
              <div class="sb-body">
                <span class="sb-title">{a.title || a.name}</span>
                <span class="sb-meta">
                  {#if m.format}<span>{m.format}</span>{/if}
                  {#if m.year}<span>{m.year}</span>{/if}
                  {#if m.score}<span>★ {m.score}</span>{/if}
                </span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if topMovies.length}
    <section class="sb-panel">
      <header class="sb-head">
        <span class="sb-dot" aria-hidden="true"></span>
        <h2>TOP MOVIES</h2>
      </header>
      <ul class="sb-list">
        {#each topMovies.slice(0, 4) as a, i (a.id || a.mal_id || i)}
          {@const m = meta(a)}
          <li>
            <a class="sb-item" href="/anime/{a.id || a.mal_id}/">
              <img
                class="sb-thumb"
                src={getProxiedImage(a.poster || a.image)}
                alt=""
                loading="lazy"
              />
              <div class="sb-body">
                <span class="sb-title">{a.title || a.name}</span>
                <span class="sb-meta">
                  <span>MOVIE</span>
                  {#if m.year}<span>{m.year}</span>{/if}
                  {#if m.score}<span>★ {m.score}</span>{/if}
                </span>
              </div>
            </a>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</aside>

<style>
  .home-sidebar {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    width: 100%;
  }
  .sb-panel {
    background: var(--net-panel, #0c0c0c);
    border: 1px solid var(--net-panel-border, rgba(255, 255, 255, 0.08));
    border-radius: 14px;
    padding: 0.7rem 0.65rem;
  }
  .sb-head {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin-bottom: 0.7rem;
    padding: 0 0.25rem 0.55rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .sb-head h2 {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: #fff;
  }
  .sb-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: linear-gradient(135deg, #FACC15, #F59E0B);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.55);
    flex-shrink: 0;
  }
  .sb-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .sb-item {
    display: flex;
    gap: 0.65rem;
    padding: 0.4rem;
    border-radius: 10px;
    text-decoration: none;
    color: inherit;
    transition: background 0.18s ease;
  }
  .sb-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  .sb-thumb {
    width: 46px;
    height: 64px;
    object-fit: cover;
    border-radius: 8px;
    flex-shrink: 0;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255,255,255,0.06);
  }
  .sb-body {
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
  }
  .sb-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: #eee;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .sb-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.45);
    font-weight: 600;
  }
</style>
