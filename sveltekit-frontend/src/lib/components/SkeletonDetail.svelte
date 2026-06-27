<script lang="ts">
  // Static placeholder for the anime detail header while it loads (client nav).
</script>

<div class="sk-banner shimmer" aria-hidden="true"></div>
<div class="sk-content container" aria-hidden="true">
  <div class="sk-grid">
    <div class="sk-poster shimmer"></div>
    <div class="sk-info">
      <div class="sk-title shimmer"></div>
      <div class="sk-sub shimmer"></div>
      <div class="sk-tags">
        {#each Array(4) as _, i (i)}<div class="sk-tag shimmer"></div>{/each}
      </div>
      <div class="sk-line shimmer"></div>
      <div class="sk-line shimmer"></div>
      <div class="sk-line short shimmer"></div>
      <div class="sk-actions">
        <div class="sk-btn shimmer"></div>
        <div class="sk-btn ghost shimmer"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .sk-banner {
    width: 100%;
    height: 45vh;
  }
  .sk-content {
    margin-top: -8rem;
    position: relative;
    z-index: 2;
  }
  .sk-grid {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 2rem;
  }
  .sk-poster {
    width: 100%;
    aspect-ratio: 2 / 3;
    border-radius: var(--radius-xl, 16px);
  }
  .sk-info { padding-top: 8rem; }
  .sk-title { width: 55%; height: 2rem; border-radius: 8px; }
  .sk-sub { width: 30%; height: 0.9rem; border-radius: 4px; margin-top: 0.6rem; }
  .sk-tags { display: flex; gap: 0.5rem; margin-top: 0.9rem; }
  .sk-tag { width: 56px; height: 22px; border-radius: 4px; }
  .sk-line { width: 90%; height: 0.85rem; border-radius: 4px; margin-top: 0.7rem; }
  .sk-line.short { width: 60%; }
  .sk-actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
  .sk-btn { width: 160px; height: 44px; border-radius: 8px; }
  .sk-btn.ghost { width: 130px; }

  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.05) 30%,
      rgba(255, 255, 255, 0.11) 50%,
      rgba(255, 255, 255, 0.05) 70%
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

  @media (max-width: 1024px) {
    .sk-grid { grid-template-columns: 180px 1fr; gap: 1.5rem; }
    .sk-banner { height: 40vh; }
    .sk-content { margin-top: -6rem; }
    .sk-info { padding-top: 6rem; }
  }
  @media (max-width: 768px) {
    .sk-grid { grid-template-columns: 140px 1fr; gap: 1rem; }
    .sk-banner { height: 35vh; }
    .sk-content { margin-top: -5rem; }
    .sk-info { padding-top: 5rem; }
    .sk-title { width: 80%; }
  }
  @media (max-width: 480px) {
    .sk-grid { grid-template-columns: 1fr; }
    .sk-poster { max-width: 200px; margin: 0 auto; }
    .sk-info { padding-top: 1rem; }
  }
</style>
