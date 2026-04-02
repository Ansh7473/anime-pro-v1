<script lang="ts">
    import { api } from "$lib/api";
    import { loginUser } from "$lib/stores/auth";
    import { goto } from "$app/navigation";

    let name = $state("");
    let email = $state("");
    let password = $state("");
    let error = $state("");
    let loading = $state(false);

    async function handleRegister() {
        loading = true;
        error = "";
        try {
            const res = await api.register({ name, email, password });
            // Auto-login if backend returns token
            if (res.token && res.user) {
                loginUser(res.user, res.token);
                goto("/");
            } else {
                goto("/auth/login");
            }
        } catch (e: any) {
            error = e.message || "Registration failed";
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Sign Up - Anime Pro</title>
</svelte:head>

<div class="login-container">
    <div class="login-box">
        <h1>Join the Pro</h1>
        <p class="subtitle">Create your account to start your journey</p>

        {#if error}
            <div class="error-msg">{error}</div>
        {/if}

        <form onsubmit={handleRegister}>
            <div class="form-group">
                <label for="name">Display Name</label>
                <input
                    type="text"
                    id="name"
                    bind:value={name}
                    placeholder="What should we call you?"
                    required
                />
            </div>

            <div class="form-group">
                <label for="email">Email</label>
                <input
                    type="email"
                    id="email"
                    bind:value={email}
                    placeholder="Enter your email"
                    required
                />
            </div>

            <div class="form-group">
                <label for="password">Password</label>
                <input
                    type="password"
                    id="password"
                    bind:value={password}
                    placeholder="Minimum 6 characters"
                    required
                    minlength="6"
                />
            </div>

            <button type="submit" disabled={loading}>
                {#if loading}
                    Creating Account...
                {:else}
                    Sign Up
                {/if}
            </button>
        </form>

        <div class="footer-links">
            <span>Already have an account?</span>
            <a href="/auth/login">Login</a>
        </div>
    </div>
</div>

<style>
    .login-container {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 80vh;
        padding: 2rem;
    }

    .login-box {
        width: 100%;
        max-width: 400px;
        background: rgba(255, 255, 255, 0.05);
        backdrop-filter: blur(10px);
        padding: 2.5rem;
        border-radius: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    }

    h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        text-align: center;
        background: linear-gradient(to right, #6366f1, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .subtitle {
        text-align: center;
        color: rgba(255, 255, 255, 0.6);
        margin-bottom: 2rem;
    }

    .form-group {
        margin-bottom: 1.5rem;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.8);
    }

    input {
        width: 100%;
        padding: 0.8rem 1rem;
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 0.8rem;
        color: white;
        transition: border-color 0.2s;
    }

    input:focus {
        outline: none;
        border-color: #6366f1;
    }

    button {
        width: 100%;
        padding: 1rem;
        background: linear-gradient(to right, #6366f1, #a855f7);
        border: none;
        border-radius: 0.8rem;
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition:
            transform 0.2s,
            opacity 0.2s;
    }

    button:hover {
        transform: translateY(-2px);
        opacity: 0.9;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .error-msg {
        background: rgba(ef4444, 0.1);
        color: #ef4444;
        padding: 0.8rem;
        border-radius: 0.8rem;
        margin-bottom: 1.5rem;
        text-align: center;
        font-size: 0.9rem;
        border: 1px solid rgba(ef4444, 0.2);
    }

    .footer-links {
        margin-top: 2rem;
        text-align: center;
        font-size: 0.9rem;
        color: rgba(255, 255, 255, 0.6);
    }

    .footer-links a {
        color: #a855f7;
        text-decoration: none;
        margin-left: 0.5rem;
        font-weight: 600;
    }

    .footer-links a:hover {
        text-decoration: underline;
    }

    @media (max-width: 768px) {
        .login-container {
            padding: 1.5rem;
            min-height: 75vh;
        }
        .login-box {
            padding: 2rem;
        }
        h1 {
            font-size: 1.8rem;
        }
        .subtitle {
            font-size: 0.9rem;
            margin-bottom: 1.75rem;
        }
        .form-group {
            margin-bottom: 1.25rem;
        }
        label {
            font-size: 0.85rem;
        }
        input {
            padding: 0.7rem 0.9rem;
        }
        button {
            padding: 0.9rem;
        }
        .footer-links {
            font-size: 0.85rem;
        }
    }

    @media (max-width: 480px) {
        .login-container {
            padding: 1rem;
            min-height: 70vh;
        }
        .login-box {
            padding: 1.5rem;
            border-radius: 1.25rem;
        }
        h1 {
            font-size: 1.5rem;
        }
        .subtitle {
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
        }
        .form-group {
            margin-bottom: 1rem;
        }
        label {
            font-size: 0.8rem;
            margin-bottom: 0.4rem;
        }
        input {
            padding: 0.65rem 0.85rem;
            border-radius: 0.7rem;
        }
        button {
            padding: 0.85rem;
            border-radius: 0.7rem;
            font-size: 0.9rem;
        }
        .error-msg {
            padding: 0.7rem;
            font-size: 0.85rem;
        }
        .footer-links {
            margin-top: 1.5rem;
            font-size: 0.8rem;
        }
    }

    @media (max-width: 360px) {
        .login-box {
            padding: 1.25rem;
        }
        h1 {
            font-size: 1.3rem;
        }
        .subtitle {
            font-size: 0.8rem;
        }
        input {
            padding: 0.6rem 0.75rem;
        }
        button {
            padding: 0.8rem;
            font-size: 0.85rem;
        }
    }
</style>
