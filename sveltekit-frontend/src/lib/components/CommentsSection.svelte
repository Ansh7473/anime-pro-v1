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

  $effect(() => {
    if (animeId && episode) {
      fetchComments();
    }
  });

  async function fetchComments() {
    try {
      const allComments = (await api.getComments(animeId, episode)) || [];
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
    <MessageCircle size={22} />
    <h3>Community Discussion</h3>
    <span class="comment-count">{comments.length} Comments</span>
  </div>

  <!-- Main Input -->
  <div class="input-container main-input">
    {#if $auth.token}
      <img src={getProxiedImage($auth.currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.user?.email || 'guest'}`)} alt="My Avatar" class="user-avatar" />
      <div class="input-wrapper">
        <textarea
          placeholder="What are your thoughts on this episode?"
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
  <div class="comments-list">
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
                <Reply size={14} /> Reply
              </button>
              {#if $auth.user?.id === comment.userId}
                <button class="action-btn delete" onclick={() => deleteComment(comment.id)}>
                  <Trash2 size={14} /> Delete
                </button>
              {/if}
            </div>

            <!-- Reply Input -->
            {#if replyingTo === comment.id}
              <div class="input-container reply-input">
                <textarea
                  placeholder="Write a reply..."
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
                    Post Reply
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
                            <Trash2 size={14} /> Delete
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
  .comments-section {
    margin-top: 3rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
    color: white;
    background: linear-gradient(135deg, rgba(18, 18, 24, 0.82), rgba(8, 8, 12, 0.9));
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 26px;
    padding: 2rem;
    box-shadow:
      0 24px 60px rgba(0, 0, 0, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.06);
  }

  .comments-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .comments-header h3 {
    font-size: 1.5rem;
    font-weight: 950;
    letter-spacing: -0.02em;
    color: #fff;
    text-shadow: 0 0 26px rgba(229, 9, 20, 0.35);
    flex: 1;
  }

  .comment-count {
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    font-weight: 700;
    padding: 0.4rem 1rem;
    background: rgba(229, 9, 20, 0.15);
    border: 1px solid rgba(229, 9, 20, 0.3);
    border-radius: 999px;
    box-shadow: 0 0 18px rgba(229, 9, 20, 0.25);
  }

  .user-avatar {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    flex-shrink: 0;
    object-fit: cover;
    border: 2px solid rgba(255, 255, 255, 0.1);
  }
  .user-avatar.sm {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .input-container {
    display: flex;
    gap: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 1.5rem;
  }
  .input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  textarea {
    width: 100%;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 1rem;
    color: white;
    font-family: inherit;
    font-size: 0.95rem;
    resize: vertical;
    outline: none;
    transition: 0.2s;
  }
  textarea:focus {
    border-color: rgba(229, 9, 20, 0.6);
    background: rgba(0, 0, 0, 0.5);
    box-shadow: 0 0 0 3px rgba(229, 9, 20, 0.15);
  }

  .input-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
  }

  .post-btn {
    background: linear-gradient(135deg, #e50914 0%, #c70811 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    font-weight: 800;
    font-size: 0.9rem;
    cursor: pointer;
    transition: 0.2s;
    box-shadow: 0 8px 20px rgba(229, 9, 20, 0.3);
  }
  .post-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    filter: brightness(1.15);
    box-shadow: 0 12px 28px rgba(229, 9, 20, 0.5);
  }
  .post-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    border: none;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.75rem 1rem;
  }

  .login-prompt {
    flex: 1;
    text-align: center;
    padding: 2.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 20px;
    border: 1px dashed rgba(255, 255, 255, 0.15);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }
  .btn-login {
    background: white;
    color: black;
    padding: 0.85rem 2rem;
    border-radius: 12px;
    font-weight: 800;
    text-decoration: none;
    transition: 0.2s;
  }
  .btn-login:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 20px rgba(255, 255, 255, 0.2);
  }

  .comments-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .comment-card {
    display: flex;
    gap: 1.25rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    transition: 0.2s;
  }
  .comment-card:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
  }
  .comment-card.reply {
    gap: 1rem;
    margin-top: 1rem;
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.04);
  }

  .comment-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .comment-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .user-name {
    font-weight: 800;
    font-size: 0.95rem;
    color: white;
  }
  .timestamp {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .content {
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.95rem;
    white-space: pre-wrap;
  }

  .comment-actions {
    display: flex;
    gap: 1.5rem;
    margin-top: 0.5rem;
  }
  .action-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
    transition: 0.2s;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
  }
  .action-btn:hover {
    color: white;
    background: rgba(255, 255, 255, 0.08);
  }
  .action-btn.delete:hover {
    color: #ff4757;
    background: rgba(229, 9, 20, 0.15);
  }

  .reply-input {
    margin-top: 1rem;
  }
  .replies-list {
    border-left: 2px solid rgba(229, 9, 20, 0.3);
    padding-left: 1rem;
    margin-top: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.95rem;
  }

  .comment-skeleton {
    height: 100px;
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 16px;
  }
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }

  @media (max-width: 768px) {
    .comments-section {
      padding: 1.5rem;
      border-radius: 18px;
    }

    .comments-header h3 {
      font-size: 1.25rem;
    }

    .comment-count {
      font-size: 0.75rem;
      padding: 0.3rem 0.75rem;
    }

    .input-container {
      padding: 1rem;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
    }

    .comment-card {
      padding: 1rem;
      gap: 0.85rem;
    }

    .user-name {
      font-size: 0.85rem;
    }

    .content {
      font-size: 0.88rem;
    }
  }
</style>
