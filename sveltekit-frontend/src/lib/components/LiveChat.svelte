<script lang="ts">
  import { auth } from "$lib/stores/auth";
  import { getProxiedImage, BACKEND_URL } from "$lib/api";
  import { onMount, onDestroy } from "svelte";
  import { Send, MessageSquare } from "lucide-svelte";
  import * as Ably from "ably";

  let { animeId, episode }: { animeId: string; episode: number } = $props();

  let ably: Ably.Realtime | null = null;
  let channel: any = null;
  let messages = $state<any[]>([]);
  let newMessage = $state("");
  let connected = $state(false);
  let feedRef: HTMLDivElement | null = $state(null);

  onMount(connect);
  onDestroy(() => ably?.close());

  async function connect() {
    ably = new Ably.Realtime({
      authUrl: `${BACKEND_URL}/api/v1/chat/token`,
      authHeaders: $auth.token ? { Authorization: `Bearer ${$auth.token}` } : {},
    });

    ably.connection.on("connected", () => {
      connected = true;
      channel = ably!.channels.get(`${animeId}-${episode}`);
      channel.subscribe("chat", (message: any) => {
        messages = [...messages, message.data].slice(-100);
        scrollToBottom();
      });
    });

    ably.connection.on("disconnected", () => (connected = false));
  }

  function sendMessage() {
    if (!channel || !newMessage.trim() || !connected || !$auth.token) return;
    channel.publish("chat", {
      type: "chat",
      userId: $auth.user?.id,
      userName: $auth.currentProfile?.name || "User",
      avatar: $auth.currentProfile?.avatar || "",
      content: newMessage.trim(),
      roomId: `${animeId}-${episode}`,
      timestamp: new Date().toISOString(),
    });
    newMessage = "";
  }

  function scrollToBottom() {
    if (feedRef) setTimeout(() => (feedRef!.scrollTop = feedRef!.scrollHeight), 50);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") sendMessage();
  }
</script>

<div class="chat">
  <div class="chat-status" class:online={connected}>
    <span class="dot"></span>
    {connected ? "Connected" : "Reconnecting…"}
  </div>

  <div class="chat-feed" bind:this={feedRef} role="log" aria-live="polite">
    {#if messages.length === 0}
      <div class="chat-empty">
        <MessageSquare size={30} aria-hidden="true" />
        <h3>Welcome to Live Chat</h3>
        <p>Be kind, guard your privacy, and follow the community guidelines.</p>
      </div>
    {/if}
    {#each messages as msg (msg.id || msg.timestamp)}
      <div class="msg">
        <img
          class="msg-avatar"
          alt=""
          src={getProxiedImage(msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.userName || "Guest"}`)}
        />
        <div class="msg-body">
          <span class="msg-author" class:is-me={msg.userId === $auth.user?.id}>{msg.userName}</span>
          <span class="msg-text">{msg.content}</span>
        </div>
      </div>
    {/each}
  </div>

  <div class="chat-input">
    {#if !$auth.token}
      <div class="chat-guest">
        <span>Sign in to join the conversation</span>
        <a href="/auth/login">Sign In</a>
      </div>
    {:else}
      <img
        class="input-avatar"
        alt=""
        src={getProxiedImage($auth.currentProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${$auth.currentProfile?.name || "User"}`)}
      />
      <input
        type="text"
        placeholder="Say something…"
        aria-label="Send a message"
        bind:value={newMessage}
        onkeydown={handleKeydown}
        maxlength="200"
      />
      <button class="send-btn" onclick={sendMessage} disabled={!newMessage.trim() || !connected} aria-label="Send">
        <Send size={16} aria-hidden="true" />
      </button>
    {/if}
  </div>
</div>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: var(--net-card-bg);
    color: var(--net-text);
  }

  .chat-status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--net-text-muted);
    border-bottom: 1px solid var(--net-border);
    flex-shrink: 0;
  }
  .chat-status .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--net-text-muted);
  }
  .chat-status.online { color: #4ade80; }
  .chat-status.online .dot { background: #4ade80; box-shadow: 0 0 8px #4ade80; }

  .chat-feed {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .chat-empty {
    margin: auto;
    text-align: center;
    color: var(--net-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 1.5rem 1rem;
  }
  .chat-empty h3 { font-size: 0.9rem; font-weight: 800; color: var(--net-text); margin: 0; }
  .chat-empty p { font-size: 0.75rem; margin: 0; line-height: 1.5; }

  .msg { display: flex; gap: 0.55rem; align-items: flex-start; }
  .msg-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
    background: var(--net-border);
  }
  .msg-body { min-width: 0; display: flex; flex-direction: column; }
  .msg-author {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--net-text-muted);
  }
  .msg-author.is-me { color: var(--net-red); }
  .msg-text {
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--net-text);
    word-break: break-word;
  }

  .chat-input {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.75rem;
    border-top: 1px solid var(--net-border);
  }
  .input-avatar {
    width: 30px; height: 30px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }
  .chat-input input {
    flex: 1;
    min-width: 0;
    background: var(--net-card-hover, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--net-border);
    border-radius: 999px;
    padding: 0.5rem 0.9rem;
    color: var(--net-text);
    font-size: 0.85rem;
    outline: none;
  }
  .chat-input input:focus { border-color: var(--net-red); }
  .send-btn {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 34px; height: 34px;
    border-radius: 50%;
    border: none;
    background: var(--net-red);
    color: #fff;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }

  .chat-guest {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: var(--net-text-muted);
  }
  .chat-guest a {
    font-weight: 800;
    color: var(--net-red);
    text-decoration: none;
    white-space: nowrap;
  }

  .chat { background: var(--editorial-surface, #0d0c0b); }
  .chat-status,.chat-input { border-color: var(--editorial-line, #28231f); }
  .chat-status.online { color: #9fbf9c; }
  .chat-status.online .dot { background: #9fbf9c; box-shadow: none; }
  .chat-feed { padding: 1rem; gap: .85rem; }
  .msg-avatar,.input-avatar { border-radius: 3px; }
  .chat-input input { border-radius: 3px; background: #151210; border-color: var(--editorial-line, #28231f); }
  .send-btn { border-radius: 3px; background: var(--editorial-accent, #df886b); color: #160b08; }
</style>
