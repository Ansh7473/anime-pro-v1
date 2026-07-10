<script lang="ts">
  import SkeletonCard from "./SkeletonCard.svelte";

  let { count = 7 } = $props<{ count?: number }>();
  // Read once at init to build a static placeholder array — intentional.
  // svelte-ignore state_referenced_locally
  const placeholders = Array.from({ length: count });
</script>

<section class="row-section" aria-hidden="true">
  <div class="row-header">
    <div class="sk-title shimmer"></div>
  </div>
  <div class="row-scroll">
    {#each placeholders as _}
      <SkeletonCard />
    {/each}
  </div>
</section>

<style>
  .row-section {
    margin-bottom: 1.75rem;
  }
  .row-header {
    padding: 0 1rem;
    margin-bottom: 0.65rem;
  }
  .sk-title {
    height: 1.1rem;
    width: 180px;
    border-radius: 4px;
  }
  .row-scroll {
    display: flex;
    gap: 0.85rem;
    overflow: hidden;
    padding: 0.5rem 1rem 0.85rem;
  }

  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.04) 30%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.04) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .row-section {
      margin-bottom: 1.35rem;
    }
    .row-header {
      padding: 0 0.85rem;
      margin-bottom: 0.55rem;
    }
    .sk-title {
      width: 140px;
      height: 1rem;
    }
    .row-scroll {
      gap: 0.7rem;
      padding: 0.4rem 0.85rem 0.75rem;
    }
  }
  @media (max-width: 480px) {
    .row-section {
      margin-bottom: 1.15rem;
    }
    .row-header {
      padding: 0 0.7rem;
      margin-bottom: 0.45rem;
    }
    .sk-title {
      width: 120px;
      height: 0.95rem;
    }
    .row-scroll {
      gap: 0.65rem;
      padding: 0.35rem 0.7rem 0.7rem;
    }
  }
</style>
