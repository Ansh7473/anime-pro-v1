'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      // In a real app, you would handle authentication here
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-black sm:bg-transparent selection:bg-[#e50914] selection:text-white">
      {/* Background Image (Desktop only) */}
      <div className="hidden sm:block absolute inset-0 z-0">
        <Image
          src="https://picsum.photos/seed/movies/1920/1080?blur=2"
          alt="Background"
          fill
          className="object-cover opacity-50"
          referrerPolicy="no-referrer"
          priority
        />
        <div className="absolute inset-0 bg-black/50 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 py-4 sm:px-12 sm:py-6 flex items-center justify-between">
        <div className="text-[#e50914] font-bold text-3xl sm:text-5xl tracking-tight">
          NETFLIX
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 sm:px-0 pb-16">
        <div className="w-full max-w-[450px] bg-black sm:bg-black/80 p-8 sm:p-16 rounded-md sm:shadow-2xl">
          <h1 className="text-white text-3xl font-bold mb-8">
            {isLogin ? 'Sign In' : 'Sign Up'}
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-md bg-[#333] px-4 pt-6 pb-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 peer"
                placeholder=" "
                required
              />
              <label
                htmlFor="email"
                className="absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 text-[#8c8c8c] transition-all duration-150 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 cursor-text"
              >
                Email or phone number
              </label>
            </div>

            <div className="relative">
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-md bg-[#333] px-4 pt-6 pb-2 text-white focus:outline-none focus:ring-2 focus:ring-white/20 peer"
                placeholder=" "
                required
              />
              <label
                htmlFor="password"
                className="absolute left-4 top-4 z-10 origin-[0] -translate-y-3 scale-75 text-[#8c8c8c] transition-all duration-150 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-focus:-translate-y-3 peer-focus:scale-75 cursor-text"
              >
                Password
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#e50914] hover:bg-[#c11119] text-white font-bold py-3.5 rounded-md mt-4 transition-colors disabled:opacity-70 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Sign In' : 'Sign Up'
              )}
            </button>

            <div className="flex items-center justify-between text-[#b3b3b3] text-sm mt-2">
              <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <input type="checkbox" className="w-4 h-4 accent-[#b3b3b3] bg-[#333] border-none rounded-sm cursor-pointer" />
                Remember me
              </label>
              <a href="#" className="hover:underline">
                Need help?
              </a>
            </div>
          </form>

          <div className="mt-16 text-[#b3b3b3]">
            <p className="text-base">
              {isLogin ? 'New to Netflix? ' : 'Already have an account? '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-white hover:underline font-medium"
              >
                {isLogin ? 'Sign up now.' : 'Sign in now.'}
              </button>
            </p>
            <p className="text-xs mt-4 leading-relaxed">
              This page is protected by Google reCAPTCHA to ensure you&apos;re not a bot.{' '}
              <a href="#" className="text-[#0071eb] hover:underline">
                Learn more.
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 bg-black/75 text-[#737373] py-8 px-4 sm:px-12 mt-auto border-t border-[#333] sm:border-none">
        <div className="max-w-5xl mx-auto">
          <p className="mb-6 hover:underline cursor-pointer">Questions? Contact us.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <a href="#" className="hover:underline">FAQ</a>
            <a href="#" className="hover:underline">Help Center</a>
            <a href="#" className="hover:underline">Terms of Use</a>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Cookie Preferences</a>
            <a href="#" className="hover:underline">Corporate Information</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
