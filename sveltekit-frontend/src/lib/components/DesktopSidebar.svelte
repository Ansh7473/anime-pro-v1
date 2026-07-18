<script lang="ts">
  import { page } from "$app/state";
  import { Home, CalendarDays, Compass, Clock3, Film, Tv, Bookmark, Heart, Menu } from "lucide-svelte";

  let expanded = $state(false);

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/schedule", label: "Schedule", icon: CalendarDays },
    { href: "/explore", label: "Browse", icon: Compass },
    { href: "/latest", label: "Latest", icon: Clock3 },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/tv-series", label: "TV series", icon: Tv },
    { href: "/watchlist", label: "Watchlist", icon: Bookmark },
    { href: "/favorites", label: "Favorites", icon: Heart },
  ];

  const active = (href: string) => href === "/" ? page.url.pathname === "/" : page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);

</script>

<aside class="desk-rail" class:expanded aria-label="Catalog navigation">
  <button class="rail-toggle" type="button" onclick={() => expanded = !expanded} aria-expanded={expanded} aria-label={expanded ? "Collapse catalog navigation" : "Expand catalog navigation"}>
    <Menu size={19} /><span>Catalog</span>
  </button>
  <nav>
    {#each links as item}
      <a href={item.href} class:active={active(item.href)} aria-label={item.label} title={item.label}>
        <item.icon size={18} /><span>{item.label}</span>
      </a>
    {/each}
  </nav>
  <p><b>WatchAnimeX</b></p>
</aside>

<style>
  .desk-rail {
    position: fixed;
    z-index: 900;
    top: 64px;
    bottom: 0;
    left: 0;
    width: var(--desk-rail-width, 68px);
    display: flex;
    flex-direction: column;
    background: #090807;
    border-right: 1px solid #28231f;
    overflow: hidden;
    transition: width .18s ease;
  }
  .desk-rail.expanded,
  .desk-rail:hover,
  .desk-rail:focus-within { width: 216px; }
  .rail-toggle,
  nav a {
    width: 100%;
    min-height: 52px;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0 23px;
    border: 0;
    border-bottom: 1px solid #201c19;
    background: transparent;
    color: #8e8780;
    text-decoration: none;
    white-space: nowrap;
  }
  .rail-toggle :global(svg),
  nav a :global(svg) { width: 19px; min-width: 19px; flex: 0 0 19px; }
  .rail-toggle { color: #c6beb5; cursor: pointer; }
  .rail-toggle span,
  nav a span,
  .desk-rail p b { opacity: 0; transition: opacity .1s; }
  .desk-rail.expanded :is(.rail-toggle span,nav a span,.desk-rail p b),
  .desk-rail:hover :is(.rail-toggle span,nav a span,.desk-rail p b),
  .desk-rail:focus-within :is(.rail-toggle span,nav a span,.desk-rail p b) { opacity: 1; }
  .rail-toggle:hover,
  nav a:hover { background: #151210; color: #f1ece4; }
  nav a.active { color: #efa086; box-shadow: inset 2px 0 #df886b; }
  .desk-rail p { margin-top: auto; padding: 1rem 23px; color: #c9c2ba; white-space: nowrap; }
  .desk-rail p b { display: block; font-size: .72rem; font-weight: 800; letter-spacing: -.02em; }
  @media(max-width:1024px) { .desk-rail { display: none; } }
  @media(prefers-reduced-motion:reduce) { .desk-rail { transition: none; } }
</style>