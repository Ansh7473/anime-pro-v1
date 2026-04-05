<script lang="ts">
  import { onMount } from "svelte";
  
  let { children } = $props();
  
  let startY = 0;
  let pulling = $state(false);
  let refreshing = $state(false);
  let pullDistance = $state(0);
  const THRESHOLD = 80;
  
  function handleTouchStart(e: TouchEvent) {
    if (window.scrollY > 5 || refreshing) return;
    startY = e.touches[0].pageY;
    pulling = true;
  }
  
  function handleTouchMove(e: TouchEvent) {
    if (!pulling || refreshing) return;
    const currentY = e.touches[0].pageY;
    const diff = currentY - startY;
    
    if (diff > 0 && window.scrollY <= 5) {
      // Resistance effect
      pullDistance = Math.min(diff * 0.45, THRESHOLD + 20);
      
      // Prevent default browser behavior (only if we're actually starting to pull)
      if (pullDistance > 5 && e.cancelable) {
        e.preventDefault();
      }
    } else if (diff < 0) {
      pulling = false;
      pullDistance = 0;
    }
  }
  
  function handleTouchEnd() {
    if (!pulling || refreshing) return;
    
    if (pullDistance >= THRESHOLD) {
      startRefresh();
    } else {
      reset();
    }
  }
  
  function startRefresh() {
    refreshing = true;
    pullDistance = THRESHOLD;
    
    // Smooth visual feedback before reload
    setTimeout(() => {
      window.location.reload();
    }, 800);
  }
  
  function reset() {
    pulling = false;
    refreshing = false;
    pullDistance = 0;
  }
</script>

<div 
  class="pull-to-refresh-container"
  role="presentation"
  ontouchstart={handleTouchStart}
  ontouchmove={handleTouchMove}
  ontouchend={handleTouchEnd}
>
  {#if pullDistance > 0 || refreshing}
    <div 
      class="pull-indicator" 
      style:transform="translateY({pullDistance - 60}px)"
      style:opacity={Math.min(pullDistance / (THRESHOLD * 0.5), 1)}
    >
      <div class="indicator-content" class:refreshing>
        {#if refreshing}
          <div class="scanning-line"></div>
          <span class="sync-text">SYNCING...</span>
        {:else}
          <div class="pull-icon" style:transform="rotate({Math.min((pullDistance / THRESHOLD) * 180, 180)}deg)">
             ↓
          </div>
          <div class="progress-ring">
            <svg viewBox="0 0 36 36">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="rgba(255, 255, 255, 0.05)"
                stroke-width="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#e50914"
                stroke-width="3"
                stroke-dasharray="{Math.min((pullDistance / THRESHOLD) * 100, 100)}, 100"
                stroke-linecap="round"
              />
            </svg>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <div 
    class="content-wrapper" 
    style:transform="translateY({pullDistance * 0.6}px)"
    style:transition={pullDistance === 0 ? "transform 0.3s cubic-bezier(0.2, 1, 0.3, 1)" : "none"}
  >
    {@render children()}
  </div>
</div>

<style>
  .pull-to-refresh-container {
    position: relative;
    width: 100%;
    min-height: 100%;
    overflow: hidden;
    touch-action: pan-x pan-y;
  }

  .pull-indicator {
    position: fixed;
    top: 60px; /* Offset from fixed navbar if needed, but translateY handles it */
    left: 0;
    right: 0;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    pointer-events: none;
    will-change: transform, opacity;
  }

  .indicator-content {
    background: rgba(10, 10, 12, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(12px);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8), 0 0 20px rgba(229, 9, 20, 0.15);
    position: relative;
    overflow: hidden;
    transition: width 0.3s ease, border-radius 0.3s ease;
  }

  .indicator-content.refreshing {
    width: 130px;
    border-radius: 12px;
  }

  .sync-text {
    font-size: 0.7rem;
    font-weight: 900;
    letter-spacing: 0.15em;
    color: #e50914;
    text-shadow: 0 0 8px rgba(229, 9, 20, 0.5);
    animation: pulse 1s infinite alternate;
  }

  @keyframes pulse {
    from { opacity: 0.6; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }

  .scanning-line {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, #e50914, transparent);
    animation: scan 1.5s infinite linear;
    box-shadow: 0 0 12px #e50914;
    z-index: 1;
  }

  @keyframes scan {
    0% { transform: translateY(-5px); }
    50% { transform: translateY(45px); }
    100% { transform: translateY(-5px); }
  }

  .pull-icon {
    font-size: 1.2rem;
    color: white;
    font-weight: 700;
    z-index: 2;
  }

  .progress-ring {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 3px;
    z-index: 1;
  }

  .content-wrapper {
    will-change: transform;
    pointer-events: auto;
  }
</style>
