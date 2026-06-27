<script lang="ts">
  let { size = "normal" } = $props<{ size?: "small" | "normal" | "large" }>();
</script>

<div class="sk-card" class:small={size === "small"} class:large={size === "large"} aria-hidden="true">
  <div class="sk-img shimmer"></div>
  <div class="sk-line shimmer"></div>
  <div class="sk-line short shimmer"></div>
</div>

<style>
  .sk-card {
    flex-shrink: 0;
    width: 160px;
    border-radius: var(--radius-lg);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    padding: 6px;
  }
  .sk-card.small { width: 130px; }
  .sk-card.large { width: 220px; }

  .sk-img {
    aspect-ratio: 2 / 3;
    width: 100%;
    border-radius: calc(var(--radius-lg) - 2px);
  }
  .sk-line {
    height: 0.7rem;
    border-radius: 4px;
    margin-top: 0.5rem;
  }
  .sk-line.short {
    width: 60%;
  }

  /* Shimmer effect — GPU-friendly background animation */
  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.04) 30%,
      rgba(255, 255, 255, 0.10) 50%,
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

  @media (max-width: 768px) {
    .sk-card { width: 140px; padding: 4px; }
    .sk-card.small { width: 110px; }
    .sk-card.large { width: 180px; }
  }
  @media (max-width: 480px) {
    .sk-card { width: 110px; }
    .sk-card.small { width: 95px; }
    .sk-card.large { width: 140px; }
  }
</style>
