<svelte:head>
  <title>FAQ — WatchAnimez</title>
  <meta name="description" content="Frequently asked questions about WatchAnimez. Find answers about accounts, streaming, apps, privacy, and more." />
</svelte:head>

<script lang="ts">
  const faqs = [
    {
      category: 'General',
      q: 'What is WatchAnimez?',
      a: '<p>WatchAnimez is a premium anime streaming platform that helps fans discover, track, and watch anime series and movies. We aggregate data from multiple trusted sources to provide comprehensive information including episode counts, ratings, genres, schedules, and more.</p>'
    },
    {
      category: 'General',
      q: 'Is WatchAnimez free to use?',
      a: '<p>Yes! WatchAnimez is completely free to use. You can browse, search, and explore our entire anime catalog without any subscription or payment. Creating an account is also free and unlocks additional features like watchlists, favorites, and cross-device sync.</p>'
    },
    {
      category: 'General',
      q: 'What anime is available on WatchAnimez?',
      a: '<p>Our catalog includes thousands of anime titles spanning every genre and format — TV series, movies, OVAs, specials, and ONAs. From current seasonal releases to timeless classics, action shounen to slice-of-life dramas, we cover it all. New titles are added regularly.</p>'
    },
    {
      category: 'Account',
      q: 'How do I create an account?',
      a: '<p>Click the profile icon in the top-right corner and select "Sign Up." You can register using your email address. Once registered, you\'ll have access to personalized features like watchlists, favorites, viewing history, and cross-device synchronization.</p>'
    },
    {
      category: 'Account',
      q: 'Can I use multiple profiles on one account?',
      a: '<p>Yes! WatchAnimez supports multiple user profiles under a single account. Each profile maintains its own watchlist, favorites, viewing history, and preferences — perfect for families or friends sharing an account.</p>'
    },
    {
      category: 'Account',
      q: 'How do I reset my password?',
      a: '<p>If you\'ve forgotten your password, click "Login" and then select "Forgot Password." Enter your registered email address and we\'ll send you a password reset link. If you continue to have issues, please <a href="/contact">contact our support team</a>.</p>'
    },
    {
      category: 'Streaming',
      q: 'How does streaming work on WatchAnimez?',
      a: '<p>WatchAnimez provides direct links to streaming sources for each anime title. Simply search for an anime, select the episode you want to watch, and you\'ll be directed to the available streaming source. We aggregate from multiple sources to ensure availability.</p>'
    },
    {
      category: 'Streaming',
      q: 'Why isn\'t an episode available?',
      a: '<p>Episode availability depends on the streaming sources we aggregate from. Some episodes may be temporarily unavailable due to licensing restrictions, regional limitations, or source downtime. New episodes are typically available shortly after they air in Japan.</p>'
    },
    {
      category: 'Streaming',
      q: 'What video quality is available?',
      a: '<p>Video quality depends on the streaming source. Most sources offer multiple quality options ranging from 360p to 1080p. The player usually auto-selects the best quality based on your internet connection speed.</p>'
    },
    {
      category: 'Apps',
      q: 'Is there a mobile app?',
      a: '<p>Yes! We offer a native Android app available as an APK download from our <a href="/download">download page</a>. The app provides the full WatchAnimez experience optimized for mobile devices, with offline browsing support and push notifications for new episodes.</p>'
    },
    {
      category: 'Apps',
      q: 'Is there a desktop app?',
      a: '<p>Yes! We offer a Windows desktop application that provides a dedicated anime viewing experience with features like offline support, system tray notifications, and keyboard shortcuts. Download it from our <a href="/download">download page</a>.</p>'
    },
    {
      category: 'Apps',
      q: 'Do my watchlists sync across devices?',
      a: '<p>Absolutely! When you\'re logged into your WatchAnimez account, your watchlists, favorites, viewing history, and preferences are automatically synchronized across all your devices — web, mobile, and desktop.</p>'
    },
    {
      category: 'Privacy',
      q: 'What data does WatchAnimez collect?',
      a: '<p>We collect only the data necessary to provide our services: your email for authentication, your viewing preferences for recommendations, and basic usage analytics to improve the platform. We never sell your personal data to third parties. See our <a href="/privacy">Privacy Policy</a> for full details.</p>'
    },
    {
      category: 'Privacy',
      q: 'How is my data protected?',
      a: '<p>All data is transmitted over SSL-encrypted connections. Passwords are hashed and never stored in plain text. We use Firebase Authentication for secure identity management and follow industry best practices for data security.</p>'
    },
    {
      category: 'Privacy',
      q: 'Can I delete my account?',
      a: '<p>Yes, you can request account deletion at any time by <a href="/contact">contacting our support team</a>. Upon request, we will permanently delete all your personal data, including your profile, watchlists, favorites, and viewing history within 30 days.</p>'
    },
    {
      category: 'Technical',
      q: 'What browsers are supported?',
      a: '<p>WatchAnimez works on all modern browsers including Chrome, Firefox, Safari, Edge, and Brave. For the best experience, we recommend keeping your browser updated to the latest version.</p>'
    },
    {
      category: 'Technical',
      q: 'The site is loading slowly. What can I do?',
      a: '<p>WatchAnimez is optimized for speed, but performance can be affected by your internet connection, browser extensions (especially ad blockers), or temporary server load. Try clearing your browser cache, disabling extensions, or switching to a different browser. If the issue persists, please <a href="/contact">report it</a>.</p>'
    },
    {
      category: 'Technical',
      q: 'How do I report a bug?',
      a: '<p>You can report bugs through our <a href="/contact">contact page</a> by selecting "Bug Report" as the subject, or by opening an issue on our <a href="https://github.com" target="_blank" rel="noopener noreferrer">GitHub repository</a>. Please include as much detail as possible, including your browser/device, steps to reproduce, and any error messages.</p>'
    }
  ];

  const categories = ['General', 'Account', 'Streaming', 'Apps', 'Privacy', 'Technical'];
  let searchQuery = $state('');
  let activeCategory = $state('');
  let openItems = $state(new Set<string>());

  function toggle(q: string) {
    if (openItems.has(q)) {
      openItems.delete(q);
    } else {
      openItems.add(q);
    }
    openItems = new Set(openItems);
  }

  let filteredFaqs = $derived(
    faqs.filter((faq) => {
      const matchesCategory = !activeCategory || faq.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
  );
</script>

<div class="page-container container">
  <div class="page-header">
    <h1>Frequently Asked Questions</h1>
    <p class="subtitle">Find answers to the most common questions about WatchAnimez.</p>
  </div>

  <div class="faq-search">
    <input
      type="text"
      placeholder="Search questions..."
      bind:value={searchQuery}
      class="faq-search-input"
    />
  </div>

  <div class="faq-categories">
    {#each categories as cat}
      <button
        class="cat-btn"
        class:active={activeCategory === cat}
        onclick={() => (activeCategory = activeCategory === cat ? '' : cat)}
      >
        {cat}
      </button>
    {/each}
  </div>

  <div class="faq-list">
    {#each filteredFaqs as faq (faq.q)}
      <div class="faq-item" class:open={openItems.has(faq.q)}>
        <button class="faq-question" onclick={() => toggle(faq.q)}>
          <span>{faq.q}</span>
          <span class="faq-toggle">{openItems.has(faq.q) ? '−' : '+'}</span>
        </button>
        {#if openItems.has(faq.q)}
          <div class="faq-answer">
            {@html faq.a}
          </div>
        {/if}
      </div>
    {/each}

    {#if filteredFaqs.length === 0}
      <div class="no-results">
        <p>No questions match your search. Try different keywords or <a href="/contact">contact us</a> directly.</p>
      </div>
    {/if}
  </div>

  <div class="faq-cta">
    <h2>Still have questions?</h2>
    <p>Can't find what you're looking for? Our team is happy to help.</p>
    <a href="/contact" class="btn-primary">Contact Support</a>
  </div>
</div>

<style>
  .page-container {
    padding-top: 2rem;
    padding-bottom: 4rem;
    max-width: 860px;
  }

  .page-header {
    text-align: center;
    margin-bottom: 2.5rem;
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
    max-width: 500px;
    margin: 0 auto;
  }

  .faq-search {
    margin-bottom: 1.5rem;
  }
  .faq-search-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem 1.25rem;
    color: white;
    font-size: 1rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .faq-search-input:focus {
    border-color: var(--net-red);
  }
  .faq-search-input::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }

  .faq-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 2rem;
  }
  .cat-btn {
    padding: 0.5rem 1.25rem;
    border-radius: 50px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--net-text-muted);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: inherit;
  }
  .cat-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: white;
  }
  .cat-btn.active {
    background: var(--net-red);
    border-color: var(--net-red);
    color: white;
  }

  .faq-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .faq-item {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 14px;
    overflow: hidden;
    transition: all 0.2s;
  }
  .faq-item.open {
    border-color: rgba(229, 9, 20, 0.2);
    background: rgba(255, 255, 255, 0.04);
  }
  .faq-question {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    background: none;
    border: none;
    color: white;
    font-size: 1rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    gap: 1rem;
  }
  .faq-toggle {
    font-size: 1.5rem;
    color: var(--net-red);
    flex-shrink: 0;
    line-height: 1;
  }
  .faq-answer {
    padding: 0 1.5rem 1.5rem;
    color: var(--net-text-muted);
    font-size: 0.92rem;
    line-height: 1.75;
  }
  .faq-answer :global(a) {
    color: var(--net-red);
    text-decoration: none;
  }
  .faq-answer :global(a:hover) {
    text-decoration: underline;
  }
  .faq-answer :global(p) {
    margin: 0;
  }

  .no-results {
    text-align: center;
    padding: 3rem 1rem;
    color: var(--net-text-muted);
  }
  .no-results a {
    color: var(--net-red);
    text-decoration: none;
  }

  .faq-cta {
    text-align: center;
    margin-top: 4rem;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 3rem 2rem;
  }
  .faq-cta h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }
  .faq-cta p {
    color: var(--net-text-muted);
    margin-bottom: 1.5rem;
  }

  @media (max-width: 768px) {
    .page-header h1 {
      font-size: 1.8rem;
    }
    .subtitle {
      font-size: 0.95rem;
    }
    .faq-question {
      padding: 1rem 1.25rem;
      font-size: 0.92rem;
    }
    .faq-answer {
      padding: 0 1.25rem 1.25rem;
      font-size: 0.88rem;
    }
    .faq-cta {
      padding: 2rem 1.5rem;
    }
  }

  @media (max-width: 480px) {
    .page-header h1 {
      font-size: 1.5rem;
    }
    .faq-categories {
      gap: 0.4rem;
    }
    .cat-btn {
      padding: 0.4rem 0.9rem;
      font-size: 0.78rem;
    }
    .faq-question {
      padding: 0.9rem 1rem;
      font-size: 0.88rem;
    }
  }
</style>
