<script lang="ts">
  import TVAnimeCard from "./TVAnimeCard.svelte";
  let { title, items = [] } = $props<{title:string;items:any[]}>();
  let uniqueItems=$derived.by(()=>{const seen=new Set();return items.filter((anime:any)=>{const id=anime.id||anime.mal_id;if(!id)return true;if(seen.has(id))return false;seen.add(id);return true})});
</script>
{#if uniqueItems.length}
<section class="tv-row-section">
  <header><h2>{title}</h2><span>{uniqueItems.length} titles</span></header>
  <div class="tv-row-scroll" role="list">{#each uniqueItems as anime,i (anime.id||anime.mal_id||`${title}-${i}`)}<TVAnimeCard {anime}/>{/each}</div>
</section>
{/if}
<style>
  .tv-row-section{margin-bottom:4rem;border-top:1px solid #2b2521;padding-top:1.4rem}header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:1rem}h2{margin:0;color:#f2ece4;font-size:2rem;font-weight:850;letter-spacing:-.035em}header span{color:#746d65;font-size:.8rem;text-transform:uppercase;letter-spacing:.1em}.tv-row-scroll{display:flex;gap:1.5rem;overflow-x:auto;padding:1rem .5rem 1.6rem;scroll-padding-inline:.5rem;scrollbar-width:thin;scrollbar-color:#4a4039 transparent}.tv-row-scroll :global(.tv-card:focus-visible){scroll-margin-inline:3rem}
</style>