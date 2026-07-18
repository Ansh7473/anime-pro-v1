<script lang="ts">
  import { auth, logoutUser } from "$lib/stores/auth";
  import { isTV } from "$lib/stores/device";
  import { goto } from "$app/navigation";
  import { Settings, User, Search, Tags, Bookmark, Heart, LogOut, Smartphone } from "lucide-svelte";

  const destinations = [
    { label: "TV profile", description: "View your signed-in account and activity", href: "/tv/profile", icon: User },
    { label: "Search", description: "Find an anime by title", href: "/tv/search", icon: Search },
    { label: "Genres", description: "Browse the catalog by story type", href: "/tv/genres", icon: Tags },
    { label: "Watchlist", description: "Open titles saved to your watchlist", href: "/watchlist", icon: Bookmark },
    { label: "Favorites", description: "Open your favorite titles", href: "/favorites", icon: Heart },
  ];

  function openDestination(href: string) {
    if ((href === "/tv/profile" || href === "/watchlist" || href === "/favorites") && !$auth.token) {
      goto(`/auth/login?redirect=${encodeURIComponent(href)}`);
      return;
    }
    goto(href);
  }
  function handleExitTV() { isTV.set(false); document.body.classList.remove("tv-mode"); goto("/"); }
  function handleLogout() { logoutUser(); goto("/tv"); }
</script>

<svelte:head><title>TV Settings — WatchAnimeX</title></svelte:head>
<div class="tv-settings-page">
  <header class="settings-header"><Settings size={32} /><div><p>TV MODE</p><h1>Settings</h1></div></header>
  <div class="settings-grid">
    <main class="settings-list">
      <section class="settings-group"><h2>Browse and account</h2><div class="options-container">
        {#each destinations as item}<button class="settings-option" onclick={() => openDestination(item.href)}><item.icon size={22}/><span><b>{item.label}</b><small>{item.description}</small></span><i aria-hidden="true">→</i></button>{/each}
      </div></section>
      <section class="settings-group"><h2>Session</h2><div class="options-container">
        <button class="settings-option" onclick={handleExitTV}><Smartphone size={22}/><span><b>Exit TV mode</b><small>Return to the standard web interface</small></span><i aria-hidden="true">→</i></button>
        {#if $auth.user}<button class="settings-option danger" onclick={handleLogout}><LogOut size={22}/><span><b>Sign out</b><small>End the current WatchAnimeX session</small></span><i aria-hidden="true">→</i></button>{/if}
      </div></section>
    </main>
    <aside class="session-panel"><span>SESSION</span><h2>{$auth.user ? "Signed in" : "Guest mode"}</h2><p>{$auth.user?.email || "Sign in to sync account collections."}</p><small>Playback options are selected in the player when a source provides them.</small></aside>
  </div>
</div>
<style>
  .tv-settings-page{max-width:1220px;margin:0 auto;padding:1rem 0 4rem;color:#f1ece4}.settings-header{display:flex;align-items:center;gap:1.2rem;margin-bottom:3rem}.settings-header p,.session-panel>span{margin:0 0 .35rem;color:#df886b;font-size:.72rem;font-weight:800;letter-spacing:.16em}.settings-header h1{font-size:3rem;line-height:1;margin:0}.settings-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:3rem}.settings-group{margin-bottom:2.5rem}.settings-group h2{margin:0 0 1rem;color:#a79f96;font-size:.8rem;letter-spacing:.14em;text-transform:uppercase}.options-container{display:flex;flex-direction:column;border-top:1px solid #2a2521}.settings-option{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:1rem;width:100%;min-height:84px;padding:1rem 1.25rem;border:0;border-bottom:1px solid #2a2521;background:#0d0c0b;color:#f1ece4;text-align:left;cursor:pointer}.settings-option:hover,.settings-option:focus-visible{background:#171310;outline:2px solid #df886b;outline-offset:-2px}.settings-option span{display:flex;flex-direction:column;gap:.35rem}.settings-option b{font-size:1.12rem}.settings-option small,.session-panel p,.session-panel small{color:#918a82;font-style:normal}.settings-option i{font-style:normal;color:#df886b}.settings-option.danger{color:#efa086}.session-panel{align-self:start;padding:2rem;border:1px solid #2a2521;background:#0d0c0b}.session-panel h2{margin:.4rem 0 1rem;font-size:1.6rem}.session-panel p{overflow-wrap:anywhere}.session-panel small{display:block;margin-top:2rem;padding-top:1rem;border-top:1px solid #2a2521;line-height:1.6}@media(max-width:900px){.settings-grid{grid-template-columns:1fr}.session-panel{order:-1}.settings-header h1{font-size:2.3rem}}@media(prefers-reduced-motion:reduce){.settings-option{scroll-behavior:auto}}
</style>