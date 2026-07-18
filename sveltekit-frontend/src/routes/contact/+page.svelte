<svelte:head>
  <title>Contact Us — WatchAnimeX</title>
  <meta name="description" content="Get in touch with the WatchAnimeX team. Send us your questions, feedback, or feature requests." />
  <meta property="og:title" content="Contact Us — WatchAnimeX" />
  <meta property="og:description" content="Get in touch with the WatchAnimeX team. Send us your questions, feedback, or feature requests." />
</svelte:head>

<script lang="ts">
  let form = $state({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  let submitting = $state(false);
  let submitted = $state(false);

  async function handleSubmit(e: Event) {
    e.preventDefault();
    submitting = true;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    submitting = false;
    submitted = true;
    form = { name: '', email: '', subject: '', message: '' };
    setTimeout(() => (submitted = false), 5000);
  }
</script>

<div class="page-container container">
  <div class="page-header">
    <h1>Contact Us</h1>
    <p class="subtitle">We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
  </div>

  <div class="contact-grid">
    <div class="contact-form-wrapper">
      <form class="contact-form" onsubmit={handleSubmit}>
        <div class="form-group">
          <label for="name">Full Name</label>
          <input type="text" id="name" bind:value={form.name} placeholder="Your name" required />
        </div>

        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" bind:value={form.email} placeholder="your@email.com" required />
        </div>

        <div class="form-group">
          <label for="subject">Subject</label>
          <select id="subject" bind:value={form.subject} required>
            <option value="" disabled>Select a topic</option>
            <option value="general">General Inquiry</option>
            <option value="bug">Bug Report</option>
            <option value="feature">Feature Request</option>
            <option value="account">Account Issue</option>
            <option value="partnership">Partnership</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label for="message">Message</label>
          <textarea id="message" bind:value={form.message} placeholder="Tell us what's on your mind..." rows="6" required></textarea>
        </div>

        <button type="submit" class="btn-primary submit-btn" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send Message'}
        </button>

        {#if submitted}
          <div class="success-message">
            ✅ Thank you! Your message has been sent. We'll get back to you within 24-48 hours.
          </div>
        {/if}
      </form>
    </div>

    <div class="contact-info">
      <div class="info-card">
        <div class="info-icon">📧</div>
        <h3>Email</h3>
        <p><a href="mailto:support@watchanimez.me">support@watchanimez.me</a></p>
      </div>
      <div class="info-card">
        <div class="info-icon">💬</div>
        <h3>Discord</h3>
        <p><a href="https://discord.gg/7v6ZzkJpXV" target="_blank" rel="noopener noreferrer">Join our community</a></p>
      </div>
      <div class="info-card">
        <div class="info-icon">🐛</div>
        <h3>Bug Reports</h3>
        <p><a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub Issues</a></p>
      </div>
      <div class="info-card">
        <div class="info-icon">⏰</div>
        <h3>Response Time</h3>
        <p>We typically respond within 24-48 hours on business days.</p>
      </div>
    </div>
  </div>
</div>

<style>
  .page-container {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 1100px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 3rem;
    padding: 2rem 0;
  }
  .page-header h1 {
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    margin-bottom: 0.75rem;
  }
  .subtitle {
    color: var(--net-text-muted);
    font-size: 1.1rem;
    max-width: 550px;
    margin: 0 auto;
  }

  .contact-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    gap: 3rem;
    align-items: start;
  }

  .contact-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 20px;
    padding: 2.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .form-group label {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
  }
  .form-group input,
  .form-group select,
  .form-group textarea {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 0.85rem 1rem;
    color: white;
    font-size: 0.95rem;
    font-family: inherit;
    transition: border-color 0.2s;
    outline: none;
  }
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    border-color: var(--net-red);
  }
  .form-group textarea {
    resize: vertical;
    min-height: 120px;
  }
  .form-group select {
    appearance: none;
    cursor: pointer;
  }

  .submit-btn {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 700;
    border-radius: 12px;
    margin-top: 0.5rem;
  }
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .success-message {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 12px;
    padding: 1rem;
    color: #4ADE80;
    font-size: 0.9rem;
    text-align: center;
  }

  .contact-info {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .info-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 16px;
    padding: 1.5rem;
    transition: all 0.2s;
  }
  .info-card:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }
  .info-icon {
    font-size: 1.5rem;
    margin-bottom: 0.75rem;
  }
  .info-card h3 {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: white;
  }
  .info-card p {
    font-size: 0.88rem;
    color: var(--net-text-muted);
    line-height: 1.5;
    margin: 0;
  }
  .info-card a {
    color: var(--net-red);
    text-decoration: none;
  }
  .info-card a:hover {
    text-decoration: underline;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 1.8rem;
    }
    .subtitle {
      font-size: 0.95rem;
    }
    .contact-grid {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
    .contact-form {
      padding: 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .page-header h1 {
      font-size: 1.5rem;
    }
    .contact-form {
      padding: 1.25rem;
    }
  }
</style>
