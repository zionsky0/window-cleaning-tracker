import type { Metadata, Viewport } from 'next';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClearView | Window Cleaning Tracker',
  description: 'Smart route and customer management for window cleaners — backed by your own Google Sheet',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ClearView',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0284c7',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-brand-100 selection:text-brand-900">
        <Providers>
          <div className="mx-auto max-w-lg min-h-screen flex flex-col shadow-sm bg-white border-x border-slate-200">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
