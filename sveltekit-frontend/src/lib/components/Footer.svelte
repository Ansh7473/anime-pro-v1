<script lang="ts">
  const currentYear = new Date().getFullYear();
  const groups = [
    { title: "Browse", links: [["Explore", "/explore"], ["Latest", "/latest"], ["Schedule", "/schedule"], ["Movies", "/movies"], ["Films", "/films"], ["TV series", "/tv-series"]] },
    { title: "Account", links: [["Profile", "/profile"], ["Watchlist", "/watchlist"], ["Favorites", "/favorites"], ["Download apps", "/download"]] },
    { title: "Information", links: [["About", "/about"], ["Contact", "/contact"], ["Privacy", "/privacy"], ["Terms", "/terms"], ["DMCA", "/dmca"], ["FAQ", "/faq"]] },
  ];
</script>

<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <p class="edition">WatchAnimeX</p>
      <h2>Keep the next episode close.</h2>
      <p>Browse seasonal anime, check airing times, and return to saved progress from one focused catalog.</p>
      <a href="https://discord.gg/7v6ZzkJpXV" target="_blank" rel="noopener noreferrer">Community and support ↗</a>
    </div>
    {#each groups as group}
      <nav aria-label={group.title}>
        <h3>{group.title}</h3>
        {#each group.links as link}<a href={link[1]}>{link[0]} <span aria-hidden="true">↗</span></a>{/each}
      </nav>
    {/each}
  </div>
  <div class="footer-base"><div><span>© {currentYear} WatchAnimeX</span><span>Anime information and artwork belong to their respective owners.</span></div></div>
</footer>

<style>
  .site-footer{position:relative;z-index:10;margin-top:0;background:var(--editorial-bg, #090807);color:var(--editorial-text,#f1ece4);border-top:1px solid var(--editorial-line,#28231f)}
  .footer-inner,.footer-base>div{width:100%;max-width:var(--page-max,1500px);margin:auto;padding-left:max(var(--page-gutter,2.5rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter,2.5rem),env(safe-area-inset-right));box-sizing:border-box}
  .footer-inner{display:grid;grid-template-columns:minmax(280px,1.7fr) repeat(3,minmax(130px,.7fr));gap:clamp(2rem,5vw,6rem);padding-top:4rem;padding-bottom:4rem}
  .edition,nav h3{margin:0 0 1.2rem;color:var(--editorial-muted, #766f67);font-size:.68rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
  .footer-brand h2{max-width:12ch;margin:0 0 1rem;font:800 clamp(1.7rem,2.8vw,2.8rem)/1.02 var(--net-display-font,system-ui);letter-spacing:-.045em}
  .footer-brand>p:not(.edition){max-width:44ch;margin:0 0 1.25rem;color:var(--editorial-muted,#918a82);font-size:.84rem;line-height:1.65}
  a{color:var(--editorial-text, #bab2a8);text-decoration:none}a:hover{color:var(--editorial-accent-hover,#f1a287)}.footer-brand>a{font-size:.78rem;font-weight:750}
  nav{display:flex;flex-direction:column;align-items:flex-start}nav a{width:100%;display:flex;justify-content:space-between;padding:.58rem 0;border-bottom:1px solid var(--editorial-line, #211d1a);font-size:.78rem}nav a span{color:var(--editorial-muted, #58514b)}
  .footer-base{border-top:1px solid var(--editorial-line, #211d1a)}.footer-base>div{min-height:64px;display:flex;justify-content:space-between;align-items:center;gap:1rem;color:var(--editorial-muted, #69635c);font-size:.67rem}.footer-base>div span:last-child{text-align:right}
  @media(max-width:900px){.footer-inner,.footer-base>div{padding-left:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-md,1.25rem),env(safe-area-inset-right))}.footer-inner{grid-template-columns:repeat(3,1fr)}.footer-brand{grid-column:1/-1}}
  @media(max-width:640px){.site-footer{padding-bottom:calc(64px + env(safe-area-inset-bottom))}.footer-inner,.footer-base>div{padding-left:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-left));padding-right:max(var(--page-gutter-sm,.85rem),env(safe-area-inset-right))}.footer-inner{grid-template-columns:1fr;gap:2rem;padding-block:3rem}.footer-brand{grid-column:auto}.footer-base>div{align-items:flex-start;flex-direction:column;justify-content:center;padding-block:1rem}.footer-base>div span:last-child{text-align:left}}
</style>