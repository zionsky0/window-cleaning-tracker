import React from 'react';
import Link from 'next/link';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 max-w-2xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to ClearView</span>
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Terms of Service</h1>
          <p className="text-xs text-slate-500">Last updated: September 2026</p>
        </div>
      </div>

      <div className="space-y-5 text-xs sm:text-sm leading-relaxed text-slate-600 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">1. Acceptance of Terms</h2>
          <p>
            By accessing or using ClearView, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the application.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">2. Service Description</h2>
          <p>
            ClearView provides a mobile-first dashboard for window cleaners to track jobs, customer schedules, and routes using Google Sheets as a backing store.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">3. Google Account & Permissions</h2>
          <p>
            To use live data synchronization, you must connect a Google Account. You are responsible for maintaining the confidentiality of your Google login credentials and for all activities that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">4. Disclaimer of Warranties</h2>
          <p>
            The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. We do not guarantee uninterrupted or error-free operation.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">5. Contact Information</h2>
          <p>
            For questions regarding these terms, please contact: <a href="mailto:jake.townsend05@gmail.com" className="text-brand-600 underline">jake.townsend05@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
