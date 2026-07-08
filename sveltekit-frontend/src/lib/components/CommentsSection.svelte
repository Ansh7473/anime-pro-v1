<script lang="ts">
  import { api, getProxiedImage } from '$lib/api';
  import { auth } from '$lib/stores/auth';
  import { onMount } from 'svelte';
  import { Send, MessageSquare, Trash2, Reply, MessageCircle } from 'lucide-svelte';

  let { animeId, episode } = $props<{ animeId: string; episode: number }>();

  let comments = $state<any[]>([]);
  let newComment = $state('');
  let replyingTo = $state<string | null>(null);
  let replyText = $state('');
  let loading = $state(true);
  let processing = $state(false);
  let activeScope = $state<'episode' | 'anime'>('episode');

  function setScope(s: 'episode' | 'anime') {
    if (activeScope === s) return;
    activeScope = s;
  }

  $effect(() => {
    // Re-run when the anime, episode, or scope changes.
    activeScope;
    episode;
    if (animeId) {
      loading = true;
      fetchComments();
    }
  });

  async function fetchComments() {
    try {
      const epParam = activeScope === 'anime' ? 0 : episode;
      const allComments = (await api.getComments(animeId, epParam)) || [];
      // Build discussion tree from flat list
      const map: Record<string, any> = {};
      const roots: any[] = [];

      allComments.forEach((c: any) => {
        c.replies = [];
        map[c.id] = c;
      });

      allComments.forEach((c: any) => {
        if (c.parentId && map[c.parentId]) {
          map[c.parentId].replies.push(c);
        } else if (!c.parentId) {
          roots.push(c);
        }
      });

      comments = roots;
    } catch (e) {
      console.error('Failed to fetch comments:', e);
    } finally {
      loading = false;
    }
  }

  async function postComment(parentId?: string) {
    if (!$auth.token) {
      alert('Please login to comment!');
      return;
    }

    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;

    processing = true;
    try {
      const res = await api.postComment($auth.token, {
        animeId,
        episode,
        content: content.trim(),
        parentId
      });

      if (parentId) {
        // Add to replies of the parent
        const parent = findComment(comments, parentId);
        if (parent) {
          if (!parent.replies) parent.replies = [];
          parent.replies = [res, ...parent.replies];
        }
        replyingTo = null;
        replyText = '';
      } else {
        // Add to top-level comments
        comments = [res, ...comments];
        newComment = '';
      }
    } catch (e) {
      console.error('Failed to post comment:', e);
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
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await api.deleteComment($auth.token!, id);
      // Local removal
      comments = filterComment(comments, id);
    } catch (e) {
      console.error('Failed to delete comment:', e);
    }
  }

  function filterComment(list: any[], id: string): any[] {
    return list.filter(c => c.id !== id).map(c => ({
      ...c,
      replies: c.replies ? filterComment(c.replies, id) : []
    }));
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<div class="comments-section">
  <div class="comments-header">
    <div class="ch-titles">
      <span class="ch-kicker"><MessageCircle size={13} aria-hidden="true" /> The Anime Community</span>
      <h3>Comments <span class="comment-count">{comments.length}</span></h3>
    </div>
    <div class="ch-tabs" role="tablist">
      <button
        id="comments-tab-anime"
        class="ch-tab"
        class:active={activeScope === 'anime'}
        role="tab"
        aria-selected={activeScope === 'anime'}
        aria-controls="comments-panel-anime"
        onclick={() => setScope('anime')}
      >
        Anime
      </button>
      <button
        id="comments-tab-episode"
        class="ch-tab"
        class:active={activeScope === 'episode'}
        role="tab"
        aria-selected={activeScope === 'episode'}
        aria-controls="comments-panel-episode"
        onclick={() => setScope('episode')}
      >
        EP {episode}
      </button>
    </div>
  </div>

  <!-- Main Input -->
  <div class="input-container main-input">
    {#if $auth.token}
      <img src={getProxiedImage($auth.currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || 'guest'}`)} alt="My Avatar" class="user-avatar" />
      <div class="input-wrapper">
        <textarea
          placeholder="What are your thoughts on this episode?"
          aria-label="Write a comment"
          bind:value={newComment}
          rows="2"
        ></textarea>
        <div class="input-footer">
          <button
            class="post-btn"
            onclick={() => postComment()}
            disabled={!newComment.trim() || processing}
          >
            {processing && !replyingTo ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
    {:else}
      <div class="login-prompt">
        <p>You must be logged in to participate in the discussion.</p>
        <a href="/auth/login" class="btn-login">Login / Sign Up</a>
      </div>
    {/if}
  </div>

  <!-- Comments List -->
  <div
    id="comments-panel-{activeScope}"
    class="comments-list"
    role="tabpanel"
    aria-labelledby="comments-tab-{activeScope}"
    aria-live="polite"
  >
    {#if loading}
      {#each Array(3) as _}
        <div class="comment-skeleton"></div>
      {/each}
    {:else if comments.length === 0}
      <div class="empty-state">
        <p>No comments yet. Start the conversation!</p>
      </div>
    {:else}
      {#each comments as comment (comment.id)}
        <div class="comment-card">
          <img
            src={getProxiedImage(comment.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userName || 'User'}`)}
            alt={comment.userName}
            class="user-avatar"
          />
          <div class="comment-body">
            <div class="comment-info">
              <span class="user-name">{comment.userName || 'User'}</span>
              <span class="timestamp">{formatDate(comment.createdAt)}</span>
            </div>
            <p class="content">{comment.content}</p>

            <div class="comment-actions">
              <button class="action-btn" onclick={() => replyingTo = comment.id}>
                <Reply size={14} aria-hidden="true" /> Reply
              </button>
              {#if $auth.user?.id === comment.userId}
                <button class="action-btn delete" onclick={() => deleteComment(comment.id)}>
                  <Trash2 size={14} aria-hidden="true" /> Delete
                </button>
              {/if}
            </div>

            <!-- Reply Input -->
            {#if replyingTo === comment.id}
              <div class="input-container reply-input">
                <textarea
                  placeholder="Write a reply..."
                  aria-label="Write a reply"
                  bind:value={replyText}
                  rows="1"
                ></textarea>
                <div class="input-footer">
                  <button class="btn-cancel" onclick={() => replyingTo = null}>Cancel</button>
                  <button
                    class="post-btn"
                    onclick={() => postComment(comment.id)}
                    disabled={!replyText.trim() || processing}
                  >
                    {processing && replyingTo === comment.id ? 'Posting...' : 'Post Reply'}
                  </button>
                </div>
              </div>
            {/if}

            <!-- Replies List -->
            {#if comment.replies && comment.replies.length > 0}
              <div class="replies-list">
                {#each comment.replies as reply (reply.id)}
                  <div class="comment-card reply">
                    <img
                      src={getProxiedImage(reply.userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.userName || 'User'}`)}
                      alt={reply.userName}
                      class="user-avatar sm"
                    />
                    <div class="comment-body">
                      <div class="comment-info">
                        <span class="user-name">{reply.userName || 'User'}</span>
                        <span class="timestamp">{formatDate(reply.createdAt)}</span>
                      </div>
                      <p class="content">{reply.content}</p>
                      {#if $auth.user?.id === reply.userId}
                        <div class="comment-actions">
                          <button class="action-btn delete" onclick={() => deleteComment(reply.id)}>
                            <Trash2 size={14} aria-hidden="true" /> Delete
                          </button>
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
  /* Flat, miruro-style discussion panel. Uses the watch-page design tokens
     (inherited from .player-page) with safe fallbacks. */
  .comments-section {
    --c-surface: var(--surface-1, rgba(14, 14, 20, 0.5));
    --c-surface-2: var(--surface-2, rgba(255, 255, 255, 0.02));
    --c-btn: var(--surface-btn, rgba(255, 255, 255, 0.04));
    --c-btn-hover: var(--surface-btn-hover, rgba(255, 255, 255, 0.08));
    --c-line: var(--hairline, rgba(255, 255, 255, 0.05));
    --c-line-strong: var(--hairline-strong, rgba(255, 255, 255, 0.1));
    --c-accent: var(--net-red, #e50914);
    --c-txt: var(--txt, #e8e8e8);
    --c-dim: var(--txt-dim, #a3a3a3);
    --c-radius: var(--radius-card, 20px);
    --c-radius-in: var(--radius-inner, 10px);
  }

  /* ── Layout & Wrapper ─────────────────────────── */
  .comments-section {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: var(--c-txt);
    background: var(--c-surface);
    border: 1px solid var(--c-line);
    border-radius: var(--c-radius);
    padding: 2rem;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }

  .comments-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--c-line);
  }
  .ch-titles {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }
  .ch-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--c-dim);
  }
  .comments-header h3 {
    font-size: 1.2rem;
    font-weight: 700;
    margin: 0;
    color: var(--c-txt);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .comment-count {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--c-dim);
    background: var(--c-surface-2);
    border: 1px solid var(--c-line);
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
  }

  .ch-tabs {
    display: inline-flex;
    gap: 0.4rem;
  }
  .ch-tab {
    padding: 0.45rem 0.9rem;
    border-radius: var(--c-radius-in);
    background: transparent;
    border: 1px solid var(--c-line);
    color: var(--c-txt);
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      background 0.18s ease,
      border-color 0.18s ease,
      color 0.18s ease;
  }
  .ch-tab:hover {
    background: var(--c-btn);
  }
  .ch-tab.active {
    background: color-mix(in srgb, var(--c-accent) 22%, transparent);
    border-color: var(--c-accent);
    color: color-mix(in srgb, var(--c-accent) 80%, #fff);
  }

  .user-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.2);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .user-avatar:hover {
    border-color: var(--c-accent);
    transform: scale(1.05);
  }
  .user-avatar.sm {
    width: 32px;
    height: 32px;
    border-width: 1.5px;
  }

  .input-container {
    display: flex;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.15rem;
    transition: border-color 0.22s ease, box-shadow 0.22s ease;
  }
  .input-container:focus-within {
    border-color: rgba(229, 9, 20, 0.35);
    box-shadow: 0 0 0 1px rgba(229, 9, 20, 0.2);
  }
  .input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    min-width: 0;
  }

  textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 0.8rem 1rem;
    color: var(--c-txt);
    font-family: inherit;
    font-size: 0.9rem;
    resize: vertical;
    outline: none;
    transition:
      border-color 0.18s ease,
      box-shadow 0.18s ease;
  }
  textarea::placeholder {
    color: var(--c-dim);
  }
  textarea:focus {
    border-color: color-mix(in srgb, var(--c-accent) 55%, transparent);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-accent) 18%, transparent);
  }

  .input-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
  }

  .post-btn {
    background: var(--c-accent);
    color: #fff;
    border: none;
    padding: 0.55rem 1.2rem;
    border-radius: var(--c-radius-in);
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition:
      filter 0.18s ease,
      opacity 0.18s ease;
  }
  .post-btn:hover:not(:disabled) {
    filter: brightness(1.12);
  }
  .post-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: transparent;
    color: var(--c-dim);
    border: none;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0.55rem 0.9rem;
    border-radius: var(--c-radius-in);
  }
  .btn-cancel:hover {
    background: var(--c-btn);
    color: var(--c-txt);
  }

  .login-prompt {
    flex: 1;
    text-align: center;
    padding: 2rem 1.5rem;
    background: var(--c-surface-2);
    border-radius: var(--c-radius);
    border: 1px dashed var(--c-line-strong);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.1rem;
  }
  .login-prompt p {
    color: var(--c-dim);
    font-size: 0.9rem;
  }
  .btn-login {
    background: #fff;
    color: #000;
    padding: 0.7rem 1.6rem;
    border-radius: var(--c-radius-in);
    font-weight: 700;
    text-decoration: none;
    transition: transform 0.18s ease;
  }
  .btn-login:hover {
    transform: scale(1.04);
  }

  .comments-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 70vh;
      overflow-y: auto;
    }

  .comment-card {
    display: flex;
    gap: 1rem;
    background: transparent;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    padding: 1.25rem 0;
    transition: all 0.2s ease;
  }
  .comment-card:last-child {
    border-bottom: none;
  }
  .comment-card:hover {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .comment-card.reply {
    gap: 0.75rem;
    margin-top: 0.75rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 12px;
    padding: 0.65rem 0.85rem;
  }

  .comment-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-width: 0;
  }
  .comment-info {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .user-name {
    font-weight: 700;
    font-size: 0.88rem;
    color: var(--c-txt);
  }
  .timestamp {
    font-size: 0.72rem;
    color: var(--c-dim);
  }

  .content {
    line-height: 1.55;
    color: color-mix(in srgb, var(--c-txt) 88%, transparent);
    font-size: 0.9rem;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .comment-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.25rem;
  }
  .action-btn {
    background: transparent;
    border: none;
    color: var(--c-dim);
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.76rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      color 0.18s ease,
      background 0.18s ease;
    padding: 0.3rem 0.5rem;
    border-radius: var(--c-radius-in);
  }
  .action-btn:hover {
    color: var(--c-txt);
    background: var(--c-btn);
  }
  .action-btn.delete:hover {
    color: #ff5468;
    background: color-mix(in srgb, var(--c-accent) 15%, transparent);
  }

  .reply-input {
    margin-top: 0.6rem;
  }
  .replies-list {
    border-left: 2px solid var(--c-line-strong);
    padding-left: 0.85rem;
    margin-top: 0.6rem;
  }

  .empty-state {
    text-align: center;
    padding: 2.25rem 1.5rem;
    color: var(--c-dim);
    font-size: 0.9rem;
  }

  .comment-skeleton {
    height: 84px;
    background: linear-gradient(
      90deg,
      var(--c-surface-2),
      var(--c-btn),
      var(--c-surface-2)
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: var(--c-radius);
  }
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .comment-skeleton {
      animation: none;
    }
  }

  @media (max-width: 768px) {
    .comments-section {
      padding: 0.85rem;
    }
    .comments-header h3 {
      font-size: 1.05rem;
    }
    .user-avatar {
      width: 34px;
      height: 34px;
    }
    .comment-card {
      padding: 0.75rem;
      gap: 0.65rem;
    }
    .ch-tab {
      padding: 0.4rem 0.7rem;
      font-size: 0.74rem;
    }
  }
</style>
