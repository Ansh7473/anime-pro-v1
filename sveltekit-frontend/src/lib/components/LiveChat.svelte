<script lang="ts">
  import { auth } from "$lib/stores/auth";
  import { getProxiedImage } from "$lib/api";
  import { onMount, onDestroy } from "svelte";
  import {
    Send,
    MessageSquare,
    Users,
    X,
    ChevronRight,
    ChevronLeft,
  } from "lucide-svelte";
  import * as Ably from 'ably';

  let { animeId, episode } = $props<{ animeId: string; episode: number }>();
  let ably: Ably.Realtime | null = null;
  let channel: any = null;
  let messages = $state<any[]>([]);
  let newMessage = $state("");
  let isOpen = $state(true);
  let connected = $state(false);
  let chatEndRef: HTMLDivElement | null = $state(null);

  onMount(() => {
    if (!$auth.token || !$auth.currentProfile) return;
    connect();
  });

  onDestroy(() => {
    if (ably) ably.close();
  });

  function connect() {
    const authUrl = `https://anime-pro-v1-backend-go.vercel.app/api/v1/user/chat/token`;

    ably = new Ably.Realtime({
      authUrl: authUrl,
      authHeaders: {
        'Authorization': `Bearer ${$auth.token}`
      }
    });

    ably.connection.on('connected', () => {
      connected = true;
      console.log("Connected to Ably chat");
      
      const channelName = `${animeId}-${episode}`;
      channel = ably!.channels.get(channelName);

      channel.subscribe('chat', (message: any) => {
        messages = [...messages, message.data];
        scrollToBottom();
      });

      // Presence could be added here later
    });

    ably.connection.on('disconnected', () => {
      connected = false;
    });

    ably.connection.on('failed', () => {
      connected = false;
      console.error("Ably connection failed");
    });
  }

  function sendMessage() {
    if (!channel || !newMessage.trim() || !connected) return;

    const msg = {
      type: "chat",
      userId: $auth.user?.id,
      userName: $auth.currentProfile?.name || "Anonymous",
      avatar: $auth.currentProfile?.avatar || "",
      content: newMessage.trim(),
      roomId: `${animeId}-${episode}`,
    };

    channel.publish('chat', msg);
    newMessage = "";
  }

  function scrollToBottom() {
    const el = chatEndRef;
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") sendMessage();
  }
</script>

<div class="chat-sidebar" class:closed={!isOpen}>
  <button
    class="toggle-btn"
    onclick={() => (isOpen = !isOpen)}
    aria-label={isOpen ? "Close Chat" : "Open Chat"}
  >
    {#if isOpen}
      <ChevronRight size={20} />
    {:else}
      <ChevronLeft size={20} />
    {/if}
    {#if !isOpen}
      <div class="badge">Chat</div>
    {/if}
  </button>

  {#if isOpen}
    <div class="chat-header">
      <div class="title">
        <MessageSquare size={18} />
        <span>Live Chat</span>
      </div>
      <div class="status" class:online={connected}>
        <div class="dot"></div>
        {connected ? "Live" : "Connecting..."}
      </div>
    </div>

    <div class="messages-list">
      {#if messages.length === 0}
        <div class="empty-state">
          <Users size={32} />
          <p>Be the first to say something!</p>
        </div>
      {/if}

      {#each messages as msg}
        <div class="message-item" class:own={msg.userId === $auth.user?.id}>
          {#if msg.userId !== $auth.user?.id}
            <img
              src={getProxiedImage(msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userName || 'guest'}`)}
              alt={msg.userName}
              class="chat-avatar"
            />
          {/if}
          <div class="message-content">
            <span class="user-name">{msg.userName}</span>
            <p class="text">{msg.content}</p>
          </div>
        </div>
      {/each}
      <div bind:this={chatEndRef}></div>
    </div>

    <div class="chat-input-area">
      {#if !$auth.token}
        <div class="login-prompt">Login to Chat</div>
      {:else}
        <input
          type="text"
          placeholder="Say something..."
          bind:value={newMessage}
          onkeydown={handleKeydown}
          disabled={!connected}
        />
        <button
          class="send-btn"
          onclick={sendMessage}
          disabled={!newMessage.trim() || !connected}
        >
          <Send size={18} />
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chat-sidebar {
    width: 320px;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(20px);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    flex-direction: column;
    position: relative;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    z-index: 100;
  }

  .chat-sidebar.closed {
    transform: translateX(320px);
    width: 0;
  }

  .toggle-btn {
    position: absolute;
    right: 100%;
    top: 1rem;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-right: none;
    color: white;
    width: 40px;
    height: 48px;
    border-radius: 12px 0 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .badge {
    position: absolute;
    right: 50px;
    background: var(--net-red);
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    text-transform: uppercase;
  }

  .chat-header {
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .chat-header .title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 700;
    color: white;
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    color: var(--net-text-muted);
  }
  .status.online {
    color: #00ff7f;
  }
  .status .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  .messages-list {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .message-item {
    display: flex;
    gap: 0.75rem;
    max-width: 90%;
  }
  .message-item.own {
    align-self: flex-end;
    flex-direction: row-reverse;
  }

  .chat-avatar {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .message-content {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  .user-name {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--net-text-muted);
  }
  .message-item.own .user-name {
    text-align: right;
  }

  .text {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.6rem 0.9rem;
    border-radius: 0 16px 16px 16px;
    font-size: 0.9rem;
    color: white;
    line-height: 1.4;
  }
  .message-item.own .text {
    background: var(--net-red);
    border-radius: 16px 0 16px 16px;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--net-text-muted);
    gap: 1rem;
    text-align: center;
    opacity: 0.5;
  }

  .chat-input-area {
    padding: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    gap: 0.75rem;
  }

  .chat-input-area input {
    flex: 1;
    border: none;
    background: rgba(255, 255, 255, 0.05);
    font-size: 0.9rem;
    outline: none;
  }
  .chat-input-area input:focus {
    border: 1px solid var(--net-red);
  }

  .send-btn {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--net-red);
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: 0.2s;
  }
  .send-btn:hover:not(:disabled) {
    transform: scale(1.05);
    filter: brightness(1.1);
  }
  .send-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .login-prompt {
    flex: 1;
    text-align: center;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--net-text-muted);
  }
</style>
