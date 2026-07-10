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
    border-radius: 12px;
  }
  .sk-card.small {
    width: 130px;
  }
  .sk-card.large {
    width: 220px;
  }

  .sk-img {
    aspect-ratio: 2 / 3;
    width: 100%;
    border-radius: 12px;
    border: 1.5px solid rgba(255, 255, 255, 0.06);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
  }
  .sk-line {
    height: 0.7rem;
    border-radius: 4px;
    margin-top: 0.55rem;
  }
  .sk-line.short {
    width: 62%;
    margin-top: 0.35rem;
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
    .sk-card {
      width: clamp(148px, 41vw, 188px);
    }
    .sk-card.small {
      width: clamp(120px, 34vw, 150px);
    }
    .sk-card.large {
      width: clamp(170px, 48vw, 210px);
    }
    .sk-img {
      border-radius: 11px;
    }
  }
  @media (max-width: 480px) {
    .sk-card {
      width: clamp(132px, 42.5vw, 168px);
    }
    .sk-card.small {
      width: clamp(110px, 36vw, 140px);
    }
    .sk-card.large {
      width: clamp(148px, 48vw, 180px);
    }
    .sk-img {
      border-radius: 10px;
    }
    .sk-line {
      height: 0.62rem;
    }
  }
  @media (max-width: 360px) {
    .sk-card {
      width: 42vw;
    }
  }
</style>
