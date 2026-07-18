<script lang="ts">
  import { auth, logoutUser } from "$lib/stores/auth";
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { Settings, LogOut, Mail, Bookmark, Heart, Play } from "lucide-svelte";

  let stats = $state<any>(null);
  let loading = $state(true);
  let error = $state("");
  const valueOf = (keys: string[]) => { for (const key of keys) if (stats?.[key] != null) return stats[key]; return "Not available"; };

  onMount(async () => {
    if (!$auth.token) { await goto("/auth/login?redirect=/tv/profile"); return; }
    try { stats = await api.getUserStats($auth.token); }
    catch { error = "Account activity could not be loaded."; }
    finally { loading = false; }
  });
  function handleLogout() { logoutUser(); goto("/tv"); }
</script>

<svelte:head><title>TV Profile — WatchAnimeX</title></svelte:head>
<div class="tv-profile-page">
  <header class="profile-header"><div class="avatar" aria-hidden="true">{($auth.user?.email || "W").charAt(0).toUpperCase()}</div><div><p>TV PROFILE</p><h1>{$auth.user?.email?.split("@")[0] || "WatchAnimeX viewer"}</h1><span><Mail size={16}/>{$auth.user?.email || "No account connected"}</span></div></header>
  {#if loading}<p class="state">Loading account activity…</p>{:else if error}<p class="state error">{error}</p>{:else}
    <section class="activity"><h2>Account activity</h2><div class="stats">
      <div><Play size={22}/><span>Episodes watched</span><strong>{valueOf(["episodesWatched","watchedEpisodes","episodes_watched"])}</strong></div>
      <div><Bookmark size={22}/><span>Watchlist</span><strong>{valueOf(["watchlistCount","watchlist_count"])}</strong></div>
      <div><Heart size={22}/><span>Favorites</span><strong>{valueOf(["favoritesCount","favorites_count"])}</strong></div>
    </div></section>
  {/if}
  <div class="actions"><button onclick={() => goto("/tv/settings")}><Settings size={20}/>TV settings</button><button class="logout" onclick={handleLogout}><LogOut size={20}/>Sign out</button></div>
</div>
<style>
  .tv-profile-page{max-width:1180px;margin:0 auto;padding:1rem 0 5rem;color:#f1ece4}.profile-header{display:flex;align-items:center;gap:2rem;padding:2.5rem 0 3rem;border-bottom:1px solid #2a2521}.avatar{display:grid;place-items:center;width:130px;height:130px;background:#df886b;color:#170c09;font-size:4rem;font-weight:900}.profile-header p{margin:0 0 .5rem;color:#df886b;font-size:.72rem;font-weight:800;letter-spacing:.16em}.profile-header h1{margin:0 0 .75rem;font-size:clamp(2.2rem,5vw,4rem)}.profile-header span{display:flex;align-items:center;gap:.5rem;color:#918a82}.activity{padding:3rem 0}.activity h2{margin:0 0 1.25rem;font-size:1rem;letter-spacing:.12em;text-transform:uppercase}.stats{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid #2a2521;border-left:1px solid #2a2521}.stats div{display:grid;grid-template-columns:auto 1fr;gap:.75rem;padding:1.5rem;border-right:1px solid #2a2521;border-bottom:1px solid #2a2521;background:#0d0c0b}.stats span{color:#918a82}.stats strong{grid-column:1/-1;font-size:1.8rem}.state{margin:3rem 0;padding:1.5rem;border:1px solid #2a2521;background:#0d0c0b}.state.error{color:#efa086}.actions{display:flex;gap:1rem}.actions button{display:flex;align-items:center;gap:.7rem;min-height:54px;padding:0 1.3rem;border:1px solid #39312b;background:#151210;color:#f1ece4;font-weight:800;cursor:pointer}.actions button:hover,.actions button:focus-visible{border-color:#df886b;outline:none}.actions .logout{color:#efa086}@media(max-width:760px){.profile-header{align-items:flex-start}.avatar{width:90px;height:90px;font-size:2.7rem}.stats{grid-template-columns:1fr}.actions{flex-direction:column}.actions button{justify-content:center}}
</style>