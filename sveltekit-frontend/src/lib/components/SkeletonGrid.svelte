<script lang="ts">
  // Renders `count` skeleton cards as direct grid items (no wrapper element),
  // so it drops straight into an existing CSS grid container (.anime-grid / .grid).
  let { count = 18 } = $props<{ count?: number }>();
  // svelte-ignore state_referenced_locally
  const placeholders = Array.from({ length: count });
</script>

{#each placeholders as _, i (i)}
  <div class="sk-grid-card" aria-hidden="true">
    <div class="sk-img shimmer"></div>
    <div class="sk-line shimmer"></div>
    <div class="sk-line short shimmer"></div>
  </div>
{/each}

<style>
  .sk-grid-card {
    border-radius: 12px;
    min-width: 0;
  }
  .sk-img {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: 12px;
    border: 1.5px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }
  .sk-line {
    height: 0.7rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }
  .sk-line.short {
    width: 60%;
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
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer { animation: none; }
  }
</style>
