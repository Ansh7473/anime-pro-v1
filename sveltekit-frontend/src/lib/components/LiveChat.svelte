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
    MoreVertical,
    Settings,
  } from "lucide-svelte";
  import * as Ably from 'ably';

  let { animeId, episode } = $props<{ animeId: string; episode: number }>();
  let ably: Ably.Realtime | null = null;
  let channel: any = null;
  let messages = $state<any[]>([]);
  let newMessage = $state("");
  let isOpen = $state(false);
  let connected = $state(false);
  let chatEndRef: HTMLDivElement | null = $state(null);
  let chatType = $state("Live Chat"); // Visual only for YT feel

  onMount(() => {
    // Connect regardless of login state (Backend now handles guest tokens)
    connect();
  });

  onDestroy(() => {
    if (ably) ably.close();
  });

  async function connect() {
    const authUrl = `https://anime-pro-v1-backend-go.vercel.app/api/v1/chat/token`;

    ably = new Ably.Realtime({
      authUrl: authUrl,
      authHeaders: $auth.token ? {
        'Authorization': `Bearer ${$auth.token}`
      } : {}
    });

    ably.connection.on('connected', () => {
      connected = true;
      const channelName = `${animeId}-${episode}`;
      channel = ably!.channels.get(channelName);

      channel.subscribe('chat', (message: any) => {
        messages = [...messages, message.data].slice(-100); // Keep last 100 for performance
        scrollToBottom();
      });
    });

    ably.connection.on('disconnected', () => {
      connected = false;
    });
  }

  function sendMessage() {
    if (!channel || !newMessage.trim() || !connected || !$auth.token) return;

    const msg = {
      type: "chat",
      userId: $auth.user?.id,
      userName: $auth.currentProfile?.name || "User",
      avatar: $auth.currentProfile?.avatar || "",
      content: newMessage.trim(),
      roomId: `${animeId}-${episode}`,
      timestamp: new Date().toISOString()
    };

    channel.publish('chat', msg);
    newMessage = "";
  }

  function scrollToBottom() {
    if (chatEndRef) {
      setTimeout(() => chatEndRef?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") sendMessage();
  }
</script>

<div class="chat-container" class:closed={!isOpen}>
  <button
    class="sidebar-toggle"
    onclick={() => (isOpen = !isOpen)}
    title={isOpen ? "Collapse Chat" : "Expand Chat"}
  >
    {#if isOpen}
      <ChevronRight size={20} />
    {:else}
      <ChevronLeft size={20} />
      <span class="vertical-text">CHAT</span>
    {/if}
  </button>

  {#if isOpen}
    <div class="chat-main glass-panel">
      <!-- YouTube Style Header -->
      <div class="chat-header">
        <div class="header-top">
          <div class="chat-selector">
            <span>{chatType}</span>
            <ChevronLeft size={14} class="rotate-down" />
          </div>
          <div class="header-actions">
            <button class="icon-btn"><Settings size={16} /></button>
            <button class="icon-btn" onclick={() => (isOpen = false)}><X size={18} /></button>
          </div>
        </div>
        <div class="header-status" class:online={connected}>
          <div class="pulse-dot"></div>
          {connected ? "Connected" : "Reconnecting..."}
        </div>
      </div>

      <!-- YouTube Style Message List -->
      <div class="messages-area">
        {#if messages.length === 0}
          <div class="welcome-banner">
            <div class="welcome-icon"><MessageSquare size={32} /></div>
            <h3>Welcome to Live Chat!</h3>
            <p>Remember to guard your privacy and abide by our community guidelines.</p>
          </div>
        {/if}

        <div class="message-feed">
          {#each messages as msg}
            <div class="yt-message">
              <img
                src={getProxiedImage(msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userName || 'Guest'}`)}
                alt=""
                class="yt-avatar"
              />
              <div class="yt-body">
                <span class="yt-author" class:is-me={msg.userId === $auth.user?.id}>
                  {msg.userName}
                </span>
                <span class="yt-text">{msg.content}</span>
              </div>
            </div>
          {/each}
          <div bind:this={chatEndRef}></div>
        </div>
      </div>

      <!-- Footer / Input -->
      <div class="chat-footer">
        {#if !$auth.token}
          <div class="guest-notice">
            <p>Sign in to join the conversation</p>
            <a href="/login" class="signin-link">SIGN IN</a>
          </div>
        {:else}
          <div class="input-wrapper">
            <img 
              src={getProxiedImage($auth.currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.currentProfile?.name || 'User'}`)} 
              alt="" 
              class="footer-avatar" 
            />
            <div class="input-container">
              <input
                type="text"
                placeholder="Say something..."
                bind:value={newMessage}
                onkeydown={handleKeydown}
                maxlength="200"
              />
              <div class="btn-group">
                <span class="char-count" class:limit={newMessage.length > 180}>
                  {newMessage.length}/200
                </span>
                <button
                  class="send-icon-btn"
                  onclick={sendMessage}
                  disabled={!newMessage.trim() || !connected}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :root {
    --yt-bg: #0f0f0f;
    --yt-border: rgba(255, 255, 255, 0.1);
    --yt-text: #f1f1f1;
    --yt-muted: #aaaaaa;
    --yt-blue: #3ea6ff;
  }

  .chat-container {
    width: 380px;
    height: calc(100vh - 80px); /* Adjust for header if exists */
    position: fixed;
    right: 20px;
    top: 100px;
    z-index: 50;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .chat-container.closed {
    transform: translateX(332px); /* Hide most of it, leave toggle visible */
  }

  .glass-panel {
    background: var(--yt-bg);
    border: 1px solid var(--yt-border);
    border-radius: 12px;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  /* Toggle Button */
  .sidebar-toggle {
    position: absolute;
    right: 100%;
    top: 12px;
    background: var(--yt-bg);
    border: 1px solid var(--yt-border);
    border-right: none;
    color: white;
    width: 32px;
    height: 60px;
    border-radius: 8px 0 0 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 10;
  }

  .vertical-text {
    writing-mode: vertical-lr;
    transform: rotate(180deg);
    font-size: 10px;
    font-weight: 800;
    margin-top: 4px;
    letter-spacing: 1px;
    color: var(--yt-muted);
  }

  /* Header */
  .chat-header {
    padding: 8px 16px;
    border-bottom: 1px solid var(--yt-border);
  }

  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 40px;
  }

  .chat-selector {
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
    font-size: 14px;
    cursor: pointer;
    color: var(--yt-text);
  }

  .rotate-down {
    transform: rotate(-90deg);
  }

  .header-actions {
    display: flex;
    gap: 8px;
  }

  .icon-btn {
    background: none;
    border: none;
    color: var(--yt-text);
    padding: 8px;
    border-radius: 50%;
    display: flex;
    cursor: pointer;
  }

  .icon-btn:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--yt-muted);
    margin-top: -4px;
    padding-left: 2px;
  }

  .header-status.online {
    color: #2ba640;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  /* Message List */
  .messages-area {
    flex: 1;
    overflow-y: auto;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    scrollbar-width: thin;
    scrollbar-color: var(--yt-border) transparent;
  }

  .welcome-banner {
    padding: 24px 0;
    text-align: center;
    border-bottom: 1px solid var(--yt-border);
    margin-bottom: 16px;
  }

  .welcome-icon {
    color: var(--yt-blue);
    margin-bottom: 12px;
  }

  .welcome-banner h3 {
    font-size: 16px;
    margin-bottom: 8px;
  }

  .welcome-banner p {
    font-size: 13px;
    color: var(--yt-muted);
    line-height: 1.4;
  }

  .message-feed {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* YouTube Style Message */
  .yt-message {
    display: flex;
    gap: 12px;
    padding: 4px 0;
    animation: slideIn 0.2s ease-out;
  }

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(5px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .yt-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .yt-body {
    font-size: 13px;
    line-height: 1.4;
    word-break: break-word;
  }

  .yt-author {
    font-weight: 700;
    color: var(--yt-muted);
    margin-right: 8px;
  }

  .yt-author.is-me {
    color: var(--yt-blue);
  }

  .yt-text {
    color: var(--yt-text);
  }

  /* Footer / Input */
  .chat-footer {
    padding: 16px;
    background: var(--yt-bg);
    border-top: 1px solid var(--yt-border);
  }

  .guest-notice {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .guest-notice p {
    font-size: 13px;
    color: var(--yt-muted);
  }

  .signin-link {
    background: var(--yt-blue);
    color: #0f0f0f;
    font-weight: 700;
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 20px;
    text-decoration: none;
    transition: opacity 0.2s;
  }

  .signin-link:hover {
    opacity: 0.9;
  }

  .input-wrapper {
    display: flex;
    gap: 12px;
  }

  .footer-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .input-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-container input {
    background: none;
    border: none;
    border-bottom: 1px solid var(--yt-border);
    color: var(--yt-text);
    padding: 4px 0 8px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .input-container input:focus {
    border-bottom: 2px solid var(--yt-blue);
  }

  .btn-group {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
  }

  .char-count {
    font-size: 11px;
    color: var(--yt-muted);
  }

  .char-count.limit {
    color: #ff4e4e;
  }

  .send-icon-btn {
    background: none;
    border: none;
    color: var(--yt-blue);
    cursor: pointer;
    display: flex;
    padding: 4px;
    border-radius: 50%;
  }

  .send-icon-btn:hover:not(:disabled) {
    background: rgba(62, 166, 255, 0.1);
  }

  .send-icon-btn:disabled {
    color: var(--yt-muted);
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile Responsiveness */
  @media (max-width: 1024px) {
    .chat-container {
      width: calc(100% - 2rem) !important;
      height: 450px;
      position: relative;
      right: auto;
      top: auto;
      margin: 1.5rem auto;
      z-index: 10;
      transform: none !important;
    }

    .chat-container.closed {
      height: 60px;
      overflow: hidden;
    }

    .sidebar-toggle {
      display: flex;
      position: absolute;
      top: 10px;
      right: 10px;
    }

    .glass-panel {
      border: 1px solid var(--yt-border);
      border-radius: 12px;
      margin: 0;
    }
  }
</style>
