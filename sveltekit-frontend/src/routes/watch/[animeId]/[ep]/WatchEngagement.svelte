<script lang="ts">
  import { MessageSquare } from "lucide-svelte";
  import ReactionsBar from "$lib/components/ReactionsBar.svelte";

  let {
    animeId = '',
    ep = 1,
  }: {
    animeId?: string | number;
    ep?: number;
  } = $props();

  function scrollToComments() {
    document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' });
  }
</script>

<div class="engagement-strip">
  <div class="engagement-copy">
    <span class="engagement-kicker">EPISODE PULSE</span>
    <strong>React while you watch</strong>
  </div>
  <div class="engagement-actions">
    <ReactionsBar animeId={String(animeId)} episode={ep} />
    <button class="comment-jump-btn" onclick={scrollToComments}>
      <MessageSquare size={16} /> Show Comments
    </button>
  </div>
</div>

<style>
  .engagement-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.2rem 1.5rem;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.05);
    background: rgba(14, 14, 20, 0.5);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .engagement-copy {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }
  .engagement-kicker {
    font-size: 0.6rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(255, 255, 255, 0.35);
  }
  .engagement-copy strong {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.8);
  }

  .engagement-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.65rem;
  }

  .comment-jump-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.85rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: rgba(255, 255, 255, 0.65);
    font-family: inherit;
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
  }
  .comment-jump-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
  }

  @media (max-width: 640px) {
    .engagement-strip {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
