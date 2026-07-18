<script lang="ts">
  import { api, getProxiedImage } from "$lib/api";
  import { auth } from "$lib/stores/auth";
  import { Send, Trash2, Reply } from "lucide-svelte";

  let { animeId, episode } = $props<{ animeId: string; episode: number }>();

  let comments = $state<any[]>([]);
  let newComment = $state("");
  let replyingTo = $state<string | null>(null);
  let replyText = $state("");
  let loading = $state(true);
  let processing = $state(false);
  let activeScope = $state<"episode" | "anime">("episode");

  function setScope(s: "episode" | "anime") {
    if (activeScope !== s) activeScope = s;
  }

  $effect(() => {
    activeScope;
    episode;
    if (animeId) {
      loading = true;
      fetchComments();
    }
  });

  async function fetchComments() {
    try {
      const epParam = activeScope === "anime" ? 0 : episode;
      const all = (await api.getComments(animeId, epParam)) || [];
      const map: Record<string, any> = {};
      const roots: any[] = [];
      all.forEach((c: any) => {
        c.replies = [];
        map[c.id] = c;
      });
      all.forEach((c: any) => {
        if (c.parentId && map[c.parentId]) map[c.parentId].replies.push(c);
        else if (!c.parentId) roots.push(c);
      });
      comments = roots;
    } catch (e) {
      console.error("Failed to fetch comments:", e);
    } finally {
      loading = false;
    }
  }

  async function postComment(parentId?: string) {
    if (!$auth.token) return;
    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;

    processing = true;
    try {
      const res = await api.postComment($auth.token, {
        animeId,
        episode,
        content: content.trim(),
        parentId,
      });
      if (parentId) {
        const parent = findComment(comments, parentId);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies = [res, ...parent.replies];
        }
        replyingTo = null;
        replyText = "";
      } else {
        comments = [res, ...comments];
        newComment = "";
      }
    } catch (e) {
      console.error("Failed to post comment:", e);
    } finally {
      processing = false;
    }
  }

  function findComment(list: any[], id: string): any {
    for (const c of list) {
      if (c.id === id) return c;
      if (c.replies) {
        const found = findComment(c.replies, id);
        if (found) return found;
      }
    }
    return null;
  }

  async function deleteComment(id: string) {
    if (!confirm("Delete this comment?")) return;
    try {
      await api.deleteComment($auth.token!, id);
      comments = filterComment(comments, id);
    } catch (e) {
      console.error("Failed to delete comment:", e);
    }
  }

  function filterComment(list: any[], id: string): any[] {
    return list
      .filter((c) => c.id !== id)
      .map((c) => ({ ...c, replies: c.replies ? filterComment(c.replies, id) : [] }));
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<div class="cmt">
  <div class="cmt-scope" role="tablist">
    <button class="scope-tab" class:active={activeScope === "anime"} role="tab" aria-selected={activeScope === "anime"} onclick={() => setScope("anime")}>
      Anime
    </button>
    <button class="scope-tab" class:active={activeScope === "episode"} role="tab" aria-selected={activeScope === "episode"} onclick={() => setScope("episode")}>
      EP {episode}
    </button>
  </div>

  {#if $auth.token}
    <div class="cmt-compose">
      <img class="avatar" alt="" src={getProxiedImage($auth.currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || "guest"}`)} />
      <div class="compose-body">
        <textarea placeholder="What are your thoughts on this episode?" aria-label="Write a comment" bind:value={newComment} rows="2"></textarea>
        <button class="post-btn" onclick={() => postComment()} disabled={!newComment.trim() || processing}>
          <Send size={14} aria-hidden="true" />
          {processing && !replyingTo ? "Posting…" : "Post"}
        </button>
      </div>
    </div>
  {:else}
    <div class="cmt-guest">
      <span>Sign in to join the discussion</span>
      <a href="/auth/login">Sign In</a>
    </div>
  {/if}

  <div class="cmt-list" role="tabpanel" aria-live="polite">
    {#if loading}
      {#each Array(3) as _}
        <div class="cmt-skeleton"></div>
      {/each}
    {:else if comments.length === 0}
      <div class="cmt-empty">No comments yet. Start the conversation.</div>
    {:else}
      {#each comments as comment (comment.id)}
        <div class="cmt-card">
          <img class="avatar" alt="" src={getProxiedImage(comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userName || "User"}`)} />
          <div class="cmt-body">
            <div class="cmt-meta">
              <span class="cmt-name">{comment.userName || "User"}</span>
              <span class="cmt-time">{formatDate(comment.createdAt)}</span>
            </div>
            <p class="cmt-text">{comment.content}</p>
            <div class="cmt-actions">
              <button onclick={() => (replyingTo = comment.id)}><Reply size={13} aria-hidden="true" /> Reply</button>
              {#if $auth.user?.id === comment.userId}
                <button class="danger" onclick={() => deleteComment(comment.id)}><Trash2 size={13} aria-hidden="true" /> Delete</button>
              {/if}
            </div>

            {#if replyingTo === comment.id}
              <div class="cmt-reply-box">
                <textarea placeholder="Write a reply…" aria-label="Write a reply" bind:value={replyText} rows="1"></textarea>
                <div class="reply-btns">
                  <button class="ghost-btn" onclick={() => (replyingTo = null)}>Cancel</button>
                  <button class="post-btn" onclick={() => postComment(comment.id)} disabled={!replyText.trim() || processing}>
                    {processing && replyingTo === comment.id ? "Posting…" : "Reply"}
                  </button>
                </div>
              </div>
            {/if}

            {#if comment.replies?.length}
              <div class="cmt-replies">
                {#each comment.replies as reply (reply.id)}
                  <div class="cmt-card reply">
                    <img class="avatar sm" alt="" src={getProxiedImage(reply.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userName || "User"}`)} />
                    <div class="cmt-body">
                      <div class="cmt-meta">
                        <span class="cmt-name">{reply.userName || "User"}</span>
                        <span class="cmt-time">{formatDate(reply.createdAt)}</span>
                      </div>
                      <p class="cmt-text">{reply.content}</p>
                      {#if $auth.user?.id === reply.userId}
                        <div class="cmt-actions">
                          <button class="danger" onclick={() => deleteComment(reply.id)}><Trash2 size={13} aria-hidden="true" /> Delete</button>
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .cmt {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--net-card-bg);
    color: var(--net-text);
  }

  .cmt-scope {
    display: flex;
    gap: 0.4rem;
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--net-border);
    flex-shrink: 0;
  }
  .scope-tab {
    padding: 0.35rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--net-border);
    background: transparent;
    color: var(--net-text-muted);
    font-size: 0.78rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s;
  }
  .scope-tab.active {
    background: var(--net-red);
    border-color: var(--net-red);
    color: #fff;
  }

  .cmt-compose {
    display: flex;
    gap: 0.55rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--net-border);
    flex-shrink: 0;
  }
  .compose-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .cmt-compose textarea,
  .cmt-reply-box textarea {
    width: 100%;
    resize: none;
    background: var(--net-card-hover, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--net-border);
    border-radius: 10px;
    padding: 0.5rem 0.7rem;
    color: var(--net-text);
    font-size: 0.85rem;
    font-family: inherit;
    outline: none;
  }
  .cmt-compose textarea:focus,
  .cmt-reply-box textarea:focus { border-color: var(--net-red); }

  .post-btn {
    align-self: flex-end;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.9rem;
    border: none;
    border-radius: 999px;
    background: var(--net-red);
    color: #fff;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }
  .post-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ghost-btn {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--net-border);
    border-radius: 999px;
    background: transparent;
    color: var(--net-text-muted);
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }

  .cmt-guest {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.85rem 0.75rem;
    border-bottom: 1px solid var(--net-border);
    font-size: 0.8rem;
    color: var(--net-text-muted);
    flex-shrink: 0;
  }
  .cmt-guest a { font-weight: 800; color: var(--net-red); text-decoration: none; }

  .cmt-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .cmt-empty {
    margin: auto;
    padding: 1.5rem;
    text-align: center;
    color: var(--net-text-muted);
    font-size: 0.82rem;
  }

  .cmt-card { display: flex; gap: 0.55rem; align-items: flex-start; }
  .avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
    background: var(--net-border);
  }
  .avatar.sm { width: 28px; height: 28px; }
  .cmt-body { flex: 1; min-width: 0; }
  .cmt-meta { display: flex; align-items: baseline; gap: 0.5rem; }
  .cmt-name { font-size: 0.82rem; font-weight: 800; color: var(--net-text); }
  .cmt-time { font-size: 0.7rem; color: var(--net-text-muted); }
  .cmt-text {
    margin: 0.2rem 0 0.35rem;
    font-size: 0.85rem;
    line-height: 1.45;
    color: var(--net-text);
    word-break: break-word;
  }

  .cmt-actions { display: flex; gap: 0.75rem; margin-top: 0.1rem; }
  .cmt-actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    background: none;
    border: none;
    padding: 0;
    color: var(--net-text-muted);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }
  .cmt-actions button:hover { color: var(--net-text); }
  .cmt-actions button.danger:hover { color: #f87171; }

  .cmt-reply-box {
    margin-top: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .reply-btns { display: flex; justify-content: flex-end; gap: 0.5rem; }

  .cmt-replies {
    margin-top: 0.6rem;
    padding-left: 0.75rem;
    border-left: 2px solid var(--net-border);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .cmt-skeleton {
    height: 56px;
    border-radius: 10px;
    background: linear-gradient(
      90deg,
      var(--net-card-hover, rgba(255, 255, 255, 0.04)) 25%,
      var(--net-border) 50%,
      var(--net-card-hover, rgba(255, 255, 255, 0.04)) 75%
    );
    background-size: 200% 100%;
    animation: cmt-shimmer 1.5s infinite;
  }
  @keyframes cmt-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .cmt-skeleton { animation: none; }
  }

  .cmt { background: var(--editorial-surface, #0d0c0b); }
  .cmt-scope,.cmt-compose,.cmt-guest { border-color: var(--editorial-line, #28231f); }
  .scope-tab { border: 0; border-bottom: 1px solid transparent; border-radius: 0; }
  .scope-tab.active { background: transparent; border-color: var(--editorial-accent, #df886b); color: var(--editorial-accent-hover, #f1a287); }
  .cmt-compose textarea,.cmt-reply-box textarea { border-radius: 3px; background: #151210; border-color: var(--editorial-line, #28231f); }
  .post-btn,.ghost-btn { border-radius: 3px; }
  .post-btn { background: var(--editorial-accent, #df886b); color: #160b08; }
  .cmt-card { padding-bottom: .75rem; border-bottom: 1px solid #211d1a; }
  .avatar { border-radius: 3px; }
  .cmt-replies { border-color: #3a302b; }
  .cmt-skeleton { border-radius: 3px; }
</style>

