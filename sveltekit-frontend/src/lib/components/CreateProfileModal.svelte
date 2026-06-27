<script lang="ts">
  import { X, AlertCircle } from "lucide-svelte";

  let {
    error = "",
    processing = false,
    avatars = [],
    onClose,
    onSubmit,
  } = $props<{
    error?: string;
    processing?: boolean;
    avatars?: string[];
    onClose: () => void;
    onSubmit: (data: { name: string; avatar: string }) => void;
  }>();

  let name = $state("");
  let avatar = $state("");

  function submit() {
    onSubmit({ name, avatar });
  }
</script>

<div
  class="modal-overlay"
  onclick={onClose}
  onkeydown={(e) => e.key === "Escape" && onClose()}
  role="dialog"
  aria-modal="true"
  aria-label="Create new profile"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <h3>Create New Profile</h3>
      <button class="modal-close" onclick={onClose} aria-label="Close"><X size={18} /></button>
    </div>
    <form onsubmit={(e) => { e.preventDefault(); submit(); }} class="modal-body">
      {#if error}
        <div class="alert-error">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      {/if}
      <div class="form-group">
        <label for="cp-name">Profile Name</label>
        <input id="cp-name" type="text" bind:value={name} required maxlength={20} placeholder="Enter a name for this profile" />
      </div>
      <div class="form-group">
        <span class="field-label">Choose Avatar</span>
        <div class="avatar-grid">
          {#each avatars as av}
            <button
              type="button"
              class="avatar-option"
              class:selected={avatar === av}
              onclick={() => (avatar = av)}
              aria-label="Select avatar"
            >
              <img src={av} alt="" loading="lazy" decoding="async" />
            </button>
          {/each}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-outline" onclick={onClose}>Cancel</button>
        <button type="submit" class="btn-primary" disabled={processing || !name}>
          {processing ? "Creating..." : "Create Profile"}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 1rem;
  }
  .modal {
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    overflow-y: auto;
  }
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .modal-header h3 { font-size: 1.1rem; font-weight: 700; margin: 0; }
  .modal-close {
    background: none;
    border: none;
    color: var(--net-text-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 6px;
  }
  .modal-close:hover { background: rgba(255, 255, 255, 0.05); color: white; }
  .modal-body { padding: 1.5rem; }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  .form-group { margin-bottom: 1.25rem; }
  .form-group label,
  .form-group .field-label {
    display: block;
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--net-text-muted);
    margin-bottom: 0.4rem;
  }
  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    color: white;
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }
  .form-group input:focus { border-color: var(--net-red); }
  .form-group input::placeholder { color: rgba(255, 255, 255, 0.25); }
  .avatar-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.5rem;
  }
  .avatar-option {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    border: 2px solid transparent;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    background: rgba(255, 255, 255, 0.05);
  }
  .avatar-option img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-option:hover { border-color: rgba(255, 255, 255, 0.2); }
  .avatar-option.selected { border-color: var(--net-red); box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.3); }
  .alert-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.65rem 0.85rem;
    font-size: 0.82rem;
    margin-bottom: 1rem;
    border-radius: 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #f87171;
  }
  .btn-primary {
    padding: 0.7rem 1.5rem;
    background: var(--net-red);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.88rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.15); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-outline {
    padding: 0.6rem 1.25rem;
    background: none;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .btn-outline:hover { border-color: rgba(255, 255, 255, 0.3); background: rgba(255, 255, 255, 0.04); }
</style>
