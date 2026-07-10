<script lang="ts">
  import { X, AlertCircle } from "lucide-svelte";

  let {
    error = "",
    processing = false,
    onClose,
    onSubmit,
  } = $props<{
    error?: string;
    processing?: boolean;
    onClose: () => void;
    onSubmit: (data: { current: string; new: string; confirm: string }) => void;
  }>();

  let current = $state("");
  let newPassword = $state("");
  let confirm = $state("");

  function submit() {
    onSubmit({ current, new: newPassword, confirm });
  }
</script>

<div
  class="modal-overlay"
  onclick={onClose}
  onkeydown={(e) => e.key === "Escape" && onClose()}
  role="dialog"
  aria-modal="true"
  aria-label="Change password"
  tabindex="-1"
>
  <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
  <div class="modal" onclick={(e) => e.stopPropagation()}>
    <div class="modal-header">
      <h3>Change Password</h3>
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
        <label for="pw-current">Current Password</label>
        <input id="pw-current" type="password" bind:value={current} required placeholder="Enter current password" />
      </div>
      <div class="form-group">
        <label for="pw-new">New Password</label>
        <input id="pw-new" type="password" bind:value={newPassword} required minlength={6} placeholder="At least 6 characters" />
      </div>
      <div class="form-group">
        <label for="pw-confirm">Confirm New Password</label>
        <input id="pw-confirm" type="password" bind:value={confirm} required placeholder="Re-enter new password" />
      </div>
      <div class="modal-actions">
        <button type="button" class="btn-outline" onclick={onClose}>Cancel</button>
        <button type="submit" class="btn-primary" disabled={processing}>
          {processing ? "Updating..." : "Update Password"}
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
    max-height: 90dvh;
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
  .form-group label {
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
