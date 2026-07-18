<script lang="ts">
  import AnimeCard from "./AnimeCard.svelte";
  let { title, items = [], href = "", eyebrow = "", showRank = false } = $props<{title:string;items:any[];href?:string;eyebrow?:string;showRank?:boolean}>();
  let rail: HTMLDivElement | undefined = $state();
  let uniqueItems = $derived.by(()=>{
    const seen=new Set<string>();
    return items.map((item:any)=>{
      const entry=item?.entry||item?.media||item;
      if(!entry) return null;
      return item?.entry ? {...entry,relationType:item.relation||item.relationType} : entry;
    }).filter((anime:any)=>{
      const id=anime?.id||anime?.mal_id;
      if(!id||seen.has(String(id))) return false;
      seen.add(String(id));
      return true;
    });
  });
  function scrollBy(direction:number){rail?.scrollBy({left:direction*(rail.clientWidth*.86),behavior:"smooth"})}
</script>

{#if uniqueItems.length}
<section class="row-section" class:ranked={showRank}>
  <header class="row-header">
    <div>{#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}<h2>{title}</h2><small>{uniqueItems.length} titles</small></div>
    {#if href}<a {href}>Open index <span aria-hidden="true">↗</span></a>{/if}
  </header>
  <div class="row-wrapper">
    <button class="arrow left" onclick={()=>scrollBy(-1)} aria-label="Scroll {title} left">‹</button>
    <div class="row-scroll" bind:this={rail}>{#each uniqueItems as anime,i (anime.id||anime.mal_id||`${title}-${i}`)}<div class="card-slot"><AnimeCard {anime} rank={showRank?i+1:0}/></div>{/each}</div>
    <button class="arrow right" onclick={()=>scrollBy(1)} aria-label="Scroll {title} right">›</button>
  </div>
</section>
{/if}

<style>
  .row-section{position:relative;margin:0 0 3.5rem;color:var(--editorial-text,#f1ece4)}.row-section.ranked{padding-top:1.1rem;border-top:1px solid var(--editorial-line,#28231f)}
  .row-header{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin:0 0 1rem;padding:0}.row-header>div{display:grid;grid-template-columns:auto auto;align-items:baseline;gap:.35rem 1rem}.eyebrow{grid-column:1/-1;color:var(--editorial-accent,#df886b);font-size:.64rem;font-weight:850;letter-spacing:.12em;text-transform:uppercase}.row-header h2{margin:0;font:800 clamp(1.25rem,2vw,1.8rem)/1 var(--net-display-font,system-ui);letter-spacing:-.035em}.row-header small{color:#68615a;font-size:.66rem}.row-header>a{color:#bbb3aa;font-size:.76rem;font-weight:750;text-decoration:none}.row-header>a:hover{color:var(--editorial-accent-hover,#f1a287)}
  .row-wrapper{position:relative}.row-scroll{display:flex;gap:1rem;overflow-x:auto;padding:.25rem 0 .9rem;scroll-snap-type:x proximity;scrollbar-width:none;-ms-overflow-style:none}.row-scroll::-webkit-scrollbar{display:none;width:0;height:0}.card-slot{flex:0 0 clamp(150px,12.5vw,190px);min-width:0;scroll-snap-align:start}
  .arrow{position:absolute;top:36%;z-index:5;width:34px;height:62px;border:1px solid #3a332e;border-radius:3px;background:#0c0b0a;color:#d9d1c7;font-size:1.5rem;cursor:pointer;opacity:0;transition:opacity .15s,background .15s}.row-wrapper:hover .arrow,.arrow:focus-visible{opacity:1}.arrow:hover{background:#1a1613;color:#f1a287}.left{left:0}.right{right:0}
  @media(max-width:768px){.row-section{margin-bottom:2.5rem}.row-header{align-items:start}.row-header>div{grid-template-columns:1fr}.row-header small{display:none}.card-slot{flex-basis:clamp(142px,40vw,178px)}.arrow{display:none}}
</style>