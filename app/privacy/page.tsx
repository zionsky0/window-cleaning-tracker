import React from 'react';
import Link from 'next/link';
import { Sparkles, Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Privacy Policy</h1>
          <p className="text-xs text-slate-500">Last updated: September 2026</p>
        </div>
      </div>

      <div className="space-y-5 text-xs sm:text-sm leading-relaxed text-slate-600 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">1. Overview</h2>
          <p>
            ClearView (&quot;the App&quot;) is a route and customer management tool designed for independent window cleaners. We respect your privacy and are committed to protecting your personal data.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">2. Google User Data We Access</h2>
          <p>
            When you choose to sign in with your Google Account, the App requests limited access to your Google account:
          </p>
          <ul className="list-disc pl-5 mt-1.5 space-y-1">
            <li><strong>Basic Profile (name, email, profile photo):</strong> Used strictly to identify you and personalize your dashboard.</li>
            <li><strong>Google Drive & Sheets Access:</strong> Used solely to create, read, and update a specific spreadsheet named <em>&quot;ClearView - My Window Cleaning Rounds&quot;</em> in your personal Google Drive to store your customer names, addresses, and clean frequencies.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">3. How We Use and Store Your Data</h2>
          <p>
            <strong>Your data remains in your Google Drive:</strong> ClearView operates as a direct interface to your own Google Sheet. We do not sell, rent, or transfer your Google user data, customer records, or spreadsheets to third parties or advertising brokers.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">4. Google API Limited Use Disclosure</h2>
          <p>
            ClearView&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">5. Data Retention & Revoking Access</h2>
          <p>
            You can revoke ClearView&apos;s access to your Google Account at any time via your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 underline"
            >
              Google Account Permissions
            </a>
            . Because all customer data is stored in your personal Google Drive, deleting or disconnecting the app leaves your data safely in your Google account.
          </p>
        </section>

        <section>
          <h2 className="font-bold text-sm text-slate-900 mb-1.5">6. Contact Us</h2>
          <p>
            If you have questions regarding this Privacy Policy, please contact the developer at: <a href="mailto:jake.townsend05@gmail.com" className="text-brand-600 underline">jake.townsend05@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
