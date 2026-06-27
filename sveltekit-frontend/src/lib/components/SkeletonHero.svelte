<script lang="ts">
  // Static placeholder — no props needed.
</script>

<div class="sk-hero shimmer" aria-hidden="true">
  <div class="sk-hero-content">
    <div class="sk-badge shimmer-dark"></div>
    <div class="sk-title shimmer-dark"></div>
    <div class="sk-title short shimmer-dark"></div>
    <div class="sk-line shimmer-dark"></div>
    <div class="sk-line shimmer-dark"></div>
    <div class="sk-actions">
      <div class="sk-btn shimmer-dark"></div>
      <div class="sk-btn ghost shimmer-dark"></div>
    </div>
  </div>
</div>

<style>
  .sk-hero {
    position: relative;
    width: 100%;
    height: 70vh;
    min-height: 500px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }
  .sk-hero-content {
    position: relative;
    z-index: 2;
    max-width: 800px;
    padding: 0 4% 6vh;
    width: 100%;
  }
  .sk-badge {
    width: 120px;
    height: 22px;
    border-radius: 6px;
    margin-bottom: 1.25rem;
  }
  .sk-title {
    width: 60%;
    height: 2.4rem;
    border-radius: 8px;
    margin-bottom: 0.6rem;
  }
  .sk-title.short { width: 40%; margin-bottom: 1.25rem; }
  .sk-line {
    width: 80%;
    height: 0.9rem;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }
  .sk-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  .sk-btn {
    width: 140px;
    height: 44px;
    border-radius: 8px;
  }
  .sk-btn.ghost { width: 120px; }

  .shimmer {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.03) 30%,
      rgba(255, 255, 255, 0.07) 50%,
      rgba(255, 255, 255, 0.03) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }
  .shimmer-dark {
    background: linear-gradient(
      100deg,
      rgba(255, 255, 255, 0.06) 30%,
      rgba(255, 255, 255, 0.14) 50%,
      rgba(255, 255, 255, 0.06) 70%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer, .shimmer-dark { animation: none; }
  }

  @media (max-width: 768px) {
    .sk-hero { height: 60vh; min-height: 420px; }
    .sk-title { width: 80%; height: 1.8rem; }
    .sk-btn { width: 120px; height: 40px; }
  }
</style>
