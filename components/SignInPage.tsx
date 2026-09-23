'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Sparkles, CheckCircle2, Smartphone, MapPin, Send, Shield, ArrowRight, AlertCircle, Play } from 'lucide-react';

export function SignInPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-brand-600 via-sky-600 to-brand-700 min-h-screen text-white">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
        {/* Logo */}
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-5 shadow-xl shadow-black/10 ring-1 ring-white/30">
          <Sparkles className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          ClearView
        </h1>
        <p className="text-base font-medium text-white/80 mb-6 max-w-xs leading-snug">
          The simplest route tracker for window cleaners
        </p>

        {/* Configuration Notice if OAuth keys aren't set in Vercel yet */}
        {error && (
          <div className="w-full max-w-sm mb-6 p-4 rounded-2xl bg-amber-500/20 border border-amber-300/30 backdrop-blur-sm text-left text-xs leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Google OAuth Setup Needed</span>
            </div>
            <p className="text-white/90">
              To enable live Google Sign-In, add <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200">GOOGLE_CLIENT_ID</code> and <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200">GOOGLE_CLIENT_SECRET</code> to your Vercel Project Settings.
            </p>
            <a
              href="/?demo=true"
              className="inline-flex items-center gap-1.5 font-bold text-sky-200 hover:text-white underline underline-offset-2 pt-1"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Demo Mode right now →</span>
            </a>
          </div>
        )}

        {/* Feature List */}
        <div className="w-full max-w-sm space-y-2.5 mb-8 text-left">
          {[
            { icon: Send, text: '1-tap "On My Way" texts to customers' },
            { icon: CheckCircle2, text: 'Track who you\'ve cleaned and who\'s due next' },
            { icon: MapPin, text: '1-tap directions to every job' },
            { icon: Smartphone, text: 'Works like an app on your phone' },
            { icon: Shield, text: 'Your data stays in your own Google Drive' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-xs rounded-xl px-4 py-2.5 ring-1 ring-white/10">
              <Icon className="w-4 h-4 text-sky-200 shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-white/90">{text}</span>
            </div>
          ))}
        </div>

        {/* Sign In Button */}
        <button
          onClick={() => signIn('google')}
          className="w-full max-w-sm bg-white text-slate-900 font-bold text-sm sm:text-base py-3.5 px-6 rounded-2xl shadow-lg shadow-black/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all hover:bg-slate-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in with Google</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>

        <p className="mt-3.5 text-[11px] text-white/60 max-w-xs leading-relaxed">
          We&apos;ll create a Google Sheet in your Drive automatically to store your rounds.
        </p>
      </div>

      {/* Footer Links for Google Verification */}
      <div className="pb-8 text-center space-y-2">
        <div>
          <a
            href="/?demo=true"
            className="text-xs font-semibold text-white/70 hover:text-white underline underline-offset-4 transition-colors"
          >
            Or try the demo without signing in →
          </a>
        </div>
        <div className="flex items-center justify-center gap-3 text-[11px] text-white/50 pt-2">
          <a href="/privacy" className="hover:text-white/80 transition-colors">Privacy Policy</a>
          <span>•</span>
          <a href="/terms" className="hover:text-white/80 transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  );
}
