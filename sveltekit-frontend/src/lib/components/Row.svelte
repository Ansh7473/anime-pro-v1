<script lang="ts">
  import AnimeCard from "./AnimeCard.svelte";

  let {
    title,
    items = [],
    href = "",
    eyebrow = "",
    showRank = false,
  } = $props<{
    title: string;
    items: any[];
    href?: string;
    eyebrow?: string;
    showRank?: boolean;
  }>();

  let scrollContainer: HTMLDivElement | undefined = $state();

  let uniqueItems = $derived.by(() => {
    const seen = new Set();
    return items.filter((anime: any) => {
      const id = anime.id || anime.mal_id;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  });

  const countLabel = $derived(
    uniqueItems.length > 0 ? `${Math.min(uniqueItems.length, 24)}+` : "",
  );

  function scrollBy(dir: number) {
    const amount = scrollContainer?.clientWidth
      ? scrollContainer.clientWidth * 0.85
      : 400;
    scrollContainer?.scrollBy({ left: dir * amount, behavior: "smooth" });
  }
</script>

{#if uniqueItems.length > 0}
  <section class="row-section" class:ranked={showRank}>
    <div class="row-header">
      <div class="row-title-group">
        <span class="accent-bar" aria-hidden="true"></span>
        <div class="title-stack">
          {#if eyebrow}
            <span class="row-eyebrow">{eyebrow}</span>
          {/if}
          <div class="title-line">
            <h2 class="row-title">{title}</h2>
            {#if countLabel}
              <span class="count-pill" aria-hidden="true">{countLabel}</span>
            {/if}
          </div>
        </div>
      </div>
      {#if href}
        <a {href} class="row-see-all" aria-label="See all {title.toLowerCase()}">
          See all
          <span class="see-arrow" aria-hidden="true">→</span>
        </a>
      {/if}
    </div>

    <div class="row-wrapper">
      <button class="row-arrow left" onclick={() => scrollBy(-1)} aria-label="Scroll left"
        >‹</button
      >
      <div class="row-scroll" bind:this={scrollContainer}>
        {#each uniqueItems as anime, i (anime.id || anime.mal_id || `${title}-${i}`)}
          <div class="card-slot">
            <AnimeCard {anime} rank={showRank ? i + 1 : 0} />
          </div>
        {/each}
      </div>
      <button class="row-arrow right" onclick={() => scrollBy(1)} aria-label="Scroll right"
        >›</button
      >
      <div class="edge-fade left" aria-hidden="true"></div>
      <div class="edge-fade right" aria-hidden="true"></div>
    </div>
  </section>
{/if}

<style>
  .row-section {
    margin-bottom: 2rem;
    position: relative;
  }
  .row-section.ranked {
    padding: 1rem 0 0.35rem;
    background: linear-gradient(
      180deg,
      rgba(229, 9, 20, 0.06) 0%,
      rgba(255, 255, 255, 0.015) 42%,
      transparent 100%
    );
    border-top: 1px solid rgba(229, 9, 20, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    margin-bottom: 1.75rem;
  }

  .row-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    margin-bottom: 0.75rem;
    gap: 0.75rem;
  }
  .row-title-group {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }
  .title-stack {
    display: flex;
    flex-direction: column;
    gap: 0.12rem;
    min-width: 0;
  }
  .row-eyebrow {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(229, 9, 20, 0.95);
    line-height: 1.2;
  }
  .title-line {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    min-width: 0;
  }
  .accent-bar {
      width: 4px;
      height: 1.65rem;
      background: linear-gradient(180deg, #FF8A3D 0%, #7b2fbe 100%);
      border-radius: 99px;
      flex-shrink: 0;
      box-shadow:
        0 0 12px rgba(255, 7, 58, 0.4),
        0 0 4px rgba(123, 47, 190, 0.3);
    }
    .row-title {
      font-size: clamp(1.1rem, 1.5vw, 1.35rem);
      font-weight: 800;
      color: #fff;
      letter-spacing: -0.025em;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
      line-height: 1.15;
    }
  .count-pill {
    flex-shrink: 0;
    font-size: 0.62rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0.15rem 0.4rem;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }
  .row-see-all {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      color: rgba(255, 255, 255, 0.72);
      font-size: 0.78rem;
      font-weight: 700;
      text-decoration: none;
      flex-shrink: 0;
      white-space: nowrap;
      padding: 0.4rem 0.7rem;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
  .see-arrow {
    transition: transform 0.2s ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .row-see-all:hover {
          color: #fff;
          background: linear-gradient(
            135deg,
            rgba(255, 138, 61, 0.22),
            rgba(123, 47, 190, 0.15)
          );
          border-color: rgba(255, 7, 58, 0.4);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 16px rgba(250, 204, 21, 0.26);
                  }
              .row-see-all:hover .see-arrow {
      transform: translateX(2px);
    }
  }
  .row-see-all:active {
    transform: scale(0.97);
  }

  .row-wrapper {
    position: relative;
  }
  .row-scroll {
    display: flex;
    gap: 0.9rem;
    overflow-x: auto;
    padding: 0.45rem 1rem 1rem;
    scroll-padding-inline: 1rem;
        scroll-snap-type: x proximity;
        scroll-behavior: smooth;
        -ms-overflow-style: none;
        scrollbar-width: none;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior-x: contain;
      }
  .card-slot {
    flex: 0 0 164px;
    width: 164px;
    scroll-snap-align: start;
    min-width: 0;
  }
  .row-scroll::-webkit-scrollbar {
    display: none;
  }

  .edge-fade {
    position: absolute;
    top: 0;
    bottom: 0.6rem;
    width: 28px;
    pointer-events: none;
    z-index: 4;
    opacity: 0;
  }
  .edge-fade.left {
    left: 0;
    background: linear-gradient(to right, var(--net-bg, #070708), transparent);
  }
  .edge-fade.right {
    right: 0;
    background: linear-gradient(to left, var(--net-bg, #070708), transparent);
  }
  @media (min-width: 769px) {
    .edge-fade {
      opacity: 1;
      width: 48px;
    }
  }

  .row-arrow {
      position: absolute;
      top: 40%;
      transform: translateY(-50%);
      z-index: 5;
      width: 38px;
      height: 68px;
      border-radius: 10px;
      background: rgba(6, 6, 10, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: white;
      font-size: 1.45rem;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      cursor: pointer;
      backdrop-filter: blur(8px);
      transition:
        opacity 0.25s,
        background 0.2s,
        border-color 0.2s,
        transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .row-wrapper:hover .row-arrow {
      opacity: 1;
    }
    .row-arrow.left {
      left: 0.35rem;
    }
    .row-arrow.right {
      right: 0.35rem;
    }
    .row-arrow:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 7, 58, 0.4);
      transform: translateY(-50%) scale(1.1);
    }

  @media (max-width: 768px) {
    .row-section {
      margin-bottom: 1.55rem;
    }
    .row-section.ranked {
      margin-bottom: 1.4rem;
      padding: 0.9rem 0 0.25rem;
    }
    .row-header {
      padding: 0 0.9rem;
      margin-bottom: 0.6rem;
    }
    .row-title {
      font-size: 1.05rem;
    }
    .row-eyebrow {
      font-size: 0.62rem;
    }
    .accent-bar {
      height: 1.55rem;
    }
    .row-scroll {
      gap: 0.72rem;
      padding: 0.35rem 0.9rem 0.9rem;
      scroll-padding-inline: 0.9rem;
      scroll-snap-type: x proximity;
    }
    .card-slot {
      flex: 0 0 clamp(142px, 40vw, 178px);
      width: clamp(142px, 40vw, 178px);
    }
    .row-arrow {
      display: none;
    }
    .edge-fade {
      opacity: 0.85;
      width: 20px;
    }
    .row-see-all {
      font-size: 0.74rem;
      padding: 0.35rem 0.6rem;
    }
  }

  @media (max-width: 480px) {
    .row-section {
      margin-bottom: 1.35rem;
    }
    .row-header {
      padding: 0 0.75rem;
      margin-bottom: 0.5rem;
    }
    .row-title {
      font-size: 1rem;
    }
    .row-eyebrow {
      font-size: 0.58rem;
      letter-spacing: 0.07em;
    }
    .count-pill {
      font-size: 0.58rem;
      padding: 0.12rem 0.35rem;
    }
    .accent-bar {
      height: 1.4rem;
      width: 2.5px;
    }
    .row-scroll {
      gap: 0.65rem;
      padding: 0.3rem 0.75rem 0.8rem;
      scroll-padding-inline: 0.75rem;
    }
    .card-slot {
      flex: 0 0 clamp(128px, 41vw, 158px);
      width: clamp(128px, 41vw, 158px);
    }
    .row-see-all {
      font-size: 0.72rem;
      padding: 0.32rem 0.55rem;
    }
  }

  @media (max-width: 360px) {
    .card-slot {
      flex: 0 0 41vw;
      width: 41vw;
    }
    .row-scroll {
      gap: 0.55rem;
      padding-inline: 0.65rem;
      scroll-padding-inline: 0.65rem;
    }
    .row-header {
      padding: 0 0.65rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
      .row-see-all,
      .see-arrow,
      .row-arrow {
        transition: none;
      }
    }

    @keyframes row-fade-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .row-section {
      animation: row-fade-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
  </style>
