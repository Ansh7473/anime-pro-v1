<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { getAnimeTitle } from "$lib/animeTitle";
  import { titleLanguage } from "$lib/stores/titleLanguage";

  const toDateStr = (date: Date) => date.toISOString().split("T")[0];
  const dateOptions = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return {
      date: toDateStr(date),
      label: index === 0 ? "Today" : index === 1 ? "Tomorrow" : date.toLocaleDateString("en-US", { weekday: "short" }),
      sub: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });

  let selectedIndex = $state(0);
  let items = $state<any[]>([]);
  let loading = $state(true);
  let requestId = 0;
  let visibleItems = $derived(items.slice(0, 12));

  function titleOf(item: any): string {
    return getAnimeTitle(item, $titleLanguage);
  }

  function clockLabel(airingAt: number): string {
    if (!airingAt) return "TBA";
    return new Date(airingAt * 1000).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function untilLabel(airingAt: number): string {
    const minutes = Math.floor((airingAt * 1000 - Date.now()) / 60000);
    if (minutes <= 0) return "Aired";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ${minutes % 60} min`;
    return `${Math.floor(hours / 24)} days`;
  }

  async function load(index: number) {
    const activeRequest = ++requestId;
    loading = true;
    try {
      const date = new Date(dateOptions[index].date + "T00:00:00");
      const start = Math.floor(date.getTime() / 1000);
      const result = await api.getAnilistSchedule(start, start + 86399);
      if (activeRequest === requestId) items = (Array.isArray(result) ? result : []).filter((item: any) => item?.airingAt);
    } catch {
      if (activeRequest === requestId) items = [];
    } finally {
      if (activeRequest === requestId) loading = false;
    }
  }

  $effect(() => {
    void load(selectedIndex);
  });
</script>

<section class="lineup">
  <header class="lineup-head">
    <div>
      <h2>Tonight's lineup</h2>
      <p>Broadcast estimates from the weekly anime calendar.</p>
    </div>
    <a href="/schedule">Open full calendar <span aria-hidden="true">↗</span></a>
  </header>

  <div class="day-tabs" role="tablist" aria-label="Choose schedule date">
    {#each dateOptions as option, index}
      <button type="button" role="tab" class:active={selectedIndex === index} aria-selected={selectedIndex === index} onclick={() => (selectedIndex = index)}>
        <span>{option.label}</span><small>{option.sub}</small>
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="lineup-grid" aria-label="Loading schedule">
      {#each Array(8) as _, index (index)}<div class="schedule-skeleton"></div>{/each}
    </div>
  {:else if !visibleItems.length}
    <div class="empty"><p>No episode times are listed for this date.</p><a href="/schedule">Check the full schedule</a></div>
  {:else}
    <div class="lineup-grid">
      {#each visibleItems as anime (anime.airingScheduleId ?? `${anime.id ?? anime.mal_id}:${anime.airingAt}:${anime.episode}`)}
        <a class="lineup-item" href={`/anime/${anime.id || anime.mal_id}`}>
          <time datetime={new Date(anime.airingAt * 1000).toISOString()}>{clockLabel(anime.airingAt)}</time>
          <img src={getProxiedImage(anime.poster || anime.image)} alt="" loading="lazy" decoding="async" />
          <span class="item-copy">
            <strong>{titleOf(anime)}</strong>
            <small>Episode {anime.episode || "TBA"} · {untilLabel(anime.airingAt)}</small>
          </span>
          <span class="open-mark" aria-hidden="true">↗</span>
        </a>
      {/each}
    </div>
  {/if}
</section>

<style>
  .lineup { color: #eee8df; }
  .lineup-head { display: flex; align-items: end; justify-content: space-between; gap: 2rem; margin-bottom: 1.25rem; }
  .lineup-head h2 { margin: 0; font: 800 clamp(1.6rem, 2.4vw, 2.4rem)/1 var(--net-display-font, system-ui); letter-spacing: -0.04em; }
  .lineup-head p { margin: 0.45rem 0 0; color: #8e8880; font-size: 0.88rem; }
  .lineup-head a { color: #d5cec4; font-size: 0.8rem; font-weight: 750; text-decoration: none; }
  .lineup-head a:hover { color: #f1a287; }

  .day-tabs { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 0.35rem; margin-bottom: 1.1rem; }
  .day-tabs button { min-height: 52px; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 0.18rem; border: 0; border-radius: 3px; background: #11100e; color: #817b74; cursor: pointer; font-family: inherit; }
  .day-tabs button:hover { color: #ded6cc; background: #181512; }
  .day-tabs button.active { color: #1c0e09; background: #df886b; }
  .day-tabs button:focus-visible, .lineup-head a:focus-visible, .lineup-item:focus-visible { outline: 2px solid #f2b19a; outline-offset: 2px; }
  .day-tabs span { font-size: 0.76rem; font-weight: 800; }
  .day-tabs small { font-size: 0.62rem; opacity: 0.74; }

  .lineup-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); column-gap: 1.5rem; }
  .lineup-item { min-height: 92px; display: grid; grid-template-columns: 4.4rem 50px minmax(0, 1fr) auto; gap: 0.75rem; align-items: center; padding: 0.7rem 0; color: inherit; text-decoration: none; box-shadow: inset 0 -1px #24201d; }
  .lineup-item time { color: #e59a80; font-size: 0.76rem; font-weight: 850; font-variant-numeric: tabular-nums; }
  .lineup-item img { width: 50px; height: 68px; object-fit: cover; border-radius: 3px; background: #181513; }
  .item-copy { min-width: 0; }
  .item-copy strong { display: block; overflow: hidden; color: #e9e3da; font-size: 0.84rem; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
  .item-copy small { display: block; margin-top: 0.35rem; color: #827c75; font-size: 0.68rem; }
  .open-mark { color: #57524d; font-size: 0.78rem; }
  .lineup-item:hover strong, .lineup-item:hover .open-mark { color: #f1a287; }
  .schedule-skeleton { min-height: 92px; box-shadow: inset 0 -1px #24201d; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent); background-size: 200% 100%; animation: loading 1.4s linear infinite; }
  @keyframes loading { to { background-position: -200% 0; } }
  .empty { min-height: 10rem; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #8d8780; }
  .empty p { margin: 0 0 0.5rem; }
  .empty a { color: #d98a70; text-decoration: none; }

  @media (max-width: 1180px) { .lineup-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 720px) {
    .lineup-head { align-items: start; flex-direction: column; gap: 0.75rem; }
    .day-tabs { display: flex; overflow-x: auto; padding-bottom: 0.3rem; scrollbar-width: none; }
    .day-tabs::-webkit-scrollbar { display: none; }
    .day-tabs button { flex: 0 0 5rem; }
    .lineup-grid { grid-template-columns: 1fr; }
    .lineup-item { grid-template-columns: 4rem 46px minmax(0, 1fr) auto; }
    .lineup-item img { width: 46px; height: 62px; }
  }
  @media (prefers-reduced-motion: reduce) { .schedule-skeleton { animation: none; } }
</style>