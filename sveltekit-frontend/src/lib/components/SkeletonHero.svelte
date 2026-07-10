<script lang="ts">
  // Static placeholder — no props needed.
</script>

<div class="sk-hero shimmer" aria-hidden="true">
  <div class="sk-hero-content">
    <div class="sk-pills">
      <div class="sk-pill shimmer-dark"></div>
      <div class="sk-pill short shimmer-dark"></div>
      <div class="sk-pill short shimmer-dark"></div>
    </div>
    <div class="sk-title shimmer-dark"></div>
    <div class="sk-title short shimmer-dark"></div>
    <div class="sk-line shimmer-dark"></div>
    <div class="sk-line mid shimmer-dark"></div>
    <div class="sk-actions">
      <div class="sk-btn shimmer-dark"></div>
      <div class="sk-btn-circle shimmer-dark"></div>
    </div>
  </div>
  <div class="sk-dots" aria-hidden="true">
    <span></span><span class="wide"></span><span></span>
  </div>
</div>

<style>
  .sk-hero {
    position: relative;
    width: 100%;
    height: min(68vh, 720px);
    min-height: 380px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }
  .sk-hero-content {
    position: relative;
    z-index: 2;
    max-width: 720px;
    padding: 2.5rem 3rem 3.75rem;
    width: 100%;
  }
  .sk-pills {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.85rem;
  }
  .sk-pill {
    width: 72px;
    height: 24px;
    border-radius: 999px;
  }
  .sk-pill.short {
    width: 52px;
  }
  .sk-title {
    width: 62%;
    height: 2.4rem;
    border-radius: 8px;
    margin-bottom: 0.55rem;
  }
  .sk-title.short {
    width: 40%;
    height: 1.6rem;
    margin-bottom: 0.9rem;
  }
  .sk-line {
    width: 78%;
    height: 0.85rem;
    border-radius: 4px;
    margin-bottom: 0.45rem;
  }
  .sk-line.mid {
    width: 58%;
    margin-bottom: 1.1rem;
  }
  .sk-actions {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    margin-top: 0.25rem;
  }
  .sk-btn {
    width: 148px;
    height: 48px;
    border-radius: 999px;
  }
  .sk-btn-circle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
  }
  .sk-dots {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.35rem;
    z-index: 2;
  }
  .sk-dots span {
    display: block;
    width: 16px;
    height: 3px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
  }
  .sk-dots span.wide {
    width: 28px;
    background: rgba(255, 255, 255, 0.22);
  }

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
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shimmer,
    .shimmer-dark {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .sk-hero {
      height: min(78dvh, 620px);
      min-height: 420px;
    }
    .sk-hero-content {
      padding: 1.25rem 1rem 4.25rem;
    }
    .sk-title {
      width: 78%;
      height: 1.9rem;
    }
    .sk-title.short {
      width: 48%;
      height: 1.35rem;
    }
    .sk-btn {
      width: 132px;
      height: 46px;
    }
    .sk-btn-circle {
      width: 46px;
      height: 46px;
    }
  }

  @media (max-width: 480px) {
    .sk-hero {
      height: min(82dvh, 560px);
      min-height: 400px;
    }
    .sk-hero-content {
      padding: 1rem 0.9rem 4.1rem;
    }
  }
</style>
